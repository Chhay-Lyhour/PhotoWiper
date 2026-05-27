import { getDatabase } from './databaseService';
import type { DailyStatsRow, SessionRow } from './databaseService';
import type { DailyStats, Session, SessionStatus } from '../types';

function rowToDaily(r: DailyStatsRow): DailyStats {
  return {
    date: r.date,
    reviewed: r.reviewed,
    deleted: r.deleted,
    kept: r.kept,
    storageSavedBytes: r.storage_saved_bytes,
  };
}

function rowToSession(r: SessionRow): Session {
  return {
    id: r.id,
    startedAt: r.started_at,
    completedAt: r.completed_at ?? undefined,
    status: r.status as SessionStatus,
    totalPhotos: r.total_photos,
    keptCount: r.kept_count,
    deletedCount: r.deleted_count,
    storageSavedBytes: r.storage_saved_bytes,
  };
}

export type LifetimeTotals = {
  totalReviewed: number;
  totalDeleted: number;
  totalKept: number;
  totalSavedBytes: number;
  sessionCount: number;
};

export async function getLifetimeTotals(): Promise<LifetimeTotals> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    reviewed: number | null;
    deleted: number | null;
    kept: number | null;
    saved: number | null;
    sessions: number | null;
  }>(
    `SELECT
       COALESCE(SUM(kept_count + deleted_count), 0) AS reviewed,
       COALESCE(SUM(deleted_count), 0) AS deleted,
       COALESCE(SUM(kept_count), 0) AS kept,
       COALESCE(SUM(storage_saved_bytes), 0) AS saved,
       COUNT(*) AS sessions
     FROM sessions
     WHERE status IN ('completed', 'active', 'paused')`,
  );
  return {
    totalReviewed: row?.reviewed ?? 0,
    totalDeleted: row?.deleted ?? 0,
    totalKept: row?.kept ?? 0,
    totalSavedBytes: row?.saved ?? 0,
    sessionCount: row?.sessions ?? 0,
  };
}

export async function getDailyStats(days: number = 7): Promise<DailyStats[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DailyStatsRow>(
    `SELECT * FROM daily_stats ORDER BY date DESC LIMIT ?`,
    days,
  );
  return rows.map(rowToDaily).reverse();
}

export async function getWeeklyStats(): Promise<DailyStats[]> {
  return getDailyStats(7);
}

export async function getSessionHistory(limit: number = 20): Promise<Session[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT * FROM sessions
     WHERE status = 'completed'
     ORDER BY completed_at DESC
     LIMIT ?`,
    limit,
  );
  return rows.map(rowToSession);
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SessionRow>(
    `SELECT * FROM sessions WHERE id = ?`,
    sessionId,
  );
  return row ? rowToSession(row) : null;
}

export async function getUnsyncedSessions(): Promise<Session[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT * FROM sessions WHERE synced_at IS NULL AND status = 'completed' ORDER BY completed_at`,
  );
  return rows.map(rowToSession);
}

export async function getUnsyncedDailyStats(): Promise<DailyStats[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DailyStatsRow>(
    `SELECT * FROM daily_stats WHERE synced_at IS NULL ORDER BY date`,
  );
  return rows.map(rowToDaily);
}

export async function markSessionsSynced(sessionIds: string[], syncedAt: number = Date.now()): Promise<void> {
  if (!sessionIds.length) return;
  const db = await getDatabase();
  const placeholders = sessionIds.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE sessions SET synced_at = ? WHERE id IN (${placeholders})`,
    syncedAt,
    ...sessionIds,
  );
}

export async function markDailyStatsSynced(dates: string[], syncedAt: number = Date.now()): Promise<void> {
  if (!dates.length) return;
  const db = await getDatabase();
  const placeholders = dates.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE daily_stats SET synced_at = ? WHERE date IN (${placeholders})`,
    syncedAt,
    ...dates,
  );
}
