/**
 * DeletingScreen — trash icon · progress bar · "X of Y deleted"
 * Design ref: Image 3
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Animated, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { Font, Radius, rw, rh, rf, type ThemePalette } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { getActiveSessionId } from '../services/photoQueue';
import { getDeleteQueueIds, completeSession } from '../services/swipeEngine';
import { deletePhotos } from '../services/mediaLibraryService';
import { syncAll } from '../services/syncService';

type Props = StackScreenProps<RootStackParamList, 'Deleting'>;

export default function DeletingScreen({ navigation }: Props) {
  const insets  = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const barAnim   = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sid = await getActiveSessionId();
      if (!sid) {
        navigation.replace('MainTabs');
        return;
      }

      const ids = await getDeleteQueueIds(sid);
      if (cancelled) return;
      setTotal(ids.length);

      if (ids.length === 0) {
        const stats = await completeSession(sid);
        syncAll(); // fire-and-forget; fails silently
        if (!cancelled) navigation.replace('AllDone', { stats });
        return;
      }

      // Animate counter from 0 → total while the native delete runs.
      // MediaLibrary.deleteAssetsAsync is atomic (one user prompt for the whole batch),
      // so we can't report real per-photo progress — just give the user motion.
      const stepMs = Math.max(40, Math.min(120, Math.floor(1800 / ids.length)));
      let counter = 0;
      const tick = setInterval(() => {
        if (cancelled) { clearInterval(tick); return; }
        counter = Math.min(counter + 1, ids.length);
        setCurrent(counter);
        Animated.timing(barAnim, {
          toValue: counter / ids.length,
          duration: stepMs,
          useNativeDriver: false,
        }).start();
        if (counter >= ids.length) clearInterval(tick);
      }, stepMs);

      try {
        const ok = await deletePhotos(ids);
        clearInterval(tick);
        if (cancelled) return;
        if (!ok) {
          console.warn('[Deleting] user cancelled or delete failed');
          navigation.replace('MainTabs');
          return;
        }
        setCurrent(ids.length);
        Animated.timing(barAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();

        const stats = await completeSession(sid);
        syncAll(); // fire-and-forget; fails silently
        if (!cancelled) {
          setTimeout(() => navigation.replace('AllDone', { stats }), 500);
        }
      } catch (e) {
        clearInterval(tick);
        console.warn('[Deleting] error:', e);
        if (!cancelled) navigation.replace('MainTabs');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const barTrackW = width - rw(80);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View
        style={[
          styles.iconCircle,
          { width: rw(120), height: rw(120), borderRadius: rw(60), transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Ionicons name="trash" size={rf(52)} color={colors.white} />
      </Animated.View>

      <Text style={[styles.title, { fontSize: rf(28) }]}>Deleting photos…</Text>
      <Text style={[styles.subtitle, { fontSize: rf(16) }]}>
        Permanently removing {total} photo{total === 1 ? '' : 's'} from your device
      </Text>

      <View style={[styles.barTrack, { width: barTrackW, marginTop: rh(32) }]}>
        <Animated.View style={[styles.barFill, { width: barWidth }]} />
      </View>

      <Text style={[styles.counter, { fontSize: rf(16) }]}>
        {current} of {total} deleted
      </Text>
    </View>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rh(16),
  },
  iconCircle: {
    backgroundColor: colors.purple2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rh(8),
    shadowColor: colors.purple3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  iconGlyph: {},
  title: { fontWeight: Font.bold, color: colors.textPrimary },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: rw(40),
    lineHeight: rh(24),
  },
  barTrack: {
    height: rh(6),
    backgroundColor: colors.surfaceTint,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.purple2,
    borderRadius: Radius.full,
  },
  counter: {
    color: colors.purple3,
    fontWeight: Font.semibold,
  },
});
