/**
 * SwipeScreen — Core screen
 * Drag-to-swipe card: left = delete, right = keep
 * Two states: active swiping / "All caught up" empty state
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated as RNAnimated, Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
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
import { Font, Radius, Card, SCREEN, rw, rh, rf, type ThemePalette } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import {
  getActiveSessionId,
  getUpcomingPhotos,
  getQueueProgress,
  startSession,
  countUnreviewedPhotos,
} from '../services/photoQueue';
import { commitSwipe, undoLastSwipe, getDeleteQueueIds, completeSession } from '../services/swipeEngine';
import { haptics } from '../services/hapticsService';
import { useStore } from '../store/useStore';
import type { SwipeSensitivity } from '../types';

type Nav = StackNavigationProp<RootStackParamList>;

const FLY_DISTANCE = SCREEN.W * 1.4;
const PREFETCH_COUNT = 3;

// "Easy" commits with a small drag; "firm" forces a deliberate one. Falls
// back to the theme's default for "normal" so existing tuning is preserved.
function thresholdFor(sensitivity: SwipeSensitivity): number {
  switch (sensitivity) {
    case 'easy': return rw(60);
    case 'firm': return rw(140);
    case 'normal':
    default: return Card.swipeThreshold;
  }
}

export default function SwipeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const settings = useStore((s) => s.settings);
  const invertSwipe = settings.invertSwipe;
  const reduceMotion = settings.reduceMotion;
  const SWIPE_THRESHOLD = thresholdFor(settings.swipeSensitivity);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [queue, setQueue] = useState<Photo[]>([]);
  const [reviewed, setReviewed] = useState(0);
  const [total, setTotal] = useState(0);
  const [deleteCount, setDeleteCount] = useState(0);
  const [remainingInLibrary, setRemainingInLibrary] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const progressFraction = total > 0 ? reviewed / total : 0;
  const isEmpty = queue.length === 0;
  const photo = queue[0] ?? null;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  // Tracks whether we've already fired the threshold-crossing haptic for the
  // current gesture. Reset to 0 on gesture begin; flipped to 1 the first time
  // |translateX| > SWIPE_THRESHOLD, so the user feels exactly one "magnetic"
  // tick per swipe instead of a buzzy stream.
  const didTickThreshold = useSharedValue(0);

  // Back-card stack rise: 0 = resting (cards at offset positions), 1 = risen
  // one slot (card1 → front, card2 → middle). Driven by RN's Animated (not
  // Reanimated) because it's purely JS-thread one-shot — no worklet, no
  // subscription to gesture, so it sidesteps the Expo Go native crash we hit
  // when useAnimatedStyle was used on back cards.
  const stackProgress = useRef(new RNAnimated.Value(0)).current;

  const startStackRise = useCallback(() => {
    RNAnimated.timing(stackProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [stackProgress]);

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

    // When the queue runs out, look up how many photos in the whole library
    // still haven't been reviewed — drives the load-more vs. all-done UI.
    if (next.length === 0) {
      const remaining = await countUnreviewedPhotos();
      setRemainingInLibrary(remaining);
    } else {
      setRemainingInLibrary(null);
    }
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!sessionId || loadingMore) return;
    setLoadingMore(true);
    try {
      // Close the current session (records stats) before starting a fresh batch.
      await completeSession(sessionId);
      const newSid = await startSession(settings.batchSize);
      setSessionId(newSid);
      setReviewed(0);
      setDeleteCount(0);
      await refreshQueue(newSid);
    } catch (e) {
      console.warn('[handleLoadMore]', e);
    } finally {
      setLoadingMore(false);
    }
  }, [sessionId, loadingMore, refreshQueue]);

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

  // Ghost-image fix: reset card position only AFTER React swaps in the new
  // photo. Calling resetCard() inside commitKeep/commitDelete caused the old
  // photo to snap back to centre for one frame before the next photo appeared.
  // Also resets stackProgress so the new back cards start at their resting
  // offsets (matching where the previous ones landed at progress=1).
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    stackProgress.setValue(0);
  }, [photo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitKeep = useCallback(() => {
    if (!sessionId || !photo) return;
    const sid = sessionId;
    const pid = photo.id;
    const size = photo.fileSize;
    setQueue((q) => q.slice(1));
    setReviewed((r) => r + 1);
    // resetCard() removed — useEffect above handles position reset on photo change.
    (async () => {
      await commitSwipe(sid, pid, 'keep', size);
      await refreshQueue(sid);
    })().catch((e) => console.warn('[commitKeep]', e));
  }, [sessionId, photo, refreshQueue]);

  const commitDelete = useCallback(() => {
    if (!sessionId || !photo) return;
    const sid = sessionId;
    const pid = photo.id;
    const size = photo.fileSize;
    setQueue((q) => q.slice(1));
    setReviewed((r) => r + 1);
    setDeleteCount((c) => c + 1);
    // resetCard() removed — useEffect above handles position reset on photo change.
    (async () => {
      await commitSwipe(sid, pid, 'delete', size);
      await refreshQueue(sid);
    })().catch((e) => console.warn('[commitDelete]', e));
  }, [sessionId, photo, refreshQueue]);

  const handleUndo = useCallback(async () => {
    if (!sessionId) return;
    haptics.undo();
    const restored = await undoLastSwipe(sessionId);
    if (!restored) return;
    await refreshQueue(sessionId);
    await refreshDeleteCount(sessionId);
    resetCard();
  }, [sessionId, refreshQueue, refreshDeleteCount, resetCard]);

  const handleReview = () => {
    haptics.selection();
    navigation.navigate('Review');
  };

  // Button-tap fly-offs. Direction of travel depends on invertSwipe so the
  // visual matches the swipe semantics the user expects: by default keep
  // flies right, delete flies left; inverted reverses both.
  const flyOffKeep = () => {
    haptics.commitKeep();
    // Reduce motion: commit instantly with no fly-off / stack-rise animation.
    if (reduceMotion) { commitKeep(); return; }
    startStackRise();
    const target = invertSwipe ? -FLY_DISTANCE : FLY_DISTANCE;
    translateX.value = withTiming(target, { duration: 220 }, (done) => {
      'worklet';
      if (done) runOnJS(commitKeep)();
    });
  };
  const flyOffDelete = () => {
    haptics.commitDelete();
    if (reduceMotion) { commitDelete(); return; }
    startStackRise();
    const target = invertSwipe ? FLY_DISTANCE : -FLY_DISTANCE;
    translateX.value = withTiming(target, { duration: 220 }, (done) => {
      'worklet';
      if (done) runOnJS(commitDelete)();
    });
  };

  // Pan gesture
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onBegin(() => {
      'worklet';
      didTickThreshold.value = 0;
    })
    .onUpdate((e) => {
      'worklet';
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.25;
      // Fire a single "magnetic" tick the first frame |translateX| crosses
      // the commit threshold this gesture. Lets the user feel exactly when
      // letting go will commit, without spamming haptics on every frame.
      if (didTickThreshold.value === 0 && Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        didTickThreshold.value = 1;
        runOnJS(haptics.thresholdTick)();
      }
    })
    .onEnd((e) => {
      'worklet';
      if (e.translationX > SWIPE_THRESHOLD) {
        // Right past threshold → keep by default, delete when inverted.
        const isKeep = !invertSwipe;
        if (isKeep) runOnJS(haptics.commitKeep)();
        else runOnJS(haptics.commitDelete)();
        // Reduce motion: commit instantly, skipping the fly-off animation.
        if (reduceMotion) {
          if (isKeep) runOnJS(commitKeep)();
          else runOnJS(commitDelete)();
        } else {
          runOnJS(startStackRise)();
          translateX.value = withTiming(FLY_DISTANCE, { duration: 220 }, (done) => {
            'worklet';
            if (done) {
              if (isKeep) runOnJS(commitKeep)();
              else runOnJS(commitDelete)();
            }
          });
        }
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        // Left past threshold → delete by default, keep when inverted.
        const isKeep = invertSwipe;
        if (isKeep) runOnJS(haptics.commitKeep)();
        else runOnJS(haptics.commitDelete)();
        if (reduceMotion) {
          if (isKeep) runOnJS(commitKeep)();
          else runOnJS(commitDelete)();
        } else {
          runOnJS(startStackRise)();
          translateX.value = withTiming(-FLY_DISTANCE, { duration: 220 }, (done) => {
            'worklet';
            if (done) {
              if (isKeep) runOnJS(commitKeep)();
              else runOnJS(commitDelete)();
            }
          });
        }
      } else if (reduceMotion) {
        // Snap back with no spring when motion is reduced.
        translateX.value = 0;
        translateY.value = 0;
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

  // Back-card animated styles — interpolate stackProgress so each back card
  // smoothly rises one slot when a swipe commits:
  //   card1 (middle):  scale 0.92→1.00,  translateY rh(36)→0,    opacity 0.90→1.00
  //   card2 (deepest): scale 0.85→0.92, translateY rh(64)→rh(36), opacity 0.75→0.90
  // Once the queue slices and photo.id changes, stackProgress resets to 0,
  // and the new card1/card2 land at the resting offsets (= same pixel position
  // they animated to at progress=1), so there's no visual jump.
  const card1BehindAnimatedStyle = {
    transform: [
      {
        scale: stackProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1],
        }),
      },
      {
        translateY: stackProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [rh(36), 0],
        }),
      },
    ],
    opacity: stackProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    }),
  };
  const card2BehindAnimatedStyle = {
    transform: [
      {
        scale: stackProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 0.92],
        }),
      },
      {
        translateY: stackProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [rh(64), rh(36)],
        }),
      },
    ],
    opacity: stackProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.75, 0.9],
    }),
  };

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
          <Ionicons name="checkmark" size={rf(20)} color={colors.white} />
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
          // 3-layer stack: card[2] deepest → card[1] middle → card[0] front
          <View style={[styles.cardStack, { width: Card.width, height: Card.height + rh(80) }]}>

            {/* Card 2 — deepest (photo[2]) — animates one slot forward on commit */}
            {queue[2] && (
              <RNAnimated.View
                style={[styles.card, styles.cardBehind,
                  { width: Card.width, borderRadius: Card.radius },
                  card2BehindAnimatedStyle,
                ]}
                pointerEvents="none"
              >
                <Image source={{ uri: queue[2].uri }} style={styles.cardImage}
                  contentFit="cover" cachePolicy="memory" />
              </RNAnimated.View>
            )}

            {/* Card 1 — middle (photo[1]) — animates up to front on commit */}
            {queue[1] && (
              <RNAnimated.View
                style={[styles.card, styles.cardBehind,
                  { width: Card.width, borderRadius: Card.radius },
                  card1BehindAnimatedStyle,
                ]}
                pointerEvents="none"
              >
                <Image source={{ uri: queue[1].uri }} style={styles.cardImage}
                  contentFit="cover" cachePolicy="memory" />
              </RNAnimated.View>
            )}

            {/* Card 0 — front (photo[0], swipeable) */}
            <GestureDetector gesture={pan}>
              <Animated.View
                style={[styles.card, styles.cardBehind,
                  { width: Card.width, borderRadius: Card.radius },
                  cardAnimatedStyle,
                ]}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.cardImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />

                {/* Right-swipe overlay — keep by default, delete when inverted */}
                <Animated.View
                  style={[
                    styles.overlay,
                    invertSwipe ? styles.overlayDelete : styles.overlayKeep,
                    keepOverlayStyle,
                  ]}
                >
                  <Text style={[styles.overlayText, { fontSize: rf(36) }]}>
                    {invertSwipe ? 'DELETE' : 'KEEP'}
                  </Text>
                </Animated.View>

                {/* Left-swipe overlay — delete by default, keep when inverted */}
                <Animated.View
                  style={[
                    styles.overlay,
                    invertSwipe ? styles.overlayKeep : styles.overlayDelete,
                    deleteOverlayStyle,
                  ]}
                >
                  <Text style={[styles.overlayText, { fontSize: rf(36) }]}>
                    {invertSwipe ? 'KEEP' : 'DELETE'}
                  </Text>
                </Animated.View>

                {/* Bottom caption */}
                <View style={styles.cardCaption}>
                  <Text style={[styles.captionFilename, { fontSize: rf(15) }]}>
                    {photo.filename}
                  </Text>
                  <Text style={[styles.captionHint, { fontSize: rf(13) }]}>
                    {photo.fileSize != null && photo.fileSize > 0
                      ? `${(photo.fileSize / 1_000_000).toFixed(1)} MB`
                      : 'Loading size…'}
                  </Text>
                </View>
              </Animated.View>
            </GestureDetector>
          </View>
        ) : (
          <View style={[styles.emptyCard, { width: Card.width, borderRadius: Card.radius }]}>
            {deleteCount > 0 ? (
              // 1. Pending deletes — review them first
              <>
                <Ionicons name="sparkles" size={rf(44)} color="#F59E0B" style={styles.emptyEmoji} />
                <Text style={[styles.emptyTitle, { fontSize: rf(24) }]}>All caught up</Text>
                <Text style={[styles.emptySubtitle, { fontSize: rf(15) }]}>
                  Review your deletions to free up storage.
                </Text>
                <TouchableOpacity
                  style={[styles.reviewBtn, { borderRadius: Radius.full }]}
                  onPress={handleReview}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.reviewBtnText, { fontSize: rf(16) }]}>
                    Review {deleteCount}
                  </Text>
                </TouchableOpacity>
              </>
            ) : remainingInLibrary !== null && remainingInLibrary > 0 ? (
              // 2. More photos available — offer to load another batch
              <>
                <Ionicons name="camera-outline" size={rf(44)} color="#F59E0B" style={styles.emptyEmoji} />
                <Text style={[styles.emptyTitle, { fontSize: rf(24) }]}>Nice work!</Text>
                <Text style={[styles.emptySubtitle, { fontSize: rf(15) }]}>
                  You reviewed {total} photos. {remainingInLibrary} more waiting.
                </Text>
                <TouchableOpacity
                  style={[styles.reviewBtn, { borderRadius: Radius.full, opacity: loadingMore ? 0.6 : 1 }]}
                  onPress={handleLoadMore}
                  activeOpacity={0.85}
                  disabled={loadingMore}
                >
                  <Text style={[styles.reviewBtnText, { fontSize: rf(16) }]}>
                    {loadingMore ? 'Loading…' : 'Load more photos'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              // 3. Library fully reviewed — celebrate
              <>
                <Ionicons name="trophy-outline" size={rf(44)} color="#F59E0B" style={styles.emptyEmoji} />
                <Text style={[styles.emptyTitle, { fontSize: rf(24) }]}>Library cleaned!</Text>
                <Text style={[styles.emptySubtitle, { fontSize: rf(15) }]}>
                  You've reviewed every photo in your library.
                </Text>
              </>
            )}
          </View>
        )}
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { width: rw(64), height: rw(64), borderRadius: Radius.full }]}
          onPress={flyOffDelete}
          activeOpacity={0.8}
          disabled={isEmpty}
        >
          <Ionicons name="close" size={rf(24)} color={colors.delete} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { width: rw(52), height: rw(52), borderRadius: Radius.full }]}
          onPress={handleUndo}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-undo" size={rf(20)} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtnPrimary, { width: rw(64), height: rw(64), borderRadius: Radius.full }]}
          onPress={flyOffKeep}
          activeOpacity={0.8}
          disabled={isEmpty}
        >
          <Ionicons name="heart" size={rf(26)} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (c: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rw(20),
    paddingBottom: rh(12),
  },
  headerTitle: { fontWeight: Font.bold, color: c.textPrimary },
  headerSub: { color: c.textSecondary, marginTop: rh(2) },
  badgeBtn: {
    backgroundColor: c.purple2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeBtnIcon: { color: c.white },
  badge: {
    position: 'absolute',
    top: -rh(4),
    right: -rw(4),
    backgroundColor: c.delete,
    borderRadius: Radius.full,
    minWidth: rw(20),
    height: rw(20),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rw(4),
  },
  badgeText: { color: c.white, fontWeight: Font.bold },

  // Progress
  progressTrack: {
    height: rh(3),
    backgroundColor: c.surfaceTint,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: rh(16),
  },
  progressFill: {
    height: '100%',
    backgroundColor: c.purple2,
    borderRadius: Radius.full,
  },

  // Card area
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stack container holds all 3 cards at the same absolute position
  cardStack: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  // Every card in the stack is absolute-positioned at top:0; transforms move them
  cardBehind: {
    position: 'absolute',
    top: 0,
  },
  card: {
    overflow: 'hidden',
    backgroundColor: c.surface,
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
  captionFilename: { color: c.white, fontWeight: Font.semibold },
  captionHint: { color: 'rgba(255,255,255,0.72)', marginTop: rh(2) },

  // Swipe overlays
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayKeep: { backgroundColor: c.overlayKeep },
  overlayDelete: { backgroundColor: c.overlayDelete },
  overlayText: {
    color: c.white,
    fontWeight: Font.extrabold,
    letterSpacing: 3,
    borderWidth: 4,
    borderColor: c.white,
    borderRadius: Radius.md,
    paddingHorizontal: rw(20),
    paddingVertical: rh(8),
  },

  // Empty state card
  emptyCard: {
    height: Card.height,
    backgroundColor: c.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
    padding: rw(32),
    gap: rh(12),
  },
  emptyEmoji: { color: '#F59E0B', textAlign: 'center', lineHeight: rh(56) },
  emptyTitle: { fontWeight: Font.bold, color: c.textPrimary, textAlign: 'center' },
  emptySubtitle: { color: c.textSecondary, textAlign: 'center', lineHeight: rh(22) },
  reviewBtn: {
    backgroundColor: c.purple3,
    paddingVertical: rh(14),
    paddingHorizontal: rw(32),
    marginTop: rh(8),
  },
  reviewBtnText: { color: c.white, fontWeight: Font.semibold },

  // Action buttons
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rw(24),
    paddingVertical: rh(24),
  },
  actionBtn: {
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnPrimary: {
    backgroundColor: c.purple3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.purple3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  actionX: { color: c.delete },
  actionUndo: { color: c.textSecondary },
  actionHeart: { color: c.white },
});
