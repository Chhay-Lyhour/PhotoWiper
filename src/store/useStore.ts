import { create } from 'zustand';
import type { Photo, SwipeRecord, Session, AppSettings, DailyStats } from '../types';

interface AppState {
  // ── Photo queue ──────────────────────────────────────────────────────────
  photoQueue: Photo[];
  deleteQueue: SwipeRecord[];
  swipeHistory: SwipeRecord[];

  // ── Session ──────────────────────────────────────────────────────────────
  currentSession: Session | null;
  pastSessions: Session[];
  dailyStats: DailyStats[];

  // ── UI state ─────────────────────────────────────────────────────────────
  isLoading: boolean;
  loadingProgress: number;
  loadingCount: number;
  loadingStatus: string;
  deletingProgress: number;
  deletingCurrent: number;
  deletingTotal: number;

  // ── Settings ─────────────────────────────────────────────────────────────
  settings: AppSettings;

  // ── Actions ──────────────────────────────────────────────────────────────
  setPhotoQueue: (photos: Photo[]) => void;
  addToDeleteQueue: (record: SwipeRecord) => void;
  removeFromDeleteQueue: (photoId: string) => void;
  pushSwipeHistory: (record: SwipeRecord) => void;
  undoLastSwipe: () => SwipeRecord | undefined;
  setCurrentSession: (session: Session | null) => void;
  addPastSession: (session: Session) => void;
  setDailyStats: (stats: DailyStats[]) => void;
  setLoading: (loading: boolean) => void;
  setLoadingProgress: (p: number) => void;
  setLoadingCount: (n: number) => void;
  setLoadingStatus: (s: string) => void;
  setDeletingProgress: (current: number, total: number) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSession: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  hapticsEnabled: true,
  showFileSizes: true,
  batchSize: 50,
};

export const useStore = create<AppState>((set, get) => ({
  photoQueue: [],
  deleteQueue: [],
  swipeHistory: [],
  currentSession: null,
  pastSessions: [],
  dailyStats: [],
  isLoading: false,
  loadingProgress: 0,
  loadingCount: 0,
  loadingStatus: '',
  deletingProgress: 0,
  deletingCurrent: 0,
  deletingTotal: 0,
  settings: DEFAULT_SETTINGS,

  setPhotoQueue: (photos) => set({ photoQueue: photos }),
  addToDeleteQueue: (record) =>
    set((s) => ({ deleteQueue: [...s.deleteQueue, record] })),
  removeFromDeleteQueue: (photoId) =>
    set((s) => ({ deleteQueue: s.deleteQueue.filter((r) => r.photoId !== photoId) })),
  pushSwipeHistory: (record) =>
    set((s) => ({ swipeHistory: [...s.swipeHistory, record] })),
  undoLastSwipe: () => {
    const { swipeHistory } = get();
    if (!swipeHistory.length) return undefined;
    const last = swipeHistory[swipeHistory.length - 1];
    set((s) => ({
      swipeHistory: s.swipeHistory.slice(0, -1),
      deleteQueue:
        last.decision === 'delete'
          ? s.deleteQueue.filter((r) => r.photoId !== last.photoId)
          : s.deleteQueue,
    }));
    return last;
  },
  setCurrentSession: (session) => set({ currentSession: session }),
  addPastSession: (session) =>
    set((s) => ({ pastSessions: [session, ...s.pastSessions] })),
  setDailyStats: (stats) => set({ dailyStats: stats }),
  setLoading: (loading) => set({ isLoading: loading }),
  setLoadingProgress: (p) => set({ loadingProgress: p }),
  setLoadingCount: (n) => set({ loadingCount: n }),
  setLoadingStatus: (s) => set({ loadingStatus: s }),
  setDeletingProgress: (current, total) =>
    set({ deletingCurrent: current, deletingTotal: total, deletingProgress: total > 0 ? current / total : 0 }),
  updateSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),
  resetSession: () =>
    set({ photoQueue: [], deleteQueue: [], swipeHistory: [], currentSession: null, loadingProgress: 0, loadingCount: 0, loadingStatus: '', deletingProgress: 0, deletingCurrent: 0, deletingTotal: 0 }),
}));
