import type { Env } from './types.ts';
import { chicagoDay, configured, intakeEnabled } from './env.ts';

export type TokenStatus = 'not_connected' | 'valid' | 'expired_will_refresh' | 'refresh_failed';

export interface HealthReport {
  ok: true;
  intake_enabled: boolean;
  configured: ReturnType<typeof configured>;
  jobber: { connected: boolean; account_name: string | null; token_status: TokenStatus };
  today_count: number;
}

/**
 * Read-only: never creates tables, so a fresh D1 (or none at all) reports
 * "not connected" instead of failing.
 */
export async function healthReport(env: Env, now: number): Promise<HealthReport> {
  const report: HealthReport = {
    ok: true,
    intake_enabled: intakeEnabled(env),
    configured: configured(env),
    jobber: { connected: false, account_name: null, token_status: 'not_connected' },
    today_count: 0,
  };
  const db = env.EYS_AI_DB;
  if (!db) return report;

  try {
    const row = await db
      .prepare('SELECT account_name, access_expires_at, token_status FROM jobber_tokens WHERE id = 1')
      .first<{ account_name: string | null; access_expires_at: number; token_status: string }>();
    if (row) {
      const failed = row.token_status === 'refresh_failed';
      report.jobber = {
        connected: !failed,
        account_name: row.account_name,
        token_status: failed
          ? 'refresh_failed'
          : row.access_expires_at > now
            ? 'valid'
            : 'expired_will_refresh',
      };
    }
  } catch {
    // Table not created yet: nothing has connected.
  }

  try {
    const row = await db
      .prepare('SELECT count FROM rate_counters WHERE key = ?1')
      .bind(`global:${chicagoDay(now)}`)
      .first<{ count: number }>();
    report.today_count = row?.count ?? 0;
  } catch {
    // No submissions recorded yet.
  }

  return report;
}
