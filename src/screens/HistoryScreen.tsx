/**
 * HistoryScreen — session history list · TOTAL FREED banner
 * Design ref: Image 4
 */
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Font, Radius, rw, rh, rf } from '../constants/theme';

// ── Mock past sessions ────────────────────────────────────────────────────
const MOCK_SESSIONS = [
  { label: 'Today',        storageMB: 37.5, reviewed: 24,  deleted: 9,  kept: 15 },
  { label: 'May 22, 2026', storageMB: 24.3, reviewed: 147, deleted: 6,  kept: 141 },
  { label: 'May 21, 2026', storageMB: 18.1, reviewed: 93,  deleted: 12, kept: 81 },
  { label: 'May 20, 2026', storageMB: 5.7,  reviewed: 44,  deleted: 3,  kept: 41 },
];

const TOTAL_MB = MOCK_SESSIONS.reduce((s, sess) => s + sess.storageMB, 0);

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = width - rw(40);

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
      <Text style={[styles.pageSub,   { fontSize: rf(15) }]}>All cleanup sessions</Text>

      {/* ── Session cards ── */}
      <View style={styles.cardList}>
        {MOCK_SESSIONS.map((sess, i) => (
          <View key={i} style={[styles.sessionCard, { width: cardW, borderRadius: Radius.xl }]}>
            {/* Row: date label + MB badge */}
            <View style={styles.sessionHeader}>
              <Text style={[styles.sessionDate, { fontSize: rf(17) }]}>{sess.label}</Text>
              <Text style={[styles.sessionMB, { fontSize: rf(17) }]}>
                {sess.storageMB} MB
              </Text>
            </View>

            {/* Stats row */}
            <View style={styles.sessionStats}>
              <View style={styles.sessionStat}>
                <Text style={[styles.sessionStatNum, { fontSize: rf(24), color: Colors.purple2 }]}>
                  {sess.reviewed}
                </Text>
                <Text style={[styles.sessionStatLabel, { fontSize: rf(11) }]}>REVIEWED</Text>
              </View>
              <View style={styles.sessionStat}>
                <Text style={[styles.sessionStatNum, { fontSize: rf(24), color: Colors.delete }]}>
                  {sess.deleted}
                </Text>
                <Text style={[styles.sessionStatLabel, { fontSize: rf(11) }]}>DELETED</Text>
              </View>
              <View style={styles.sessionStat}>
                <Text style={[styles.sessionStatNum, { fontSize: rf(24), color: Colors.keep }]}>
                  {sess.kept}
                </Text>
                <Text style={[styles.sessionStatLabel, { fontSize: rf(11) }]}>KEPT</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* ── Total freed banner ── */}
      <View style={[styles.totalBanner, { width: cardW, borderRadius: Radius.xl }]}>
        <Text style={[styles.totalLabel, { fontSize: rf(12) }]}>TOTAL FREED</Text>
        <Text style={[styles.totalAmount, { fontSize: rf(36) }]}>
          {TOTAL_MB.toFixed(1)} MB
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { alignItems: 'center', gap: rh(14), paddingHorizontal: rw(20) },

  // Header
  pageTitle: { alignSelf: 'flex-start', fontWeight: Font.bold, color: Colors.textPrimary },
  pageSub:   { alignSelf: 'flex-start', color: Colors.textSecondary, marginBottom: rh(4) },

  // Cards
  cardList: { gap: rh(10), width: '100%', alignItems: 'center' },
  sessionCard: {
    backgroundColor: Colors.surface,
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
  sessionDate: { fontWeight: Font.semibold, color: Colors.textPrimary },
  sessionMB:   { fontWeight: Font.semibold, color: Colors.purple2 },

  sessionStats: { flexDirection: 'row', justifyContent: 'space-around' },
  sessionStat:  { alignItems: 'center', gap: rh(4) },
  sessionStatNum: { fontWeight: Font.bold },
  sessionStatLabel: { color: Colors.textMuted, fontWeight: Font.semibold, letterSpacing: 0.8 },

  // Total banner
  totalBanner: {
    backgroundColor: Colors.purple2,
    paddingVertical: rh(20),
    alignItems: 'center',
    gap: rh(4),
    marginTop: rh(4),
  },
  totalLabel:  { color: 'rgba(255,255,255,0.7)', fontWeight: Font.semibold, letterSpacing: 1 },
  totalAmount: { color: Colors.white, fontWeight: Font.extrabold },
});
