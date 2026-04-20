import { supabaseAdmin } from '@/lib/supabase/admin';

export const SYSTEM_HEALTH_SETTINGS_KEY = 'system_health';
const HISTORY_LIMIT = 12;

export type SystemHealthStatus = 'healthy' | 'warning' | 'critical';
export type SystemHealthOwner = 'infra' | 'config' | 'app';

export interface SystemHealthCheckItem {
  id: string;
  title: string;
  status: SystemHealthStatus;
  owner: SystemHealthOwner;
  summary: string;
  details?: string;
  action: string;
}

export interface SystemHealthReport {
  id: string;
  ranAt: string;
  trigger: 'manual' | 'cron';
  overallStatus: SystemHealthStatus;
  summary: string;
  checks: SystemHealthCheckItem[];
}

export interface StoredSystemHealthState {
  latestReport: SystemHealthReport | null;
  history: SystemHealthReport[];
  updatedAt: string | null;
}

function randomId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function asStoredState(value: unknown): StoredSystemHealthState {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    latestReport: raw.latestReport && typeof raw.latestReport === 'object'
      ? raw.latestReport as SystemHealthReport
      : null,
    history: Array.isArray(raw.history)
      ? raw.history.filter((item): item is SystemHealthReport => Boolean(item && typeof item === 'object'))
      : [],
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  };
}

function computeOverallStatus(checks: SystemHealthCheckItem[]): SystemHealthStatus {
  if (checks.some((item) => item.status === 'critical')) return 'critical';
  if (checks.some((item) => item.status === 'warning')) return 'warning';
  return 'healthy';
}

function buildSummary(status: SystemHealthStatus, checks: SystemHealthCheckItem[]): string {
  const criticalCount = checks.filter((item) => item.status === 'critical').length;
  const warningCount = checks.filter((item) => item.status === 'warning').length;

  if (status === 'critical') {
    return `치명 ${criticalCount}건, 경고 ${warningCount}건입니다. 외부 인프라 또는 필수 설정부터 확인해야 합니다.`;
  }
  if (status === 'warning') {
    return `치명 이슈는 없지만 경고 ${warningCount}건이 있습니다. 운영 전 정리하는 편이 좋습니다.`;
  }
  return '주요 의존성, 설정, 데이터 접근 상태가 정상입니다.';
}

async function probeUrl(url: string): Promise<{ ok: boolean; detail: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      cache: 'no-store',
    });
    return { ok: true, detail: `HTTP ${response.status}` };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getStoredSystemHealthState(): Promise<StoredSystemHealthState> {
  if (!supabaseAdmin) {
    return { latestReport: null, history: [], updatedAt: null };
  }

  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', SYSTEM_HEALTH_SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    console.error('[system-health] failed to load stored state', error);
    return { latestReport: null, history: [], updatedAt: null };
  }

  return asStoredState(data?.value);
}

export async function saveSystemHealthReport(report: SystemHealthReport): Promise<StoredSystemHealthState> {
  if (!supabaseAdmin) {
    return {
      latestReport: report,
      history: [report],
      updatedAt: report.ranAt,
    };
  }

  const current = await getStoredSystemHealthState();
  const next: StoredSystemHealthState = {
    latestReport: report,
    history: [report, ...current.history].slice(0, HISTORY_LIMIT),
    updatedAt: report.ranAt,
  };

  const { error } = await supabaseAdmin
    .from('settings')
    .upsert(
      {
        key: SYSTEM_HEALTH_SETTINGS_KEY,
        value: next,
        updated_at: report.ranAt,
      },
      { onConflict: 'key' },
    );

  if (error) {
    console.error('[system-health] failed to save report', error);
  }

  return next;
}

export async function runSystemHealthCheck(trigger: 'manual' | 'cron'): Promise<SystemHealthReport> {
  const checks: SystemHealthCheckItem[] = [];

  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  const storageBucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || '';
  const cronSecret = process.env.CRON_SECRET?.trim() || '';

  checks.push({
    id: 'env',
    title: '필수 환경변수',
    status: supabaseUrl && serviceRoleKey && storageBucket ? 'healthy' : 'critical',
    owner: 'config',
    summary: supabaseUrl && serviceRoleKey && storageBucket
      ? 'Supabase URL, service role key, storage bucket이 모두 설정되어 있습니다.'
      : '필수 환경변수 일부가 비어 있습니다.',
    details: `SUPABASE_URL=${Boolean(supabaseUrl)}, SERVICE_ROLE=${Boolean(serviceRoleKey)}, STORAGE_BUCKET=${Boolean(storageBucket)}, CRON_SECRET=${Boolean(cronSecret)}`,
    action: supabaseUrl && serviceRoleKey && storageBucket
      ? '조치 불필요'
      : '.env와 배포 환경 변수에서 빠진 값을 채워야 합니다.',
  });

  if (supabaseUrl) {
    const probe = await probeUrl(supabaseUrl);
    checks.push({
      id: 'supabase-host',
      title: 'Supabase 프로젝트 URL 접근',
      status: probe.ok ? 'healthy' : 'critical',
      owner: 'infra',
      summary: probe.ok
        ? '프로젝트 URL 호스트에 접근 가능합니다.'
        : '프로젝트 URL 호스트에 접근할 수 없습니다.',
      details: probe.detail,
      action: probe.ok
        ? '조치 불필요'
        : 'Supabase 프로젝트 상태, DNS, pause 여부, 결제 플랜을 확인해야 합니다.',
    });
  }

  try {
    const { error, count } = await supabaseAdmin
      .from('books')
      .select('isbn', { count: 'exact', head: true })
      .eq('is_active', true);

    checks.push({
      id: 'books-db',
      title: '도서 DB 조회',
      status: error ? 'critical' : (count ?? 0) > 0 ? 'healthy' : 'warning',
      owner: error ? 'infra' : 'app',
      summary: error
        ? 'books 테이블 조회에 실패했습니다.'
        : `활성 도서 ${count ?? 0}권이 조회됩니다.`,
      details: error?.message ?? undefined,
      action: error
        ? 'Supabase DB 연결 또는 스키마를 확인해야 합니다.'
        : (count ?? 0) > 0
          ? '조치 불필요'
          : '활성 도서 데이터가 비어 있는지 점검해야 합니다.',
    });
  } catch (error) {
    checks.push({
      id: 'books-db',
      title: '도서 DB 조회',
      status: 'critical',
      owner: 'infra',
      summary: 'books 테이블 조회 중 예외가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error),
      action: 'Supabase DB 접근 상태를 확인해야 합니다.',
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('cms')
      .select('key')
      .eq('key', 'home')
      .maybeSingle();

    checks.push({
      id: 'cms-home',
      title: '홈 CMS 문서',
      status: error ? 'critical' : data ? 'healthy' : 'warning',
      owner: error ? 'infra' : 'app',
      summary: error
        ? 'CMS home 문서 조회에 실패했습니다.'
        : data
          ? 'CMS home 문서가 존재합니다.'
          : 'CMS home 문서가 없습니다.',
      details: error?.message ?? undefined,
      action: error
        ? 'Supabase DB 또는 권한 설정을 확인해야 합니다.'
        : data
          ? '조치 불필요'
          : '관리자 CMS에서 홈 데이터를 저장해야 합니다.',
    });
  } catch (error) {
    checks.push({
      id: 'cms-home',
      title: '홈 CMS 문서',
      status: 'critical',
      owner: 'infra',
      summary: 'CMS home 문서 조회 중 예외가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error),
      action: 'Supabase DB 접근 상태를 확인해야 합니다.',
    });
  }

  if (storageBucket) {
    try {
      const { data, error } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = (data ?? []).some((bucket) => bucket.name === storageBucket);

      checks.push({
        id: 'storage',
        title: 'Supabase Storage 버킷',
        status: error ? 'critical' : bucketExists ? 'healthy' : 'warning',
        owner: error ? 'infra' : 'config',
        summary: error
          ? 'Storage 버킷 목록 조회에 실패했습니다.'
          : bucketExists
            ? `버킷 '${storageBucket}' 이 존재합니다.`
            : `버킷 '${storageBucket}' 을 찾지 못했습니다.`,
        details: error?.message ?? undefined,
        action: error
          ? 'Storage 서비스 상태와 service role 권한을 확인해야 합니다.'
          : bucketExists
            ? '조치 불필요'
            : '환경변수 버킷명 또는 실제 버킷 생성을 확인해야 합니다.',
      });
    } catch (error) {
      checks.push({
        id: 'storage',
        title: 'Supabase Storage 버킷',
        status: 'critical',
        owner: 'infra',
        summary: 'Storage 버킷 확인 중 예외가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
        action: 'Storage 서비스 상태를 확인해야 합니다.',
      });
    }
  }

  const overallStatus = computeOverallStatus(checks);
  return {
    id: randomId(),
    ranAt: new Date().toISOString(),
    trigger,
    overallStatus,
    summary: buildSummary(overallStatus, checks),
    checks,
  };
}
