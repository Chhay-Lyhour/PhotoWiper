/**
 * Server connection config.
 *
 * INACTIVE: cloud sync has been removed — the app is fully local-first (SQLite)
 * and makes no network calls. These values are kept only for reference. If sync
 * is ever re-enabled, replace API_BASE_URL (currently a dev LAN IP that won't
 * resolve off the dev network) with a public URL and add a proper auth flow
 * instead of shipping API_KEY in the client.
 */
export const API_BASE_URL = 'http://172.20.10.6:4000';
export const API_KEY      = 'e6d94c32-8158-4f8f-a253-6da00a03e148';

export const API_TIMEOUT_MS = 8000;