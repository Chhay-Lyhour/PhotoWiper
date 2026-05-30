import { getDatabase, withTransaction } from './databaseService';
import type { PhotoRow } from './databaseService';
import { fetchAll, estimateFileSize, type IndexProgress } from './mediaLibraryService';
import type { Photo } from '../types';

const DEFAULT_SESSION_SIZE = 50;

function rowToPhoto(r: PhotoRow): Photo {
  const width = r.width ?? 0;
  const height = r.height ?? 0;
  // Rows indexed before the estimator existed have file_size NULL. Apply the
  // estimate at read time so the caption never falls back to "Loading size…".
  const fileSize = r.file_size && r.file_size > 0 ? r.file_size : estimateFileSize(width, height);
  return {
    id: r.id,
    uri: r.uri,
    filename: r.filename ?? '',
    width,
    height,
    creationTime: r.creation_time ?? 0,
    modificationTime: r.modification_time ?? 0,
    fileSize,
    mediaType: r.media_type,
  };
}

function genSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Fisher-Yates: in-place shuffle. Used per-session so the queue order is fresh
// each cleanup attempt and order isn't tied to creation time.
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function indexLibrary(
  onProgress?: (p: IndexProgress) => void,
): Promise<number> {
  const photos = await fetchAll(onProgress);
  const now = Date.now();

  await withTransaction(async (db) => {
    for (const p of photos) {
      await db.runAsync(
        `INSERT INTO photos (id, uri, filename, file_size, width, height, creation_time, modification_time, media_type, indexed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           uri = excluded.uri,
           filename = excluded.filename,
           file_size = COALESCE(excluded.file_size, photos.file_size),
           width = excluded.width,
           height = excluded.height,
           modification_time = excluded.modification_time`,
        p.id,
        p.uri,
        p.filename || null,
        p.fileSize ?? null,
        p.width || null,
        p.height || null,
        p.creationTime || null,
        p.modificationTime || null,
        p.mediaType,
        now,
      );
    }
  });

  return photos.length;
}

/**
 * Re-scan the photo library and reconcile it with what's accessible NOW, then
 * fold any newly-accessible photos into the active session's queue. Used after
 * the user changes photo permissions (granted more / full / revoked selection).
 *
 * - Newly-accessible, never-reviewed photos are appended to the active session
 *   so they appear in the current review queue (no need to start fresh).
 * - Photos no longer accessible (deselected in limited access) are deleted from
 *   `photos`; ON DELETE CASCADE drops their session_queue rows, and getDeleteQueue's
 *   JOIN drops them from any pending delete list. swipe_records have no photo FK,
 *   so historical stats stay intact.
 */
export async function refreshLibrary(
  onProgress?: (p: IndexProgress) => void,
): Promise<{ added: number; removed: number; total: number }> {
  const photos = await fetchAll(onProgress);
  const now = Date.now();
  let removed = 0;
  let added = 0;

  await withTransaction(async (db) => {
    // Upsert every currently-accessible photo, stamping indexed_at = now so we
    // can detect rows NOT seen this scan (= access revoked) below.
    for (const p of photos) {
      await db.runAsync(
        `INSERT INTO photos (id, uri, filename, file_size, width, height, creation_time, modification_time, media_type, indexed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           uri = excluded.uri,
           filename = excluded.filename,
           file_size = COALESCE(excluded.file_size, photos.file_size),
           width = excluded.width,
           height = excluded.height,
           modification_time = excluded.modification_time,
           indexed_at = excluded.indexed_at`,
        p.id,
        p.uri,
        p.filename || null,
        p.fileSize ?? null,
        p.width || null,
        p.height || null,
        p.creationTime || null,
        p.modificationTime || null,
        p.mediaType,
        now,
      );
    }

    // Remove photos that weren't seen this scan (no longer accessible).
    const del = await db.runAsync(`DELETE FROM photos WHERE indexed_at < ?`, now);
    removed = del.changes ?? 0;

    // Append newly-accessible, never-reviewed photos to the active session.
    const active = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1`,
    );
    if (active) {
      const fresh = await db.getAllAsync<{ id: string }>(
        `SELECT id FROM photos
         WHERE id NOT IN (SELECT photo_id FROM swipe_records)
           AND id NOT IN (SELECT photo_id FROM session_queue WHERE session_id = ?)`,
        active.id,
      );
      if (fresh.length) {
        const posRow = await db.getFirstAsync<{ maxPos: number | null }>(
          `SELECT MAX(position) AS maxPos FROM session_queue WHERE session_id = ?`,
          active.id,
        );
        let pos = (posRow?.maxPos ?? -1) + 1;
        for (const id of shuffle(fresh.map((f) => f.id))) {
          await db.runAsync(
            `INSERT INTO session_queue (session_id, photo_id, position, status) VALUES (?, ?, ?, 'pending')`,
            active.id,
            id,
            pos++,
          );
        }
        await db.runAsync(
          `UPDATE sessions SET total_photos = total_photos + ? WHERE id = ?`,
          fresh.length,
          active.id,
        );
        added = fresh.length;
      }
    }
  });

  return { added, removed, total: photos.length };
}

export async function getActiveSessionId(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1`,
  );
  return row?.id ?? null;
}

export async function startSession(maxPhotos: number = DEFAULT_SESSION_SIZE): Promise<string> {
  const db = await getDatabase();
  const sessionId = genSessionId();
  const now = Date.now();

  // Eligible = photos not yet reviewed in any previous session.
  // Keeps the user from seeing the same photo twice across sessions.
  const candidates = await db.getAllAsync<{ id: string }>(
    `SELECT p.id FROM photos p
     WHERE p.id NOT IN (
       SELECT photo_id FROM swipe_records
     )
     ORDER BY p.creation_time DESC`,
  );

  // A size of 0 (or falsy) is the "All photos" sentinel from settings — review
  // the entire remaining library in one session instead of capping the batch.
  const limit = maxPhotos > 0 ? maxPhotos : candidates.length;
  const picked = shuffle(candidates.map((c) => c.id)).slice(0, limit);

  await withTransaction(async (tx) => {
    await tx.runAsync(
      `INSERT INTO sessions (id, started_at, status, total_photos) VALUES (?, ?, 'active', ?)`,
      sessionId,
      now,
      picked.length,
    );
    for (let i = 0; i < picked.length; i++) {
      await tx.runAsync(
        `INSERT INTO session_queue (session_id, photo_id, position, status) VALUES (?, ?, ?, 'pending')`,
        sessionId,
        picked[i],
        i,
      );
    }
  });

  return sessionId;
}

export async function getNextPhoto(sessionId: string): Promise<Photo | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PhotoRow>(
    `SELECT p.*
     FROM session_queue q
     JOIN photos p ON p.id = q.photo_id
     WHERE q.session_id = ? AND q.status = 'pending'
     ORDER BY q.position
     LIMIT 1`,
    sessionId,
  );
  return row ? rowToPhoto(row) : null;
}

export async function getUpcomingPhotos(sessionId: string, limit: number = 5): Promise<Photo[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PhotoRow>(
    `SELECT p.*
     FROM session_queue q
     JOIN photos p ON p.id = q.photo_id
     WHERE q.session_id = ? AND q.status = 'pending'
     ORDER BY q.position
     LIMIT ?`,
    sessionId,
    limit,
  );

  return rows.map(rowToPhoto);
}

/**
 * Counts photos that have never been swiped on, in any past session.
 * Used by the SwipeScreen to decide whether to offer "load more" when the
 * current session's queue is exhausted.
 */
export async function countUnreviewedPhotos(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM photos
     WHERE id NOT IN (SELECT photo_id FROM swipe_records)`,
  );
  return row?.n ?? 0;
}

export async function getQueueProgress(sessionId: string): Promise<{ reviewed: number; total: number }> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ reviewed: number; total: number }>(
    `SELECT
       SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) AS reviewed,
       COUNT(*) AS total
     FROM session_queue WHERE session_id = ?`,
    sessionId,
  );
  return { reviewed: row?.reviewed ?? 0, total: row?.total ?? 0 };
}
