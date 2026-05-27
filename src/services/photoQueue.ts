import { getDatabase, withTransaction } from './databaseService';
import type { PhotoRow } from './databaseService';
import { fetchAll, enrichWithFileSize, type IndexProgress } from './mediaLibraryService';
import type { Photo } from '../types';

const DEFAULT_SESSION_SIZE = 50;

function rowToPhoto(r: PhotoRow): Photo {
  return {
    id: r.id,
    uri: r.uri,
    filename: r.filename ?? '',
    width: r.width ?? 0,
    height: r.height ?? 0,
    creationTime: r.creation_time ?? 0,
    modificationTime: r.modification_time ?? 0,
    fileSize: r.file_size ?? undefined,
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

  const picked = shuffle(candidates.map((c) => c.id)).slice(0, maxPhotos);

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

  const photos = rows.map(rowToPhoto);

  // Size enrichment via MediaLibrary.getAssetInfoAsync is currently
  // DISABLED — it caused a native crash on Expo Go iOS when iOS rejected
  // the call for assets covered by the new limited-permission model.
  // The caption will show "Loading size…" until we move to a dev build.
  // (Keep `enrichWithFileSize` available for future use.)
  void enrichWithFileSize;

  return photos;
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
