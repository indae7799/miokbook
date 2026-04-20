import { NextResponse } from 'next/server';
import { runSystemHealthCheck, saveSystemHealthReport } from '@/lib/system-health';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const report = await runSystemHealthCheck('cron');
    await saveSystemHealthReport(report);

    return NextResponse.json({
      ok: true,
      overallStatus: report.overallStatus,
      summary: report.summary,
      ranAt: report.ranAt,
    });
  } catch (error) {
    console.error('[cron/system-health]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
