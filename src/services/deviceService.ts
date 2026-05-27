import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { getDatabase } from './databaseService';

const META_KEY_DEVICE_ID = 'device_id';

function generateDeviceId(): string {
  // RFC 4122 v4 UUID — good enough for an anonymous client identifier.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns a stable anonymous device ID. First call generates and persists
 * one in the SQLite meta table; subsequent calls return the same value.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    META_KEY_DEVICE_ID,
  );

  if (row?.value) return row.value;

  const id = generateDeviceId();
  await db.runAsync(
    'INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)',
    META_KEY_DEVICE_ID,
    id,
  );
  return id;
}

export function getPlatform(): 'ios' | 'android' {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

export function getAppVersion(): string {
  return Application.nativeApplicationVersion ?? '0.0.0';
}