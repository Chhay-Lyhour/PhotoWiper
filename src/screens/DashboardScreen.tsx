/**
 * DashboardScreen (Stats tab) — full analytics:
 *   • Storage-freed hero
 *   • Totals grid (reviewed / deleted / kept / sessions)
 *   • Keep-vs-delete donut ring (progress indicator)
 *   • MB-freed trend chart with labeled axes + Daily/Weekly toggle (SVG)
 *   • Session analytics (avg per session, best day)
 *   • Recent cleanup sessions → link to History tab
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Path, Line, Circle, Text as SvgText, Defs, LinearGradient, Stop,
} from 'react-native-svg';
import { Font, Radius, rw, rh, rf, type ThemePalette } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import {
  getLifetimeTotals, getDailyStats, getSessionHistory, type LifetimeTotals,
} from '../services/analyticsService';
import type { DailyStats, Session, MainTabParamList } from '../types';

type Nav = BottomTabNavigationProp<MainTabParamList>;

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Point = { label: string; mb: number; key: string };

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Last 7 calendar days as MB-freed points (oldest → newest). */
function buildDailySeries(stats: DailyStats[]): Point[] {
  const map = new Map(stats.map((s) => [s.date, s]));
  const out: Point[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = ymd(d);
    const s = map.get(key);
    out.push({ label: DAY_LABELS[d.getDay()], mb: s ? s.storageSavedBytes / 1_000_000 : 0, key });
  }
  return out;
}

/** Last 6 weeks, summing MB freed per ISO-ish week bucket (oldest → newest). */
function buildWeeklySeries(stats: DailyStats[]): Point[] {
  const today = new Date();
  const out: Point[] = [];
  for (let w = 5; w >= 0; w--) {
    // Window = the 7 days ending (today - w*7).
    const end = new Date(today);
    end.setDate(today.getDate() - w * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const startKey = ymd(start);
    const endKey = ymd(end);
    const mb = stats
      .filter((s) => s.date >= startKey && s.date <= endKey)
      .reduce((sum, s) => sum + s.storageSavedBytes / 1_000_000, 0);
    const label = `${start.getMonth() + 1}/${start.getDate()}`;
    out.push({ label, mb, key: `wk-${endKey}` });
  }
  return out;
}

/** Round a value up to a clean axis maximum (1, 2, 5 × 10ⁿ). */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function fmtMB(mb: number): string {
  if (mb >= 100) return mb.toFixed(0);
  if (mb >= 10) return mb.toFixed(0);
  if (mb >= 1) return mb.toFixed(1);
  return mb.toFixed(2);
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();

  const [totals, setTotals] = useState<LifetimeTotals>({
    totalReviewed: 0, totalDeleted: 0, totalKept: 0, totalSavedBytes: 0, sessionCount: 0,
  });
  const [daily, setDaily] = useState<Point[]>(buildDailySeries([]));
  const [weekly, setWeekly] = useState<Point[]>(buildWeeklySeries([]));
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [bestDay, setBestDay] = useState<DailyStats | null>(null);
  const [recent, setRecent] = useState<Session[]>([]);
  const [range, setRange] = useState<'daily' | 'weekly'>('daily');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [lifetime, last7, last42, sessions] = await Promise.all([
          getLifetimeTotals(),
          getDailyStats(7),
          getDailyStats(42),
          getSessionHistory(3),
        ]);
        if (cancelled) return;
        setTotals(lifetime);
        setDaily(buildDailySeries(last7));
        setWeekly(buildWeeklySeries(last42));
        const todayKey = ymd(new Date());
        setTodayStats(last7.find((s) => s.date === todayKey) ?? null);
        // Best day across the loaded window, ranked by storage freed.
        const best = last42.reduce<DailyStats | null>(
          (acc, s) => (acc === null || s.storageSavedBytes > acc.storageSavedBytes ? s : acc),
          null,
        );
        setBestDay(best && best.storageSavedBytes > 0 ? best : null);
        setRecent(sessions);
      })();
      return () => { cancelled = true; };
    }, []),
  );

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();

  const storageMB = totals.totalSavedBytes / 1_000_000;
  const reviewedToday = todayStats?.reviewed ?? 0;

  const cardW = width - rw(40);
  const series = range === 'daily' ? daily : weekly;

  // ── Derived analytics ──
  const avgPerSession = totals.sessionCount > 0
    ? Math.round(totals.totalReviewed / totals.sessionCount)
    : 0;
  const avgMBPerSession = totals.sessionCount > 0
    ? storageMB / totals.sessionCount
    : 0;
  const keepPct = totals.totalReviewed > 0
    ? Math.round((totals.totalKept / totals.totalReviewed) * 100)
    : 0;

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

      {/* ── Hero storage card ── */}
      <View style={[styles.heroCard, { width: cardW, borderRadius: Radius.xl }]}>
        <Text style={[styles.heroLabel, { fontSize: rf(12) }]}>STORAGE FREED</Text>
        <View style={styles.heroAmountRow}>
          <Text style={[styles.heroAmount, { fontSize: rf(52) }]}>{fmtMB(storageMB)}</Text>
          <Text style={[styles.heroUnit, { fontSize: rf(22) }]}> MB</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="trending-up" size={rf(22)} color={colors.white} style={styles.trendIcon} />
        </View>
        <Text style={[styles.heroSub, { fontSize: rf(14) }]}>
          {reviewedToday} photos reviewed today
        </Text>
      </View>

      {/* ── Totals grid (reviewed / deleted / kept / sessions) ── */}
      <View style={[styles.tileGrid, { width: cardW }]}>
        <StatTile styles={styles} icon="albums-outline" tint={colors.purple2}
          value={totals.totalReviewed} label="REVIEWED" />
        <StatTile styles={styles} icon="trash-outline" tint={colors.delete}
          value={totals.totalDeleted} label="DELETED" />
        <StatTile styles={styles} icon="heart-outline" tint={colors.keep}
          value={totals.totalKept} label="KEPT" />
        <StatTile styles={styles} icon="time-outline" tint={colors.purple3}
          value={totals.sessionCount} label="SESSIONS" />
      </View>

      {/* ── Keep-vs-delete ratio ring ── */}
      <View style={[styles.card, { width: cardW, borderRadius: Radius.xl }]}>
        <Text style={[styles.cardTitle, { fontSize: rf(15) }]}>Keep vs delete</Text>
        <View style={styles.ringRow}>
          <DonutRing
            size={rw(120)}
            kept={totals.totalKept}
            deleted={totals.totalDeleted}
            keepPct={keepPct}
            colors={colors}
            styles={styles}
          />
          <View style={styles.legend}>
            <LegendItem styles={styles} color={colors.keep}
              label="Kept" value={totals.totalKept} />
            <LegendItem styles={styles} color={colors.delete}
              label="Deleted" value={totals.totalDeleted} />
            <LegendItem styles={styles} color={colors.textMuted}
              label="Reviewed" value={totals.totalReviewed} />
          </View>
        </View>
      </View>

      {/* ── MB-freed trend chart ── */}
      <View style={[styles.card, { width: cardW, borderRadius: Radius.xl }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.cardTitle, { fontSize: rf(15) }]}>Storage freed</Text>
          <View style={styles.segmented}>
            {(['daily', 'weekly'] as const).map((r) => {
              const active = r === range;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.segment, active && styles.segmentActive]}
                  activeOpacity={0.7}
                  onPress={() => setRange(r)}
                >
                  <Text style={[styles.segmentText, { fontSize: rf(12) }, active && styles.segmentTextActive]}>
                    {r === 'daily' ? '7 days' : '6 weeks'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <TrendChart series={series} width={cardW - rw(40)} colors={colors} styles={styles} />
      </View>

      {/* ── Session analytics ── */}
      <View style={[styles.card, { width: cardW, borderRadius: Radius.xl }]}>
        <Text style={[styles.cardTitle, { fontSize: rf(15) }]}>Session analytics</Text>
        <View style={styles.analyticsRow}>
          <AnalyticItem styles={styles} icon="images-outline"
            value={`${avgPerSession}`} label="avg photos / session" />
          <View style={styles.analyticsDivider} />
          <AnalyticItem styles={styles} icon="save-outline"
            value={`${fmtMB(avgMBPerSession)} MB`} label="avg freed / session" />
        </View>
        <View style={styles.bestDayRow}>
          <Ionicons name="trophy-outline" size={rf(16)} color={colors.purple3} />
          <Text style={[styles.bestDayText, { fontSize: rf(13) }]}>
            {bestDay
              ? `Best day: ${new Date(bestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${fmtMB(bestDay.storageSavedBytes / 1_000_000)} MB freed`
              : 'No cleanup activity yet'}
          </Text>
        </View>
      </View>

      {/* ── Recent cleanup history ── */}
      <View style={[styles.card, { width: cardW, borderRadius: Radius.xl }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.cardTitle, { fontSize: rf(15) }]}>Recent cleanups</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')} activeOpacity={0.6}>
            <Text style={[styles.linkText, { fontSize: rf(13) }]}>View all</Text>
          </TouchableOpacity>
        </View>
        {recent.length === 0 ? (
          <Text style={[styles.emptyText, { fontSize: rf(14) }]}>No completed sessions yet.</Text>
        ) : (
          recent.map((s, i) => (
            <View key={s.id} style={[styles.histRow, i > 0 && styles.histRowBorder]}>
              <View style={styles.histDot} />
              <Text style={[styles.histDate, { fontSize: rf(14) }]}>
                {new Date(s.completedAt ?? s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={[styles.histMeta, { fontSize: rf(13) }]}>
                {s.deletedCount} deleted · {s.keptCount} kept
              </Text>
              <Text style={[styles.histMB, { fontSize: rf(14) }]}>
                {fmtMB(s.storageSavedBytes / 1_000_000)} MB
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── SVG: trend chart with labeled axes ──────────────────────────────────────

function TrendChart({
  series, width, colors, styles,
}: {
  series: Point[];
  width: number;
  colors: ThemePalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const yGutter = rw(34);
  const chartTop = rh(8);
  const plotH = rh(110);
  const xLabelH = rh(22);
  const svgH = chartTop + plotH + xLabelH;
  const plotLeft = yGutter;
  const plotW = Math.max(width - yGutter, 1);

  const maxRaw = Math.max(...series.map((p) => p.mb), 0);
  const max = niceMax(maxRaw);
  const n = series.length;
  const stepX = n > 1 ? plotW / (n - 1) : plotW / 2;

  const xAt = (i: number) => plotLeft + (n > 1 ? i * stepX : plotW / 2);
  const yAt = (mb: number) => chartTop + plotH - (mb / max) * plotH;

  // Line + area paths.
  const linePts = series.map((p, i) => `${xAt(i)},${yAt(p.mb)}`);
  const linePath = n > 0 ? `M ${linePts.join(' L ')}` : '';
  const areaPath = n > 0
    ? `M ${xAt(0)},${chartTop + plotH} L ${linePts.join(' L ')} L ${xAt(n - 1)},${chartTop + plotH} Z`
    : '';

  const ticks = [0, max / 2, max];

  return (
    <Svg width={width} height={svgH}>
      <Defs>
        <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.purple2} stopOpacity={0.35} />
          <Stop offset="1" stopColor={colors.purple2} stopOpacity={0.02} />
        </LinearGradient>
      </Defs>

      {/* Gridlines + y-axis MB labels */}
      {ticks.map((t, i) => {
        const y = yAt(t);
        return (
          <React.Fragment key={`tick-${i}`}>
            <Line
              x1={plotLeft} y1={y} x2={plotLeft + plotW} y2={y}
              stroke={colors.border} strokeWidth={1} strokeDasharray="3 4"
            />
            <SvgText
              x={plotLeft - rw(6)} y={y + rf(4)}
              fontSize={rf(10)} fill={colors.textMuted} textAnchor="end"
            >
              {fmtMB(t)}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* Area + line */}
      {areaPath ? <Path d={areaPath} fill="url(#areaFill)" /> : null}
      {linePath ? <Path d={linePath} fill="none" stroke={colors.purple3} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" /> : null}

      {/* Point dots + x-axis labels */}
      {series.map((p, i) => (
        <React.Fragment key={p.key}>
          {p.mb > 0 && (
            <Circle cx={xAt(i)} cy={yAt(p.mb)} r={rw(3)} fill={colors.purple3} />
          )}
          <SvgText
            x={xAt(i)} y={chartTop + plotH + rh(15)}
            fontSize={rf(10)} fill={colors.textMuted} textAnchor="middle"
          >
            {p.label}
          </SvgText>
        </React.Fragment>
      ))}

      {/* MB axis caption */}
      <SvgText
        x={plotLeft - rw(6)} y={chartTop - rh(0)}
        fontSize={rf(9)} fill={colors.textMuted} textAnchor="end"
      >
        MB
      </SvgText>
    </Svg>
  );
}

// ─── SVG: keep-vs-delete donut ───────────────────────────────────────────────

function DonutRing({
  size, kept, deleted, keepPct, colors, styles,
}: {
  size: number;
  kept: number;
  deleted: number;
  keepPct: number;
  colors: ThemePalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const stroke = rw(13);
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = kept + deleted;
  const keepFrac = total > 0 ? kept / total : 0;
  const deleteFrac = total > 0 ? deleted / total : 0;

  // Rotate so arcs start at the top (12 o'clock).
  const rotation = `rotate(-90 ${cx} ${cy})`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle cx={cx} cy={cy} r={r} stroke={colors.surfaceTint} strokeWidth={stroke} fill="none" />
        {/* Delete arc (drawn first, behind) */}
        {total > 0 && (
          <Circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={colors.delete} strokeWidth={stroke}
            strokeDasharray={`${deleteFrac * circ} ${circ}`}
            strokeDashoffset={-keepFrac * circ}
            transform={rotation}
            strokeLinecap="butt"
          />
        )}
        {/* Keep arc */}
        {total > 0 && (
          <Circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={colors.keep} strokeWidth={stroke}
            strokeDasharray={`${keepFrac * circ} ${circ}`}
            strokeDashoffset={0}
            transform={rotation}
            strokeLinecap="butt"
          />
        )}
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={[styles.ringPct, { fontSize: rf(26) }]}>{keepPct}%</Text>
        <Text style={[styles.ringPctLabel, { fontSize: rf(11) }]}>kept</Text>
      </View>
    </View>
  );
}

// ─── Small presentational components ─────────────────────────────────────────

type StylesProp = { styles: ReturnType<typeof createStyles> };
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function StatTile({ styles, icon, tint, value, label }: StylesProp & {
  icon: IoniconName; tint: string; value: number; label: string;
}) {
  return (
    <View style={[styles.tile, { borderRadius: Radius.lg }]}>
      <Ionicons name={icon} size={rf(18)} color={tint} />
      <Text style={[styles.tileNum, { fontSize: rf(26), color: tint }]}>{value}</Text>
      <Text style={[styles.tileLabel, { fontSize: rf(10) }]}>{label}</Text>
    </View>
  );
}

function LegendItem({ styles, color, label, value }: StylesProp & {
  color: string; label: string; value: number;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { fontSize: rf(13) }]}>{label}</Text>
      <Text style={[styles.legendValue, { fontSize: rf(13) }]}>{value}</Text>
    </View>
  );
}

function AnalyticItem({ styles, icon, value, label }: StylesProp & {
  icon: IoniconName; value: string; label: string;
}) {
  return (
    <View style={styles.analyticItem}>
      <Ionicons name={icon} size={rf(18)} color={styles._iconColor} />
      <Text style={[styles.analyticValue, { fontSize: rf(20) }]}>{value}</Text>
      <Text style={[styles.analyticLabel, { fontSize: rf(11) }]}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ThemePalette) => {
  const sheet = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { alignItems: 'center', gap: rh(14), paddingHorizontal: rw(20) },

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

    // Totals grid
    tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rw(8) },
    tile: {
      width: '48.5%',
      backgroundColor: colors.surface,
      paddingVertical: rh(16),
      paddingHorizontal: rw(16),
      alignItems: 'flex-start',
      gap: rh(4),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    tileNum: { fontWeight: Font.extrabold },
    tileLabel: { color: colors.textMuted, fontWeight: Font.semibold, letterSpacing: 0.8 },

    // Generic card
    card: {
      backgroundColor: colors.surface,
      padding: rw(20),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    cardTitle: { fontWeight: Font.semibold, color: colors.textPrimary },

    // Ring
    ringRow: { flexDirection: 'row', alignItems: 'center', gap: rw(20), marginTop: rh(14) },
    ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    ringPct: { fontWeight: Font.extrabold, color: colors.textPrimary },
    ringPctLabel: { color: colors.textMuted, fontWeight: Font.medium, marginTop: -rh(2) },
    legend: { flex: 1, gap: rh(10) },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: rw(8) },
    legendDot: { width: rw(10), height: rw(10), borderRadius: rw(5) },
    legendLabel: { flex: 1, color: colors.textSecondary, fontWeight: Font.medium },
    legendValue: { color: colors.textPrimary, fontWeight: Font.bold },

    // Chart
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rh(10) },
    segmented: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceTint,
      borderRadius: Radius.md,
      padding: rw(2),
      gap: rw(2),
    },
    segment: { paddingVertical: rh(5), paddingHorizontal: rw(10), borderRadius: Radius.sm },
    segmentActive: { backgroundColor: colors.purple2 },
    segmentText: { color: colors.textSecondary, fontWeight: Font.medium },
    segmentTextActive: { color: colors.white, fontWeight: Font.semibold },

    // Session analytics
    analyticsRow: { flexDirection: 'row', alignItems: 'center', marginTop: rh(14) },
    analyticItem: { flex: 1, alignItems: 'center', gap: rh(4) },
    analyticValue: { fontWeight: Font.extrabold, color: colors.textPrimary },
    analyticLabel: { color: colors.textMuted, fontWeight: Font.medium, textAlign: 'center' },
    analyticsDivider: { width: 1, height: rh(44), backgroundColor: colors.border },
    bestDayRow: { flexDirection: 'row', alignItems: 'center', gap: rw(6), marginTop: rh(16), paddingTop: rh(14), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    bestDayText: { color: colors.textSecondary, fontWeight: Font.medium, flex: 1 },

    // Recent history
    linkText: { color: colors.purple3, fontWeight: Font.semibold },
    histRow: { flexDirection: 'row', alignItems: 'center', gap: rw(10), paddingVertical: rh(12) },
    histRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    histDot: { width: rw(8), height: rw(8), borderRadius: rw(4), backgroundColor: colors.purple2 },
    histDate: { color: colors.textPrimary, fontWeight: Font.semibold, width: rw(56) },
    histMeta: { flex: 1, color: colors.textSecondary },
    histMB: { color: colors.purple2, fontWeight: Font.bold },
    emptyText: { color: colors.textSecondary, paddingVertical: rh(16), textAlign: 'center' },
  });

  return { ...sheet, _iconColor: colors.purple3 };
};
