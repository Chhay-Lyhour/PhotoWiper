/**
 * Server connection config.
 *
 * Dev — points at the Mac's LAN IP so the iPhone in Expo Go can reach it.
 * When deploying, swap API_BASE_URL with the public URL (Render / Fly / Railway).
 *
 * SECURITY NOTE: API_KEY is shipped with the client. This is acceptable for
 * an anonymous-stats sync model but should be replaced with a proper auth
 * flow before exposing endpoints that handle user data.
 */
export const API_BASE_URL = 'http://172.20.10.6:4000';
export const API_KEY      = 'e6d94c32-8158-4f8f-a253-6da00a03e148';

export const API_TIMEOUT_MS = 8000;