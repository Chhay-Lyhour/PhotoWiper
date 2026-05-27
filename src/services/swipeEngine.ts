import { getDatabase, withTransaction } from './databaseService';
import type { SessionRow, SwipeRecordRow } from './databaseService';
import type { SwipeDecision, SwipeRecord, SessionStats } from '../types';

function toSwipeRecord(r: SwipeRecordRow, uri: string, filename: string): SwipeRecord {
  return {
    photoId: r.photo_id,
    uri,
    filename,
    fileSize: r.file_size ?? undefined,
    decision: r.decision,
    timestamp: r.timestamp,
  };
}

function todayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function commitSwipe(
  sessionId: string,
  photoId: string,
  decision: SwipeDecision,
  fileSize?: number,
): Promise<void> {
  const ts = Date.now();
  const sizeDelta = decision === 'delete' ? (fileSize ?? 0) : 0;
  const date = todayKey(ts);

  await withTransaction(async (db) => {
    await db.runAsync(
      `INSERT INTO swipe_records (session_id, photo_id, decision, file_size, timestamp) VALUES (?, ?, ?, ?, ?)`,
      sessionId,
      photoId,
      decision,
      fileSize ?? null,
      ts,
    );

    await db.runAsync(
      `UPDATE session_queue SET status = 'reviewed' WHERE session_id = ? AND photo_id = ?`,
      sessionId,
      photoId,
    );

    await db.runAsync(
      `UPDATE sessions SET
         kept_count = kept_count + CASE WHEN ? = 'keep' THEN 1 ELSE 0 END,
         deleted_count = deleted_count + CASE WHEN ? = 'delete' THEN 1 ELSE 0 END,
         storage_saved_bytes = storage_saved_bytes + ?
       WHERE id = ?`,
      decision,
      decision,
      sizeDelta,
      sessionId,
    );

    await db.runAsync(
      `INSERT INTO daily_stats (date, reviewed, deleted, kept, storage_saved_bytes, synced_at)
       VALUES (?, 1, ?, ?, ?, NULL)
       ON CONFLICT(date) DO UPDATE SET
         reviewed = reviewed + 1,
         deleted = deleted + CASE WHEN ? = 'delete' THEN 1 ELSE 0 END,
         kept = kept + CASE WHEN ? = 'keep' THEN 1 ELSE 0 END,
         storage_saved_bytes = storage_saved_bytes + ?,
         synced_at = NULL`,
      date,
      decision === 'delete' ? 1 : 0,
      decision === 'keep' ? 1 : 0,
      sizeDelta,
      decision,
      decision,
      sizeDelta,
    );
  });
}

export async function undoLastSwipe(sessionId: string): Promise<SwipeRecord | null> {
  const db = await getDatabase();
  const last = await db.getFirstAsync<SwipeRecordRow & { uri: string; filename: string | null }>(
    `SELECT s.*, p.uri AS uri, p.filename AS filename
     FROM swipe_records s
     JOIN photos p ON p.id = s.photo_id
     WHERE s.session_id = ?
     ORDER BY s.id DESC
     LIMIT 1`,
    sessionId,
  );
  if (!last) return null;

  const sizeDelta = last.decision === 'delete' ? (last.file_size ?? 0) : 0;
  const date = todayKey(last.timestamp);

  await withTransaction(async (tx) => {
    await tx.runAsync(`DELETE FROM swipe_records WHERE id = ?`, last.id);

    await tx.runAsync(
      `UPDATE session_queue SET status = 'pending' WHERE session_id = ? AND photo_id = ?`,
      sessionId,
      last.photo_id,
    );

    await tx.runAsync(
      `UPDATE sessions SET
         kept_count = kept_count - CASE WHEN ? = 'keep' THEN 1 ELSE 0 END,
         deleted_count = deleted_count - CASE WHEN ? = 'delete' THEN 1 ELSE 0 END,
         storage_saved_bytes = storage_saved_bytes - ?
       WHERE id = ?`,
      last.decision,
      last.decision,
      sizeDelta,
      sessionId,
    );

    await tx.runAsync(
      `UPDATE daily_stats SET
         reviewed = MAX(reviewed - 1, 0),
         deleted = MAX(deleted - CASE WHEN ? = 'delete' THEN 1 ELSE 0 END, 0),
         kept = MAX(kept - CASE WHEN ? = 'keep' THEN 1 ELSE 0 END, 0),
         storage_saved_bytes = MAX(storage_saved_bytes - ?, 0),
         synced_at = NULL
       WHERE date = ?`,
      last.decision,
      last.decision,
      sizeDelta,
      date,
    );
  });

  return toSwipeRecord(last, last.uri, last.filename ?? '');
}

export async function getDeleteQueue(sessionId: string): Promise<SwipeRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SwipeRecordRow & { uri: string; filename: string | null }>(
    `SELECT s.*, p.uri AS uri, p.filename AS filename
     FROM swipe_records s
     JOIN photos p ON p.id = s.photo_id
     WHERE s.session_id = ? AND s.decision = 'delete'
     ORDER BY s.timestamp`,
    sessionId,
  );
  return rows.map((r) => toSwipeRecord(r, r.uri, r.filename ?? ''));
}

export async function getDeleteQueueIds(sessionId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ photo_id: string }>(
    `SELECT photo_id FROM swipe_records WHERE session_id = ? AND decision = 'delete'`,
    sessionId,
  );
  return rows.map((r) => r.photo_id);
}

export async function completeSession(sessionId: string): Promise<SessionStats> {
  const db = await getDatabase();
  const completedAt = Date.now();

  await db.runAsync(
    `UPDATE sessions SET status = 'completed', completed_at = ?, synced_at = NULL WHERE id = ?`,
    completedAt,
    sessionId,
  );

  const s = await db.getFirstAsync<SessionRow>(`SELECT * FROM sessions WHERE id = ?`, sessionId);
  if (!s) throw new Error(`Session not found: ${sessionId}`);

  return {
    totalReviewed: s.kept_count + s.deleted_count,
    totalKept: s.kept_count,
    totalDeleted: s.deleted_count,
    storageSavedBytes: s.storage_saved_bytes,
    sessionDurationMs: (s.completed_at ?? completedAt) - s.started_at,
  };
}

export async function pauseSession(sessionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE sessions SET status = 'paused' WHERE id = ?`, sessionId);
}

export async function rescuePhoto(sessionId: string, photoId: string): Promise<boolean> {
  const db = await getDatabase();
  const record = await db.getFirstAsync<SwipeRecordRow>(
    `SELECT * FROM swipe_records WHERE session_id = ? AND photo_id = ? ORDER BY id DESC LIMIT 1`,
    sessionId,
    photoId,
  );
  if (!record) return false;

  const sizeDelta = record.decision === 'delete' ? (record.file_size ?? 0) : 0;
  const date = todayKey(record.timestamp);

  await withTransaction(async (tx) => {
    await tx.runAsync(`DELETE FROM swipe_records WHERE id = ?`, record.id);

    await tx.runAsync(
      `UPDATE session_queue SET status = 'pending' WHERE session_id = ? AND photo_id = ?`,
      sessionId,
      photoId,
    );

    await tx.runAsync(
      `UPDATE sessions SET
         kept_count = kept_count - CASE WHEN ? = 'keep' THEN 1 ELSE 0 END,
         deleted_count = deleted_count - CASE WHEN ? = 'delete' THEN 1 ELSE 0 END,
         storage_saved_bytes = storage_saved_bytes - ?
       WHERE id = ?`,
      record.decision,
      record.decision,
      sizeDelta,
      sessionId,
    );

    await tx.runAsync(
      `UPDATE daily_stats SET
         reviewed = MAX(reviewed - 1, 0),
         deleted = MAX(deleted - CASE WHEN ? = 'delete' THEN 1 ELSE 0 END, 0),
         kept = MAX(kept - CASE WHEN ? = 'keep' THEN 1 ELSE 0 END, 0),
         storage_saved_bytes = MAX(storage_saved_bytes - ?, 0),
         synced_at = NULL
       WHERE date = ?`,
      record.decision,
      record.decision,
      sizeDelta,
      date,
    );
  });
  return true;
}
