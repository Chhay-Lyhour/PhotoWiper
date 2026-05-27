/**
 * LoadingScreen — "SCANNING GALLERY" · big purple count · progress bar · spinner
 * Design ref: Image 5
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { Colors, Font, Radius, rw, rh, rf } from '../constants/theme';
import { useStore } from '../store/useStore';
import { indexLibrary } from '../services/photoQueue';
import { startSession } from '../services/photoQueue';

type Props = StackScreenProps<RootStackParamList, 'Loading'>;

const STATUS_STEPS = ['Scanning your gallery…', 'Shuffling your gallery…', 'Almost ready…'];

export default function LoadingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { loadingCount, loadingStatus } = useStore();
  const barAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    ).start();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const store = useStore.getState();
    store.setLoadingCount(0);
    store.setLoadingStatus(STATUS_STEPS[0]);
    store.setLoadingProgress(0);

    (async () => {
      try {
        const total = await indexLibrary(({ fetched, total }) => {
          if (cancelled) return;
          const s = useStore.getState();
          s.setLoadingCount(fetched);
          const p = total > 0 ? Math.min(fetched / total, 0.85) : 0;
          s.setLoadingProgress(p);
          Animated.timing(barAnim, { toValue: p, duration: 150, useNativeDriver: false }).start();
          if (fetched / Math.max(total, 1) > 0.3 && s.loadingStatus === STATUS_STEPS[0]) {
            s.setLoadingStatus(STATUS_STEPS[1]);
          }
        });

        if (cancelled) return;
        useStore.getState().setLoadingStatus(STATUS_STEPS[2]);
        Animated.timing(barAnim, { toValue: 0.95, duration: 200, useNativeDriver: false }).start();

        await startSession();
        if (cancelled) return;

        Animated.timing(barAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
        useStore.getState().setLoadingProgress(1);
        useStore.getState().setLoadingCount(total);

        setTimeout(() => {
          if (!cancelled) navigation.replace('MainTabs');
        }, 400);
      } catch (err) {
        console.warn('[Loading] indexLibrary failed:', err);
        if (!cancelled) navigation.replace('Denied');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <Text style={[styles.label, { fontSize: rf(12) }]}>SCANNING GALLERY</Text>
        <Text style={[styles.count, { fontSize: rf(70) }]}>
          {loadingCount.toLocaleString()}
        </Text>
        <Text style={[styles.found, { fontSize: rf(16) }]}>photos found</Text>

        <View style={[styles.barTrack, { width: width - rw(80) }]}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
        </View>

        <View style={styles.statusRow}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
          <Text style={[styles.statusText, { fontSize: rf(14) }]}>
            {loadingStatus || STATUS_STEPS[0]}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  label: { color: Colors.textMuted, fontWeight: Font.semibold, letterSpacing: 1.4, marginBottom: rh(8) },
  count: { color: Colors.purple2, fontWeight: Font.extrabold, lineHeight: rh(78) },
  found: { color: Colors.textSecondary, marginTop: rh(4) },
  barTrack: { height: rh(6), backgroundColor: Colors.surfaceTint, borderRadius: Radius.full, overflow: 'hidden', marginTop: rh(32) },
  barFill: { height: '100%', backgroundColor: Colors.purple2, borderRadius: Radius.full },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: rw(8), marginTop: rh(16) },
  spinner: { width: rw(18), height: rw(18), borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.purple2, borderTopColor: Colors.transparent },
  statusText: { color: Colors.textMuted },
});
