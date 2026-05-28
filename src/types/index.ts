// ─── Photo ─────────────────────────────────────────────────────────────────
export interface Photo {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  creationTime: number;
  modificationTime: number;
  fileSize?: number;
  mediaType: 'photo' | 'video';
}

export type SwipeDecision = 'keep' | 'delete';

export interface SwipeRecord {
  photoId: string;
  uri: string;
  filename: string;
  fileSize?: number;
  decision: SwipeDecision;
  timestamp: number;
}

// ─── Session ───────────────────────────────────────────────────────────────
export type SessionStatus = 'active' | 'completed' | 'paused';

export interface Session {
  id: string;
  startedAt: number;
  completedAt?: number;
  status: SessionStatus;
  totalPhotos: number;
  keptCount: number;
  deletedCount: number;
  storageSavedBytes: number;
}

// ─── Analytics ─────────────────────────────────────────────────────────────
export interface SessionStats {
  totalReviewed: number;
  totalKept: number;
  totalDeleted: number;
  storageSavedBytes: number;
  sessionDurationMs: number;
}

export interface DailyStats {
  date: string; // 'YYYY-MM-DD'
  reviewed: number;
  deleted: number;
  kept: number;
  storageSavedBytes: number;
}

// ─── Settings ──────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'system';
export type HapticStrength = 'subtle' | 'medium' | 'strong';
export type SwipeSensitivity = 'easy' | 'normal' | 'firm';

export interface AppSettings {
  theme: ThemeMode;
  hapticsEnabled: boolean;
  hapticStrength: HapticStrength;
  swipeSensitivity: SwipeSensitivity;
  invertSwipe: boolean;
  confirmDelete: boolean;
  reduceMotion: boolean;
  showFileSizes: boolean;
  batchSize: number;
}

// ─── Navigation ────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Splash: undefined;
  Permission: undefined;
  Denied: undefined;
  Loading: { resumeSessionId?: string } | undefined;
  Resume: { sessionId: string };
  MainTabs: { screen?: keyof MainTabParamList } | undefined;
  Review: undefined;
  Deleting: undefined;
  AllDone: { stats: SessionStats };
};

export type MainTabParamList = {
  Swipe: undefined;
  Stats: undefined;
  History: undefined;
  Settings: undefined;
};
