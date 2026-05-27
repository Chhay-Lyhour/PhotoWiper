/**
 * SwipeScreen — Core screen
 * Drag-to-swipe card: left = delete, right = keep
 * Two states: active swiping / "All caught up" empty state
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import type { RootStackParamList, Photo } from '../types';
import { Colors, Font, Radius, Card, SCREEN, rw, rh, rf } from '../constants/theme';
import { getActiveSessionId, getUpcomingPhotos, getQueueProgress, startSession } from '../services/photoQueue';
import { commitSwipe, undoLastSwipe, getDeleteQueueIds } from '../services/swipeEngine';

type Nav = StackNavigationProp<RootStackParamList>;

const SWIPE_THRESHOLD = Card.swipeThreshold;
const FLY_DISTANCE = SCREEN.W * 1.4;
const PREFETCH_COUNT = 3;

export default function SwipeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [queue, setQueue] = useState<Photo[]>([]);
  const [reviewed, setReviewed] = useState(0);
  const [total, setTotal] = useState(0);
  const [deleteCount, setDeleteCount] = useState(0);

  const progressFraction = total > 0 ? reviewed / total : 0;
  const isEmpty = queue.length === 0;
  const photo = queue[0] ?? null;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const refreshDeleteCount = useCallback(async (sid: string) => {
    const ids = await getDeleteQueueIds(sid);
    setDeleteCount(ids.length);
  }, []);

  const refreshQueue = useCallback(async (sid: string) => {
    const [next, progress] = await Promise.all([
      getUpcomingPhotos(sid, PREFETCH_COUNT),
      getQueueProgress(sid),
    ]);
    setQueue(next);
    setReviewed(progress.reviewed);
    setTotal(progress.total);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        let sid = await getActiveSessionId();
        if (!sid) sid = await startSession();
        if (cancelled) return;
        setSessionId(sid);
        await refreshQueue(sid);
        await refreshDeleteCount(sid);
      })();
      return () => { cancelled = true; };
    }, [refreshQueue, refreshDeleteCount]),
  );

  const resetCard = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [translateX, translateY]);

  const commitKeep = useCallback(() => {
    if (!sessionId || !photo) return;
    const sid = sessionId;
    const pid = photo.id;
    const size = photo.fileSize;
    setQueue((q) => q.slice(1));
    setReviewed((r) => r + 1);
    resetCard();
    (async () => {
      await commitSwipe(sid, pid, 'keep', size);
      await refreshQueue(sid);
    })().catch((e) => console.warn('[commitKeep]', e));
  }, [sessionId, photo, resetCard, refreshQueue]);

  const commitDelete = useCallback(() => {
    if (!sessionId || !photo) return;
    const sid = sessionId;
    const pid = photo.id;
    const size = photo.fileSize;
    setQueue((q) => q.slice(1));
    setReviewed((r) => r + 1);
    setDeleteCount((c) => c + 1);
    resetCard();
    (async () => {
      await commitSwipe(sid, pid, 'delete', size);
      await refreshQueue(sid);
    })().catch((e) => console.warn('[commitDelete]', e));
  }, [sessionId, photo, resetCard, refreshQueue]);

  const handleUndo = useCallback(async () => {
    if (!sessionId) return;
    const restored = await undoLastSwipe(sessionId);
    if (!restored) return;
    await refreshQueue(sessionId);
    await refreshDeleteCount(sessionId);
    resetCard();
  }, [sessionId, refreshQueue, refreshDeleteCount, resetCard]);

  const handleReview = () => navigation.navigate('Review');

  // Button-tap fly-offs
  const flyOffRight = () => {
    translateX.value = withTiming(FLY_DISTANCE, { duration: 220 }, (done) => {
      'worklet';
      if (done) runOnJS(commitKeep)();
    });
  };
  const flyOffLeft = () => {
    translateX.value = withTiming(-FLY_DISTANCE, { duration: 220 }, (done) => {
      'worklet';
      if (done) runOnJS(commitDelete)();
    });
  };

  // Pan gesture
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.25;
    })
    .onEnd((e) => {
      'worklet';
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(FLY_DISTANCE, { duration: 220 }, (done) => {
          'worklet';
          if (done) runOnJS(commitKeep)();
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-FLY_DISTANCE, { duration: 220 }, (done) => {
          'worklet';
          if (done) runOnJS(commitDelete)();
        });
      } else {
        translateX.value = withSpring(0, { damping: 14, stiffness: 140 });
        translateY.value = withSpring(0, { damping: 14, stiffness: 140 });
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN.W, 0, SCREEN.W],
      [-Card.rotationFactor, 0, Card.rotationFactor],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const keepOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const deleteOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + rh(12) }]}>
        <View>
          <Text style={[styles.headerTitle, { fontSize: rf(28) }]}>Discover</Text>
          <Text style={[styles.headerSub, { fontSize: rf(14) }]}>
            {reviewed} / {total} reviewed
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.badgeBtn, { width: rw(52), height: rw(52), borderRadius: Radius.xl }]}
          onPress={handleReview}
          activeOpacity={0.85}
        >
          <Text style={[styles.badgeBtnIcon, { fontSize: rf(20) }]}>✓</Text>
          {deleteCount > 0 && (
            <View style={styles.badge}>
              <Text style={[styles.badgeText, { fontSize: rf(11) }]}>{deleteCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Progress bar ── */}
      <View style={[styles.progressTrack, { marginHorizontal: rw(20) }]}>
        <View style={[styles.progressFill, { width: `${progressFraction * 100}%` }]} />
      </View>

      {/* ── Card area ── */}
      <View style={styles.cardArea}>
        {!isEmpty && photo ? (
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                styles.card,
                { width: Card.width, borderRadius: Card.radius },
                cardAnimatedStyle,
              ]}
            >
              <Image
                source={{ uri: photo.uri }}
                style={styles.cardImage}
                resizeMode="cover"
              />

              {/* KEEP overlay (right swipe) */}
              <Animated.View style={[styles.overlay, styles.overlayKeep, keepOverlayStyle]}>
                <Text style={[styles.overlayText, { fontSize: rf(36) }]}>KEEP</Text>
              </Animated.View>

              {/* DELETE overlay (left swipe) */}
              <Animated.View style={[styles.overlay, styles.overlayDelete, deleteOverlayStyle]}>
                <Text style={[styles.overlayText, { fontSize: rf(36) }]}>DELETE</Text>
              </Animated.View>

              {/* Bottom caption */}
              <View style={styles.cardCaption}>
                <Text style={[styles.captionFilename, { fontSize: rf(15) }]}>
                  {photo.filename}
                </Text>
                <Text style={[styles.captionHint, { fontSize: rf(13) }]}>
                  {photo.fileSize ? `${(photo.fileSize / 1_000_000).toFixed(1)} MB` : 'Size unknown'}
                </Text>
              </View>
            </Animated.View>
          </GestureDetector>
        ) : (
          <View style={[styles.emptyCard, { width: Card.width, borderRadius: Card.radius }]}>
            <Text style={[styles.emptyEmoji, { fontSize: rf(44) }]}>✦✦{'\n'}✦</Text>
            <Text style={[styles.emptyTitle, { fontSize: rf(24) }]}>All caught up</Text>
            <Text style={[styles.emptySubtitle, { fontSize: rf(15) }]}>
              Review your deletions to free up storage.
            </Text>
            {deleteCount > 0 && (
              <TouchableOpacity
                style={[styles.reviewBtn, { borderRadius: Radius.full }]}
                onPress={handleReview}
                activeOpacity={0.85}
              >
                <Text style={[styles.reviewBtnText, { fontSize: rf(16) }]}>
                  Review {deleteCount}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { width: rw(64), height: rw(64), borderRadius: Radius.full }]}
          onPress={flyOffLeft}
          activeOpacity={0.8}
          disabled={isEmpty}
        >
          <Text style={[styles.actionX, { fontSize: rf(24) }]}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { width: rw(52), height: rw(52), borderRadius: Radius.full }]}
          onPress={handleUndo}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionUndo, { fontSize: rf(20) }]}>↺</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtnPrimary, { width: rw(64), height: rw(64), borderRadius: Radius.full }]}
          onPress={flyOffRight}
          activeOpacity={0.8}
          disabled={isEmpty}
        >
          <Text style={[styles.actionHeart, { fontSize: rf(26) }]}>♥</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rw(20),
    paddingBottom: rh(12),
  },
  headerTitle: { fontWeight: Font.bold, color: Colors.textPrimary },
  headerSub: { color: Colors.textSecondary, marginTop: rh(2) },
  badgeBtn: {
    backgroundColor: Colors.purple2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeBtnIcon: { color: Colors.white },
  badge: {
    position: 'absolute',
    top: -rh(4),
    right: -rw(4),
    backgroundColor: Colors.delete,
    borderRadius: Radius.full,
    minWidth: rw(20),
    height: rw(20),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rw(4),
  },
  badgeText: { color: Colors.white, fontWeight: Font.bold },

  // Progress
  progressTrack: {
    height: rh(3),
    backgroundColor: Colors.surfaceTint,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: rh(16),
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.purple2,
    borderRadius: Radius.full,
  },

  // Card area
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    height: Card.height,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  cardImage: { width: '100%', height: '100%', position: 'absolute' },
  cardCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: rw(20),
    paddingBottom: rh(24),
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  captionFilename: { color: Colors.white, fontWeight: Font.semibold },
  captionHint: { color: 'rgba(255,255,255,0.72)', marginTop: rh(2) },

  // Swipe overlays
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayKeep: { backgroundColor: Colors.overlayKeep },
  overlayDelete: { backgroundColor: Colors.overlayDelete },
  overlayText: {
    color: Colors.white,
    fontWeight: Font.extrabold,
    letterSpacing: 3,
    borderWidth: 4,
    borderColor: Colors.white,
    borderRadius: Radius.md,
    paddingHorizontal: rw(20),
    paddingVertical: rh(8),
  },

  // Empty state card
  emptyCard: {
    height: Card.height,
    backgroundColor: Colors.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
    padding: rw(32),
    gap: rh(12),
  },
  emptyEmoji: { color: '#F59E0B', textAlign: 'center', lineHeight: rh(56) },
  emptyTitle: { fontWeight: Font.bold, color: Colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center', lineHeight: rh(22) },
  reviewBtn: {
    backgroundColor: Colors.purple3,
    paddingVertical: rh(14),
    paddingHorizontal: rw(32),
    marginTop: rh(8),
  },
  reviewBtnText: { color: Colors.white, fontWeight: Font.semibold },

  // Action buttons
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rw(24),
    paddingVertical: rh(24),
  },
  actionBtn: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.purple3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.purple3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  actionX: { color: Colors.delete },
  actionUndo: { color: Colors.textSecondary },
  actionHeart: { color: Colors.white },
});
