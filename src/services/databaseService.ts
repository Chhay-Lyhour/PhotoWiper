import * as SQLite from 'expo-sqlite';

const DB_NAME = 'photoswipe.db';
const SCHEMA_VERSION = 1;

export type PhotoRow = {
  id: string;
  uri: string;
  filename: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  creation_time: number | null;
  modification_time: number | null;
  media_type: 'photo' | 'video';
  indexed_at: number;
};

export type SessionRow = {
  id: string;
  started_at: number;
  completed_at: number | null;
  status: 'active' | 'completed' | 'paused';
  total_photos: number;
  kept_count: number;
  deleted_count: number;
  storage_saved_bytes: number;
  synced_at: number | null;
};

export type SessionQueueRow = {
  session_id: string;
  photo_id: string;
  position: number;
  status: 'pending' | 'reviewed' | 'undone';
};

export type SwipeRecordRow = {
  id: number;
  session_id: string;
  photo_id: string;
  decision: 'keep' | 'delete';
  file_size: number | null;
  timestamp: number;
};

export type DailyStatsRow = {
  date: string;
  reviewed: number;
  deleted: number;
  kept: number;
  storage_saved_bytes: number;
  synced_at: number | null;
};

const INIT_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  uri TEXT NOT NULL,
  filename TEXT,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  creation_time INTEGER,
  modification_time INTEGER,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  indexed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused')),
  total_photos INTEGER NOT NULL DEFAULT 0,
  kept_count INTEGER NOT NULL DEFAULT 0,
  deleted_count INTEGER NOT NULL DEFAULT 0,
  storage_saved_bytes INTEGER NOT NULL DEFAULT 0,
  synced_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_completed ON sessions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_unsynced ON sessions(synced_at) WHERE synced_at IS NULL;

CREATE TABLE IF NOT EXISTS session_queue (
  session_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'reviewed', 'undone')),
  PRIMARY KEY (session_id, photo_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_queue_position ON session_queue(session_id, position);
CREATE INDEX IF NOT EXISTS idx_queue_pending ON session_queue(session_id, status, position);

CREATE TABLE IF NOT EXISTS swipe_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('keep', 'delete')),
  file_size INTEGER,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_swipes_session ON swipe_records(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_swipes_photo ON swipe_records(photo_id);

CREATE TABLE IF NOT EXISTS daily_stats (
  date TEXT PRIMARY KEY,
  reviewed INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  kept INTEGER NOT NULL DEFAULT 0,
  storage_saved_bytes INTEGER NOT NULL DEFAULT 0,
  synced_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_daily_unsynced ON daily_stats(synced_at) WHERE synced_at IS NULL;
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(INIT_SQL);
  await db.runAsync(
    'INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)',
    'schema_version',
    String(SCHEMA_VERSION),
  );
  return db;
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DROP TABLE IF EXISTS swipe_records;
    DROP TABLE IF EXISTS session_queue;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS photos;
    DROP TABLE IF EXISTS daily_stats;
    DROP TABLE IF EXISTS meta;
  `);
  dbPromise = null;
  await getDatabase();
}

export async function withTransaction<T>(
  fn: (db: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
  const db = await getDatabase();
  let result!: T;
  await db.withTransactionAsync(async () => {
    result = await fn(db);
  });
  return result;
}
