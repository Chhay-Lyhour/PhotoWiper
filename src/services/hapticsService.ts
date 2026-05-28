/**
 * Central wrapper around expo-haptics.
 *
 * Every haptic call in the app should go through this module so the master
 * `hapticsEnabled` toggle and the `hapticStrength` preference in settings
 * actually take effect everywhere.
 *
 * Notes:
 * - We read store state with `useStore.getState()` (not a hook). These
 *   functions are called from gesture callbacks, button handlers, and
 *   sometimes via `runOnJS` from Reanimated worklets — none of which are
 *   React render contexts.
 * - Every haptic promise is swallowed with `.catch(() => {})`. On Android
 *   devices without haptic hardware (older / budget models) expo-haptics
 *   rejects; we don't want that to crash the gesture or button handler.
 */
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';

function isEnabled(): boolean {
  return useStore.getState().settings.hapticsEnabled;
}

function impactStyle(): Haptics.ImpactFeedbackStyle {
  switch (useStore.getState().settings.hapticStrength) {
    case 'subtle':
      return Haptics.ImpactFeedbackStyle.Light;
    case 'strong':
      return Haptics.ImpactFeedbackStyle.Heavy;
    case 'medium':
    default:
      return Haptics.ImpactFeedbackStyle.Medium;
  }
}

export const haptics = {
  /**
   * Subtle tick when the user drags past the swipe-commit threshold — gives
   * the card a "magnetic" feel. Should be cheap and called at most once per
   * gesture (caller is responsible for de-duping).
   */
  thresholdTick(): void {
    if (!isEnabled()) return;
    Haptics.selectionAsync().catch(() => {});
  },

  /** Soft success pulse — fires when a "keep" swipe commits. */
  commitKeep(): void {
    if (!isEnabled()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },

  /** Three-pulse warning — fires when a "delete" swipe commits. */
  commitDelete(): void {
    if (!isEnabled()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },

  /** Button tap (heart / X). Intensity follows the `hapticStrength` setting. */
  buttonTap(): void {
    if (!isEnabled()) return;
    Haptics.impactAsync(impactStyle()).catch(() => {});
  },

  /** Undo — always a soft light bump regardless of strength setting. */
  undo(): void {
    if (!isEnabled()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },

  /** Generic selection change — toggles, segmented-control taps, picker rows. */
  selection(): void {
    if (!isEnabled()) return;
    Haptics.selectionAsync().catch(() => {});
  },
};