/**
 * AllDoneScreen — celebration · storage freed hero · deleted/kept chips · View Stats
 * Design ref: Image 1
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { Colors, Font, Radius, rw, rh, rf } from '../constants/theme';

type Props = StackScreenProps<RootStackParamList, 'AllDone'>;

export default function AllDoneScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { stats } = route.params;

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 100 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const storageMB = (stats.storageSavedBytes / 1_000_000).toFixed(1);
  const handleViewStats = () => navigation.replace('MainTabs', { screen: 'Stats' });

  return (
    <View style={[styles.container, { paddingTop: insets.top + rh(20), paddingBottom: insets.bottom + rh(16) }]}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        {/* Confetti + icon */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <View style={[styles.iconCircle, { width: rw(120), height: rw(120), borderRadius: rw(60) }]}>
            <Text style={[styles.iconGlyph, { fontSize: rf(52) }]}>✦</Text>
          </View>
          <Text style={styles.confetti}>🎉</Text>
        </Animated.View>

        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { fontSize: rf(36) }]}>All done!</Text>
          <Text style={[styles.titleEmoji, { fontSize: rf(30) }]}>🐾</Text>
        </View>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { fontSize: rf(16), maxWidth: width * 0.72 }]}>
          You reviewed all {stats.totalReviewed} photos. Your gallery is a little lighter now.
        </Text>

        {/* Storage freed hero card */}
        <View style={[styles.heroCard, { width: width - rw(40), borderRadius: Radius.xl }]}>
          <View style={styles.heroRow}>
            <Text style={[styles.heroLabel, { fontSize: rf(12) }]}>💾  STORAGE FREED</Text>
          </View>
          <View style={styles.heroAmountRow}>
            <Text style={[styles.heroAmount, { fontSize: rf(56) }]}>{storageMB}</Text>
            <Text style={[styles.heroUnit, { fontSize: rf(22) }]}> MB</Text>
          </View>
        </View>

        {/* Stats chips */}
        <View style={[styles.chipsRow, { width: width - rw(40) }]}>
          {/* Deleted */}
          <View style={[styles.chip, { flex: 1, borderRadius: Radius.xl }]}>
            <View style={[styles.chipIcon, { width: rw(40), height: rw(40), borderRadius: Radius.full, backgroundColor: '#FEE2E2' }]}>
              <Text style={{ fontSize: rf(18) }}>🗑</Text>
            </View>
            <Text style={[styles.chipNum, { fontSize: rf(32), color: Colors.delete }]}>
              {stats.totalDeleted}
            </Text>
            <Text style={[styles.chipLabel, { fontSize: rf(12) }]}>DELETED</Text>
          </View>

          {/* Kept */}
          <View style={[styles.chip, { flex: 1, borderRadius: Radius.xl }]}>
            <View style={[styles.chipIcon, { width: rw(40), height: rw(40), borderRadius: Radius.full, backgroundColor: '#DCFCE7' }]}>
              <Text style={{ fontSize: rf(18) }}>♥</Text>
            </View>
            <Text style={[styles.chipNum, { fontSize: rf(32), color: Colors.keep }]}>
              {stats.totalKept}
            </Text>
            <Text style={[styles.chipLabel, { fontSize: rf(12) }]}>KEPT</Text>
          </View>
        </View>

        {/* Nudge text */}
        <Text style={[styles.nudge, { fontSize: rf(14) }]}>
          Come back tomorrow to keep it tidy ✨
        </Text>

        <View style={{ flex: 1 }} />

        {/* View Stats button */}
        <TouchableOpacity
          style={[styles.viewStatsBtn, { width: width - rw(40), borderRadius: Radius.full }]}
          onPress={handleViewStats}
          activeOpacity={0.85}
        >
          <Text style={[styles.viewStatsBtnIcon, { fontSize: rf(18) }]}>▦</Text>
          <Text style={[styles.viewStatsBtnText, { fontSize: rf(17) }]}>View Stats</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { flex: 1, alignItems: 'center', paddingHorizontal: rw(20), gap: rh(16) },

  // Icon
  iconCircle: {
    backgroundColor: Colors.purple2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.purple3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  iconGlyph: { color: Colors.white, fontWeight: Font.bold },
  confetti: {
    position: 'absolute',
    top: -rh(10),
    right: -rw(10),
    fontSize: rf(30),
  },

  // Title
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: rw(6) },
  title: { fontWeight: Font.extrabold, color: Colors.textPrimary },
  titleEmoji: {},

  // Subtitle
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: rh(24),
  },

  // Hero card
  heroCard: {
    backgroundColor: Colors.purple2,
    paddingVertical: rh(20),
    paddingHorizontal: rw(24),
    alignItems: 'center',
  },
  heroRow: { marginBottom: rh(4) },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontWeight: Font.semibold, letterSpacing: 1 },
  heroAmountRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroAmount: { color: Colors.white, fontWeight: Font.extrabold, lineHeight: rh(64) },
  heroUnit: { color: 'rgba(255,255,255,0.85)', fontWeight: Font.semibold, marginBottom: rh(6) },

  // Chips
  chipsRow: { flexDirection: 'row', gap: rw(12) },
  chip: {
    backgroundColor: Colors.surface,
    padding: rw(20),
    alignItems: 'center',
    gap: rh(6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chipIcon: { alignItems: 'center', justifyContent: 'center' },
  chipNum: { fontWeight: Font.extrabold, lineHeight: rh(38) },
  chipLabel: { color: Colors.textMuted, fontWeight: Font.semibold, letterSpacing: 0.8 },

  // Nudge
  nudge: { color: Colors.textSecondary },

  // Button
  viewStatsBtn: {
    backgroundColor: Colors.purple2,
    paddingVertical: rh(18),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rw(8),
  },
  viewStatsBtnIcon: { color: Colors.white },
  viewStatsBtnText: { color: Colors.white, fontWeight: Font.semibold },
});
