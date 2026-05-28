import { API_BASE_URL, API_KEY, API_TIMEOUT_MS } from '../config/api';
import {
  getUnsyncedSessions,
  getUnsyncedDailyStats,
  markSessionsSynced,
  markDailyStatsSynced,
} from './analyticsService';
import {
  getOrCreateDeviceId,
  getPlatform,
  getAppVersion,
} from './deviceService';
import { getDatabase } from './databaseService';
import type { Session, DailyStats } from '../types';

// ─── Public: sync status for Settings screen ─────────────────────────────────

export type SyncStatus = {
  pendingCount: number;
  lastSyncedAt: number | null;
};

/** Counts unsynced rows and finds the most recent `synced_at` timestamp. */
export async function getSyncStatus(): Promise<SyncStatus> {
  const [sessions, daily] = await Promise.all([
    getUnsyncedSessions(),
    getUnsyncedDailyStats(),
  ]);
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ ts: number | null }>(`
    SELECT MAX(t) AS ts FROM (
      SELECT MAX(synced_at) AS t FROM sessions WHERE synced_at IS NOT NULL
      UNION ALL
      SELECT MAX(synced_at) AS t FROM daily_stats WHERE synced_at IS NOT NULL
    )
  `);
  return {
    pendingCount: sessions.length + daily.length,
    lastSyncedAt: row?.ts ?? null,
  };
}

// ─── Low-level HTTP helper ──────────────────────────────────────────────────

async function apiPost<TBody extends object>(
  path: string,
  body: TBody,
): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    // 409 = already synced (idempotency conflict on /sessions). Treat as success.
    if (!res.ok && res.status !== 409) {
      const text = await res.text().catch(() => '');
      throw new Error(`POST ${path} → ${res.status}: ${text}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Registers this device with the backend. Safe to call on every app launch —
 * the server upserts and refreshes lastSeenAt.
 */
export async function registerDevice(): Promise<void> {
  try {
    const deviceId = await getOrCreateDeviceId();
    await apiPost('/v1/devices', {
      deviceId,
      platform:   getPlatform(),
      appVersion: getAppVersion(),
    });
  } catch (err) {
    console.warn('[sync] registerDevice failed:', (err as Error).message);
  }
}

/**
 * Pushes all unsynced sessions + daily stats to the server.
 * Fails silently — unsynced rows stay flagged and retry next time.
 *
 * Call this after a session completes.
 */
export async function syncAll(): Promise<{
  syncedSessions: number;
  syncedDailyStats: number;
}> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const [sessions, dailyStats] = await Promise.all([
      getUnsyncedSessions(),
      getUnsyncedDailyStats(),
    ]);

    const syncedSessionIds = await pushSessions(deviceId, sessions);
    const syncedDates      = await pushDailyStats(deviceId, dailyStats);

    if (syncedSessionIds.length) await markSessionsSynced(syncedSessionIds);
    if (syncedDates.length)      await markDailyStatsSynced(syncedDates);

    return {
      syncedSessions:   syncedSessionIds.length,
      syncedDailyStats: syncedDates.length,
    };
  } catch (err) {
    console.warn('[sync] syncAll failed:', (err as Error).message);
    return { syncedSessions: 0, syncedDailyStats: 0 };
  }
}

// ─── Internal: per-row push (collects only successful IDs) ─────────────────

async function pushSessions(deviceId: string, rows: Session[]): Promise<string[]> {
  const ok: string[] = [];

  for (const s of rows) {
    try {
      await apiPost('/v1/sessions', {
        deviceId,
        localSessionId: s.id,
        startedAt: new Date(s.startedAt).toISOString(),
        endedAt:   new Date(s.completedAt ?? s.startedAt).toISOString(),
        totalPhotos:  s.totalPhotos,
        keptCount:    s.keptCount,
        deletedCount: s.deletedCount,
        skippedCount: 0,
        freedMB:      bytesToMB(s.storageSavedBytes),
      });
      ok.push(s.id);
    } catch (err) {
      console.warn(`[sync] session ${s.id} failed:`, (err as Error).message);
      // skip this one — try the rest, retry next session
    }
  }

  return ok;
}

async function pushDailyStats(deviceId: string, rows: DailyStats[]): Promise<string[]> {
  const ok: string[] = [];

  for (const d of rows) {
    try {
      await apiPost('/v1/daily-stats', {
        deviceId,
        date:         d.date,
        keptCount:    d.kept,
        deletedCount: d.deleted,
        freedMB:      bytesToMB(d.storageSavedBytes),
        sessionCount: 0, // not tracked locally — computed server-side if needed
      });
      ok.push(d.date);
    } catch (err) {
      console.warn(`[sync] daily-stats ${d.date} failed:`, (err as Error).message);
    }
  }

  return ok;
}

function bytesToMB(bytes: number): number {
  return Math.round((bytes / 1_000_000) * 100) / 100; // 2-decimal MB
}