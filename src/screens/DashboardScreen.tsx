/**
 * DashboardScreen (Stats tab) — hero storage card · 3 chips · weekly bar chart
 * Design ref: Image 11
 */
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Font, Radius, rw, rh, rf } from '../constants/theme';

// ── Mock data ─────────────────────────────────────────────────────────────
const MOCK_STATS = { kept: 15, deleted: 9, sessions: 3, storageMB: 37.5, reviewed: 24 };
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CHART_VALS = [0, 12, 8, 0, 37.5, 0, 0]; // MB per day

const today = new Date();
const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const maxVal = Math.max(...CHART_VALS, 1);
  const chartH = rh(80);
  const barW   = (width - rw(40) - rw(60)) / 7 - rw(4); // 7 columns

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + rh(20), paddingBottom: insets.bottom + rh(24) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Date & title ── */}
      <Text style={[styles.dateLabel, { fontSize: rf(13) }]}>TODAY, {dateStr}</Text>
      <Text style={[styles.pageTitle, { fontSize: rf(32) }]}>Your stats</Text>

      {/* ── Hero card ── */}
      <View style={[styles.heroCard, { width: width - rw(40), borderRadius: Radius.xl }]}>
        <Text style={[styles.heroLabel, { fontSize: rf(12) }]}>STORAGE FREED</Text>
        <View style={styles.heroAmountRow}>
          <Text style={[styles.heroAmount, { fontSize: rf(52) }]}>{MOCK_STATS.storageMB}</Text>
          <Text style={[styles.heroUnit, { fontSize: rf(22) }]}> MB</Text>
          <View style={{ flex: 1 }} />
          <Text style={[styles.trendIcon, { fontSize: rf(22) }]}>↗</Text>
        </View>
        <Text style={[styles.heroSub, { fontSize: rf(14) }]}>
          {MOCK_STATS.reviewed} photos reviewed today
        </Text>
      </View>

      {/* ── Three chips ── */}
      <View style={[styles.chipsRow, { width: width - rw(40) }]}>
        <View style={[styles.chip, { borderRadius: Radius.lg }]}>
          <Text style={[styles.chipNum, { fontSize: rf(28), color: Colors.keep }]}>{MOCK_STATS.kept}</Text>
          <Text style={[styles.chipLabel, { fontSize: rf(11) }]}>KEPT</Text>
        </View>
        <View style={[styles.chip, { borderRadius: Radius.lg }]}>
          <Text style={[styles.chipNum, { fontSize: rf(28), color: Colors.delete }]}>{MOCK_STATS.deleted}</Text>
          <Text style={[styles.chipLabel, { fontSize: rf(11) }]}>DELETED</Text>
        </View>
        <View style={[styles.chip, { borderRadius: Radius.lg }]}>
          <Text style={[styles.chipNum, { fontSize: rf(28), color: Colors.purple2 }]}>{MOCK_STATS.sessions}</Text>
          <Text style={[styles.chipLabel, { fontSize: rf(11) }]}>SESSIONS</Text>
        </View>
      </View>

      {/* ── Weekly bar chart ── */}
      <View style={[styles.chartCard, { width: width - rw(40), borderRadius: Radius.xl }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { fontSize: rf(15) }]}>Photos deleted — last 7 days</Text>
          <Text style={[styles.chartUnit, { fontSize: rf(13) }]}>MB</Text>
        </View>

        {/* Bars */}
        <View style={[styles.barsRow, { height: chartH, marginBottom: rh(8) }]}>
          {CHART_VALS.map((val, i) => {
            const barH = val > 0 ? (val / maxVal) * chartH : rh(4);
            const isActive = val > 0;
            return (
              <View key={i} style={[styles.barCol, { width: barW }]}>
                <View style={[
                  styles.bar,
                  {
                    height: barH,
                    backgroundColor: isActive ? Colors.purple2 : Colors.surfaceTint,
                    borderRadius: Radius.sm,
                  },
                ]} />
              </View>
            );
          })}
        </View>

        {/* Day labels */}
        <View style={styles.dayRow}>
          {DAYS.map((d, i) => (
            <View key={i} style={[styles.dayCol, { width: barW }]}>
              <Text style={[styles.dayLabel, { fontSize: rf(12) }]}>{d}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { alignItems: 'center', gap: rh(16), paddingHorizontal: rw(20) },

  // Header
  dateLabel: { alignSelf: 'flex-start', color: Colors.textMuted, fontWeight: Font.medium, letterSpacing: 0.5 },
  pageTitle: { alignSelf: 'flex-start', fontWeight: Font.bold, color: Colors.textPrimary, marginBottom: rh(4) },

  // Hero card
  heroCard: {
    backgroundColor: Colors.purple2,
    padding: rw(24),
    shadowColor: Colors.purple3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: Font.semibold, letterSpacing: 1, marginBottom: rh(4) },
  heroAmountRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroAmount: { color: Colors.white, fontWeight: Font.extrabold, lineHeight: rh(58) },
  heroUnit: { color: 'rgba(255,255,255,0.85)', fontWeight: Font.semibold, marginBottom: rh(6) },
  trendIcon: { color: Colors.white, alignSelf: 'center' },
  heroSub: { color: 'rgba(255,255,255,0.7)', marginTop: rh(6) },

  // Chips
  chipsRow: { flexDirection: 'row', gap: rw(8) },
  chip: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: rh(16),
    alignItems: 'center',
    gap: rh(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  chipNum: { fontWeight: Font.extrabold },
  chipLabel: { color: Colors.textMuted, fontWeight: Font.semibold, letterSpacing: 0.8 },

  // Chart card
  chartCard: {
    backgroundColor: Colors.surface,
    padding: rw(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rh(20) },
  chartTitle: { fontWeight: Font.semibold, color: Colors.textPrimary },
  chartUnit: { color: Colors.textMuted },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: rw(4) },
  barCol: { alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '100%' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', gap: rw(4) },
  dayCol: { alignItems: 'center' },
  dayLabel: { color: Colors.textMuted, fontWeight: Font.medium },
});
