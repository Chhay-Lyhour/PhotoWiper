/**
 * SettingsScreen — settings rows (Notifications, Privacy, Rate, Help) · version footer
 * Design ref: Image 9
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Font, Radius, rw, rh, rf } from '../constants/theme';
import { useStore } from '../store/useStore';

type SettingRow = {
  icon: string;
  label: string;
  type: 'arrow' | 'toggle';
  key?: 'hapticsEnabled';
};

const ROWS: SettingRow[] = [
  { icon: '🔔', label: 'Notifications',   type: 'arrow' },
  { icon: '🛡', label: 'Privacy',          type: 'arrow' },
  { icon: '⭐', label: 'Rate PhotoSwipe',  type: 'arrow' },
  { icon: '❓', label: 'Help & support',   type: 'arrow' },
];

const TOGGLE_ROWS: SettingRow[] = [
  { icon: '📳', label: 'Haptic feedback', type: 'toggle', key: 'hapticsEnabled' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { settings, updateSettings } = useStore();

  const cardW = width - rw(40);

  const handleToggle = (key: 'hapticsEnabled', val: boolean) => {
    updateSettings({ [key]: val });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + rh(24), paddingBottom: insets.bottom + rh(24) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Title ── */}
      <Text style={[styles.pageTitle, { fontSize: rf(32) }]}>Settings</Text>

      {/* ── Toggle rows ── */}
      <View style={[styles.card, { width: cardW, borderRadius: Radius.xl }]}>
        {TOGGLE_ROWS.map((row, i) => (
          <View key={i} style={[styles.row, i > 0 && styles.rowDivider]}>
            <View style={[styles.iconBox, { width: rw(40), height: rw(40), borderRadius: Radius.md }]}>
              <Text style={[styles.rowIcon, { fontSize: rf(18) }]}>{row.icon}</Text>
            </View>
            <Text style={[styles.rowLabel, { fontSize: rf(16) }]}>{row.label}</Text>
            <Switch
              value={settings[row.key!]}
              onValueChange={(val) => handleToggle(row.key!, val)}
              trackColor={{ false: Colors.border, true: Colors.purple2 }}
              thumbColor={Colors.white}
            />
          </View>
        ))}
      </View>

      {/* ── Arrow rows ── */}
      <View style={[styles.card, { width: cardW, borderRadius: Radius.xl }]}>
        {ROWS.map((row, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.row, i > 0 && styles.rowDivider]}
            activeOpacity={0.6}
          >
            <View style={[styles.iconBox, { width: rw(40), height: rw(40), borderRadius: Radius.md }]}>
              <Text style={[styles.rowIcon, { fontSize: rf(18) }]}>{row.icon}</Text>
            </View>
            <Text style={[styles.rowLabel, { fontSize: rf(16) }]}>{row.label}</Text>
            <Text style={[styles.chevron, { fontSize: rf(16) }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Version footer ── */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { fontSize: rf(13) }]}>
          PhotoSwipe v1.0 · Made with 💜
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content:   { alignItems: 'center', gap: rh(16), paddingHorizontal: rw(20) },

  // Title
  pageTitle: { alignSelf: 'flex-start', fontWeight: Font.bold, color: Colors.textPrimary, marginBottom: rh(4) },

  // Cards
  card: {
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rw(16),
    paddingVertical: rh(14),
    gap: rw(14),
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  iconBox: {
    backgroundColor: Colors.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIcon: {},
  rowLabel: {
    flex: 1,
    color: Colors.textPrimary,
    fontWeight: Font.medium,
  },
  chevron: {
    color: Colors.textMuted,
    fontWeight: Font.semibold,
  },

  // Footer
  footer: {
    marginTop: rh(16),
    alignItems: 'center',
    paddingTop: rh(12),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    width: '100%',
  },
  footerText: { color: Colors.textMuted },
});
