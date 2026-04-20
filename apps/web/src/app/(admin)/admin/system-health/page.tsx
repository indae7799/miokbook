'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { getAdminToken } from '@/lib/auth-token';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ServerCrash, Settings2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StoredSystemHealthState, SystemHealthCheckItem, SystemHealthReport } from '@/lib/system-health';

async function fetchSystemHealth(token: string): Promise<StoredSystemHealthState> {
  const response = await fetch('/api/admin/system-health', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || response.statusText);
  }
  return response.json();
}

async function runSystemHealth(token: string): Promise<StoredSystemHealthState> {
  const response = await fetch('/api/admin/system-health', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || response.statusText);
  }
  return response.json();
}

function statusMeta(status: SystemHealthCheckItem['status'] | SystemHealthReport['overallStatus']) {
  if (status === 'healthy') return { label: '정상', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
  if (status === 'warning') return { label: '주의', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle };
  return { label: '장애', className: 'bg-rose-50 text-rose-700 border-rose-200', icon: ServerCrash };
}

function ownerLabel(owner: SystemHealthCheckItem['owner']) {
  if (owner === 'infra') return '외부 인프라';
  if (owner === 'config') return '설정';
  return '앱/데이터';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR');
}

function CheckCard({ item }: { item: SystemHealthCheckItem }) {
  const meta = statusMeta(item.status);
  const Icon = meta.icon;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
              <Icon className="mr-1 size-3.5" />
              {meta.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-700">{item.summary}</p>
          {item.details ? <p className="mt-2 text-xs text-gray-400">{item.details}</p> : null}
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">{ownerLabel(item.owner)}</span>
      </div>
      <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
        해야 할 일: {item.action}
      </div>
    </div>
  );
}

export default function AdminSystemHealthPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.admin.systemHealth(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      return fetchSystemHealth(token);
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      return runSystemHealth(token);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.admin.systemHealth(), data);
      toast.success('장애 진단을 다시 실행했습니다.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '진단 실행에 실패했습니다.');
    },
  });

  const latest = query.data?.latestReport ?? null;
  const history = query.data?.history ?? [];
  const latestMeta = statusMeta(latest?.overallStatus ?? 'warning');
  const LatestIcon = latestMeta.icon;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">시스템 진단</h1>
          <p className="mt-1 text-sm text-gray-400">
            코드 문제가 아닌 외부 인프라, 환경변수, 데이터 접근 문제를 구분해서 보여줍니다.
          </p>
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="rounded-xl bg-green-700 text-white hover:bg-green-800"
        >
          <RefreshCw className={`mr-2 size-4 ${mutation.isPending ? 'animate-spin' : ''}`} />
          지금 다시 점검
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <LatestIcon className="size-5 text-gray-700" />
            <h2 className="text-base font-semibold text-gray-900">최신 상태</h2>
            {latest ? (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${latestMeta.className}`}>
                {latestMeta.label}
              </span>
            ) : null}
          </div>
          <p className="mt-4 text-sm text-gray-700">
            {latest?.summary ?? '아직 저장된 진단 결과가 없습니다. "지금 다시 점검"을 한 번 실행하면 이후부터 관리자에서 바로 확인할 수 있습니다.'}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold text-gray-400">마지막 실행</p>
              <p className="mt-1 text-sm text-gray-700">{formatDateTime(latest?.ranAt)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold text-gray-400">실행 방식</p>
              <p className="mt-1 text-sm text-gray-700">
                {latest?.trigger === 'cron' ? '월요일 자동 점검' : latest?.trigger === 'manual' ? '관리자 수동 점검' : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock3 className="size-5 text-gray-700" />
            <h2 className="text-base font-semibold text-gray-900">운영 안내</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            <li className="flex gap-2">
              <Settings2 className="mt-0.5 size-4 shrink-0 text-gray-400" />
              `설정`은 환경변수 누락, 버킷명 오타처럼 배포 설정에서 고칠 문제입니다.
            </li>
            <li className="flex gap-2">
              <ServerCrash className="mt-0.5 size-4 shrink-0 text-gray-400" />
              `외부 인프라`는 Supabase pause, DNS, 결제/프로젝트 상태 같은 문제입니다.
            </li>
            <li className="flex gap-2">
              <Wrench className="mt-0.5 size-4 shrink-0 text-gray-400" />
              `앱/데이터`는 CMS 미저장, 활성 도서 0건처럼 관리자 데이터 자체를 먼저 봐야 하는 문제입니다.
            </li>
          </ul>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">현재 점검 항목</h2>
        {query.isLoading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-400">진단 결과를 불러오는 중입니다.</div>
        ) : query.error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-700">
            {query.error instanceof Error ? query.error.message : '진단 결과를 불러오지 못했습니다.'}
          </div>
        ) : latest?.checks?.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {latest.checks.map((item) => <CheckCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-400">
            아직 저장된 점검 항목이 없습니다.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">최근 실행 이력</h2>
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="grid grid-cols-[160px_120px_1fr] gap-3 border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <span>실행 시각</span>
            <span>상태</span>
            <span>요약</span>
          </div>
          {history.map((report) => {
            const meta = statusMeta(report.overallStatus);
            return (
              <div key={report.id} className="grid grid-cols-[160px_120px_1fr] gap-3 border-b border-gray-50 px-5 py-3 text-sm last:border-b-0">
                <span className="text-gray-500">{formatDateTime(report.ranAt)}</span>
                <span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
                    {meta.label}
                  </span>
                </span>
                <span className="text-gray-700">{report.summary}</span>
              </div>
            );
          })}
          {history.length === 0 ? (
            <div className="px-5 py-6 text-sm text-gray-400">아직 이력이 없습니다.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
