/**
 * HistoryScreen — session history list · TOTAL FREED banner
 * Design ref: Image 4
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Font, Radius, rw, rh, rf, type ThemePalette } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { getSessionHistory } from '../services/analyticsService';
import type { Session } from '../types';

function formatDateLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cardW = width - rw(40);

  const [sessions, setSessions] = useState<Session[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const data = await getSessionHistory(50);
        if (!cancelled) setSessions(data);
      })();
      return () => { cancelled = true; };
    }, []),
  );

  const totalMB = sessions.reduce((s, sess) => s + sess.storageSavedBytes / 1_000_000, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + rh(24), paddingBottom: insets.bottom + rh(24) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Page header ── */}
      <Text style={[styles.pageTitle, { fontSize: rf(32) }]}>Session history</Text>
      <Text style={[styles.pageSub, { fontSize: rf(15) }]}>All cleanup sessions</Text>

      {/* ── Total freed banner ── */}
      {sessions.length > 0 && (
        <View style={[styles.totalBanner, { width: cardW, borderRadius: Radius.xl }]}>
          <Text style={[styles.totalLabel, { fontSize: rf(12) }]}>TOTAL FREED</Text>
          <Text style={[styles.totalAmount, { fontSize: rf(36) }]}>
            {totalMB.toFixed(1)} MB
          </Text>
        </View>
      )}

      {/* ── Session cards ── */}
      <View style={styles.cardList}>
        {sessions.length === 0 ? (
          <Text style={[styles.emptyText, { fontSize: rf(14) }]}>
            No completed sessions yet.
          </Text>
        ) : (
          sessions.map((sess) => {
            const reviewed = sess.keptCount + sess.deletedCount;
            const mb = sess.storageSavedBytes / 1_000_000;
            const label = formatDateLabel(sess.completedAt ?? sess.startedAt);
            return (
              <View key={sess.id} style={[styles.sessionCard, { width: cardW, borderRadius: Radius.xl }]}>
                <View style={styles.sessionHeader}>
                  <Text style={[styles.sessionDate, { fontSize: rf(17) }]}>{label}</Text>
                  <Text style={[styles.sessionMB, { fontSize: rf(17) }]}>
                    {mb.toFixed(1)} MB
                  </Text>
                </View>

                <View style={styles.sessionStats}>
                  <View style={styles.sessionStat}>
                    <Text style={[styles.sessionStatNum, { fontSize: rf(24), color: colors.purple2 }]}>
                      {reviewed}
                    </Text>
                    <Text style={[styles.sessionStatLabel, { fontSize: rf(11) }]}>REVIEWED</Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Text style={[styles.sessionStatNum, { fontSize: rf(24), color: colors.delete }]}>
                      {sess.deletedCount}
                    </Text>
                    <Text style={[styles.sessionStatLabel, { fontSize: rf(11) }]}>DELETED</Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Text style={[styles.sessionStatNum, { fontSize: rf(24), color: colors.keep }]}>
                      {sess.keptCount}
                    </Text>
                    <Text style={[styles.sessionStatLabel, { fontSize: rf(11) }]}>KEPT</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

    </ScrollView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { alignItems: 'center', gap: rh(14), paddingHorizontal: rw(20) },

  // Header
  pageTitle: { alignSelf: 'flex-start', fontWeight: Font.bold, color: colors.textPrimary },
  pageSub: { alignSelf: 'flex-start', color: colors.textSecondary, marginBottom: rh(4) },

  // Cards
  cardList: { gap: rh(10), width: '100%', alignItems: 'center' },
  sessionCard: {
    backgroundColor: colors.surface,
    padding: rw(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rh(14),
  },
  sessionDate: { fontWeight: Font.semibold, color: colors.textPrimary },
  sessionMB: { fontWeight: Font.semibold, color: colors.purple2 },

  sessionStats: { flexDirection: 'row', justifyContent: 'space-around' },
  sessionStat: { alignItems: 'center', gap: rh(4) },
  sessionStatNum: { fontWeight: Font.bold },
  sessionStatLabel: { color: colors.textMuted, fontWeight: Font.semibold, letterSpacing: 0.8 },

  // Total banner
  totalBanner: {
    backgroundColor: colors.purple2,
    paddingVertical: rh(20),
    alignItems: 'center',
    gap: rh(4),
    marginTop: rh(4),
  },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: Font.semibold, letterSpacing: 1 },
  totalAmount: { color: colors.white, fontWeight: Font.extrabold },
  emptyText: { color: colors.textSecondary, textAlign: 'center', paddingVertical: rh(24) },
});
