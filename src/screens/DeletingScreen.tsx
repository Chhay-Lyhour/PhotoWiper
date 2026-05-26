/**
 * DeletingScreen — trash icon · progress bar · "X of Y deleted"
 * Design ref: Image 3
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { Colors, Font, Radius, rw, rh, rf } from '../constants/theme';

type Props = StackScreenProps<RootStackParamList, 'Deleting'>;

const MOCK_TOTAL = 9;

export default function DeletingScreen({ navigation }: Props) {
  const insets  = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const barAnim     = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const currentRef  = useRef(0);
  const [current, setCurrent] = React.useState(0);

  // Pulse the icon
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  // Simulate deletion progress
  useEffect(() => {
    const timer = setInterval(() => {
      currentRef.current += 1;
      const n = currentRef.current;
      setCurrent(n);
      Animated.timing(barAnim, {
        toValue: n / MOCK_TOTAL,
        duration: 300,
        useNativeDriver: false,
      }).start();

      if (n >= MOCK_TOTAL) {
        clearInterval(timer);
        setTimeout(() => {
          navigation.replace('AllDone', {
            stats: {
              totalReviewed: 24,
              totalKept: 15,
              totalDeleted: MOCK_TOTAL,
              storageSavedBytes: 37.5 * 1_000_000,
              sessionDurationMs: 180_000,
            },
          });
        }, 600);
      }
    }, 400);
    return () => clearInterval(timer);
  }, []);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const barTrackW = width - rw(80);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Trash icon with pulse */}
      <Animated.View
        style={[
          styles.iconCircle,
          { width: rw(120), height: rw(120), borderRadius: rw(60), transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Text style={[styles.iconGlyph, { fontSize: rf(52) }]}>🗑</Text>
      </Animated.View>

      {/* Texts */}
      <Text style={[styles.title, { fontSize: rf(28) }]}>Deleting photos…</Text>
      <Text style={[styles.subtitle, { fontSize: rf(16) }]}>
        Permanently removing {MOCK_TOTAL} photos from your device
      </Text>

      {/* Progress bar */}
      <View style={[styles.barTrack, { width: barTrackW, marginTop: rh(32) }]}>
        <Animated.View style={[styles.barFill, { width: barWidth }]} />
      </View>

      {/* Counter */}
      <Text style={[styles.counter, { fontSize: rf(16) }]}>
        {current} of {MOCK_TOTAL} deleted
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rh(16),
  },
  iconCircle: {
    backgroundColor: Colors.purple2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rh(8),
    shadowColor: Colors.purple3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  iconGlyph: {},
  title: { fontWeight: Font.bold, color: Colors.textPrimary },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: rw(40),
    lineHeight: rh(24),
  },
  barTrack: {
    height: rh(6),
    backgroundColor: Colors.surfaceTint,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.purple2,
    borderRadius: Radius.full,
  },
  counter: {
    color: Colors.purple3,
    fontWeight: Font.semibold,
  },
});
