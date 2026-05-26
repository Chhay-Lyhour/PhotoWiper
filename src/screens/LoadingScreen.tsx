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

type Props = StackScreenProps<RootStackParamList, 'Loading'>;

const STATUS_STEPS = ['Scanning your gallery…', 'Shuffling your gallery…', 'Almost ready…'];
const MOCK_TOTAL = 2660;

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
    const store = useStore.getState();
    store.setLoadingCount(0);
    store.setLoadingStatus(STATUS_STEPS[0]);
    store.setLoadingProgress(0);

    let step = 0;
    let count = 0;

    const countTimer = setInterval(() => {
      count = Math.min(count + Math.floor(Math.random() * 140 + 60), MOCK_TOTAL);
      store.setLoadingCount(count);
      if (count >= MOCK_TOTAL) clearInterval(countTimer);
    }, 70);

    const progressTimer = setInterval(() => {
      step++;
      const p = Math.min(step / 20, 1);
      store.setLoadingProgress(p);
      Animated.timing(barAnim, { toValue: p, duration: 250, useNativeDriver: false }).start();
      if (step === 6) store.setLoadingStatus(STATUS_STEPS[1]);
      if (step === 14) store.setLoadingStatus(STATUS_STEPS[2]);
      if (p >= 1) {
        clearInterval(progressTimer);
        clearInterval(countTimer);
        setTimeout(() => navigation.replace('MainTabs'), 500);
      }
    }, 250);

    return () => { clearInterval(countTimer); clearInterval(progressTimer); };
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
