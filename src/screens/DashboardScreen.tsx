/**
 * DashboardScreen (Stats tab) — hero storage card · 3 chips · weekly bar chart
 * Design ref: Image 11
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Font, Radius, rw, rh, rf, type ThemePalette } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { getLifetimeTotals, getDailyStats, type LifetimeTotals } from '../services/analyticsService';
import type { DailyStats } from '../types';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildWeekSeries(stats: DailyStats[]): { day: string; mb: number; date: string }[] {
  const map = new Map(stats.map((s) => [s.date, s]));
  const out: { day: string; mb: number; date: string }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = ymd(d);
    const s = map.get(key);
    out.push({
      day: DAY_LABELS[d.getDay()],
      mb: s ? s.storageSavedBytes / 1_000_000 : 0,
      date: key,
    });
  }
  return out;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [totals, setTotals] = useState<LifetimeTotals>({
    totalReviewed: 0, totalDeleted: 0, totalKept: 0, totalSavedBytes: 0, sessionCount: 0,
  });
  const [week, setWeek] = useState<{ day: string; mb: number; date: string }[]>(buildWeekSeries([]));
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [lifetime, daily] = await Promise.all([
          getLifetimeTotals(),
          getDailyStats(7),
        ]);
        if (cancelled) return;
        setTotals(lifetime);
        setWeek(buildWeekSeries(daily));
        const todayKey = ymd(new Date());
        setTodayStats(daily.find((s) => s.date === todayKey) ?? null);
      })();
      return () => { cancelled = true; };
    }, []),
  );

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();

  const chartVals = week.map((w) => w.mb);
  const maxVal = Math.max(...chartVals, 1);
  const chartH = rh(80);
  const barW   = (width - rw(40) - rw(60)) / 7 - rw(4);

  const storageMB = (totals.totalSavedBytes / 1_000_000).toFixed(1);
  const reviewedToday = todayStats?.reviewed ?? 0;

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
          <Text style={[styles.heroAmount, { fontSize: rf(52) }]}>{storageMB}</Text>
          <Text style={[styles.heroUnit, { fontSize: rf(22) }]}> MB</Text>
          <View style={{ flex: 1 }} />
          <Text style={[styles.trendIcon, { fontSize: rf(22) }]}>↗</Text>
        </View>
        <Text style={[styles.heroSub, { fontSize: rf(14) }]}>
          {reviewedToday} photos reviewed today
        </Text>
      </View>

      {/* ── Three chips ── */}
      <View style={[styles.chipsRow, { width: width - rw(40) }]}>
        <View style={[styles.chip, { borderRadius: Radius.lg }]}>
          <Text style={[styles.chipNum, { fontSize: rf(28), color: colors.keep }]}>{totals.totalKept}</Text>
          <Text style={[styles.chipLabel, { fontSize: rf(11) }]}>KEPT</Text>
        </View>
        <View style={[styles.chip, { borderRadius: Radius.lg }]}>
          <Text style={[styles.chipNum, { fontSize: rf(28), color: colors.delete }]}>{totals.totalDeleted}</Text>
          <Text style={[styles.chipLabel, { fontSize: rf(11) }]}>DELETED</Text>
        </View>
        <View style={[styles.chip, { borderRadius: Radius.lg }]}>
          <Text style={[styles.chipNum, { fontSize: rf(28), color: colors.purple2 }]}>{totals.sessionCount}</Text>
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
          {week.map((w) => {
            const barH = w.mb > 0 ? (w.mb / maxVal) * chartH : rh(4);
            const isActive = w.mb > 0;
            return (
              <View key={w.date} style={[styles.barCol, { width: barW }]}>
                <View style={[
                  styles.bar,
                  {
                    height: barH,
                    backgroundColor: isActive ? colors.purple2 : colors.surfaceTint,
                    borderRadius: Radius.sm,
                  },
                ]} />
              </View>
            );
          })}
        </View>

        {/* Day labels */}
        <View style={styles.dayRow}>
          {week.map((w) => (
            <View key={w.date} style={[styles.dayCol, { width: barW }]}>
              <Text style={[styles.dayLabel, { fontSize: rf(12) }]}>{w.day}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { alignItems: 'center', gap: rh(16), paddingHorizontal: rw(20) },

  // Header
  dateLabel: { alignSelf: 'flex-start', color: colors.textMuted, fontWeight: Font.medium, letterSpacing: 0.5 },
  pageTitle: { alignSelf: 'flex-start', fontWeight: Font.bold, color: colors.textPrimary, marginBottom: rh(4) },

  // Hero card
  heroCard: {
    backgroundColor: colors.purple2,
    padding: rw(24),
    shadowColor: colors.purple3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: Font.semibold, letterSpacing: 1, marginBottom: rh(4) },
  heroAmountRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroAmount: { color: colors.white, fontWeight: Font.extrabold, lineHeight: rh(58) },
  heroUnit: { color: 'rgba(255,255,255,0.85)', fontWeight: Font.semibold, marginBottom: rh(6) },
  trendIcon: { color: colors.white, alignSelf: 'center' },
  heroSub: { color: 'rgba(255,255,255,0.7)', marginTop: rh(6) },

  // Chips
  chipsRow: { flexDirection: 'row', gap: rw(8) },
  chip: {
    flex: 1,
    backgroundColor: colors.surface,
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
  chipLabel: { color: colors.textMuted, fontWeight: Font.semibold, letterSpacing: 0.8 },

  // Chart card
  chartCard: {
    backgroundColor: colors.surface,
    padding: rw(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rh(20) },
  chartTitle: { fontWeight: Font.semibold, color: colors.textPrimary },
  chartUnit: { color: colors.textMuted },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: rw(4) },
  barCol: { alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '100%' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', gap: rw(4) },
  dayCol: { alignItems: 'center' },
  dayLabel: { color: colors.textMuted, fontWeight: Font.medium },
});
