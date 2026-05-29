/**
 * SettingsScreen — sectioned settings.
 *
 * Sections:
 *   Appearance — theme picker, reduce motion
 *   Feedback   — master haptics toggle, strength picker
 *   Swipe      — sensitivity, invert direction, confirm-before-delete
 *   Sync & Data — sync status row (wired in Step 8)
 *   About      — rate / help / privacy stubs
 */
import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, useWindowDimensions, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, CommonActions, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Font, Radius, rw, rh, rf, type ThemePalette } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { useStore } from '../store/useStore';
import { haptics } from '../services/hapticsService';
import { getSyncStatus, syncAll, type SyncStatus } from '../services/syncService';
import { resetDatabase } from '../services/databaseService';
import type {
  ThemeMode, HapticStrength, SwipeSensitivity, AppSettings, RootStackParamList,
} from '../types';

type Nav = StackNavigationProp<RootStackParamList>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function formatRelative(ts: number | null): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

type Option<T extends string> = { value: T; label: string };

const THEME_OPTIONS: Option<ThemeMode>[] = [
  { value: 'system', label: 'System' },
  { value: 'light',  label: 'Light' },
  { value: 'dark',   label: 'Dark' },
];

const HAPTIC_OPTIONS: Option<HapticStrength>[] = [
  { value: 'subtle', label: 'Subtle' },
  { value: 'medium', label: 'Medium' },
  { value: 'strong', label: 'Strong' },
];

const SENSITIVITY_OPTIONS: Option<SwipeSensitivity>[] = [
  { value: 'easy',   label: 'Easy' },
  { value: 'normal', label: 'Normal' },
  { value: 'firm',   label: 'Firm' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const navigation = useNavigation<Nav>();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ pendingCount: 0, lastSyncedAt: null });
  const [syncing, setSyncing] = useState(false);

  const refreshSyncStatus = useCallback(async () => {
    try {
      setSyncStatus(await getSyncStatus());
    } catch (e) {
      console.warn('[settings] getSyncStatus failed:', e);
    }
  }, []);

  // Refresh sync status whenever the user returns to the Settings tab — keeps
  // the row up to date after a session completes elsewhere in the app.
  useFocusEffect(useCallback(() => { refreshSyncStatus(); }, [refreshSyncStatus]));

  const handleSyncNow = useCallback(async () => {
    if (syncing) return;
    haptics.buttonTap();
    setSyncing(true);
    try {
      await syncAll();
      await refreshSyncStatus();
    } finally {
      setSyncing(false);
    }
  }, [syncing, refreshSyncStatus]);

  const handleClearData = useCallback(() => {
    haptics.buttonTap();
    Alert.alert(
      'Clear all local data?',
      'This wipes your photo index, swipe history, and stats on this device. Your actual photos are NOT touched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear data',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabase();
              navigation.dispatch(
                CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }),
              );
            } catch (e) {
              console.warn('[settings] resetDatabase failed:', e);
              Alert.alert('Could not clear data', (e as Error).message);
            }
          },
        },
      ],
    );
  }, [navigation]);

  const cardW = width - rw(40);

  // Wrap every setter so the user gets a tick when they tap an option, and so
  // logic is centralised if we ever want to log changes.
  const setSetting = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    haptics.selection();
    updateSettings({ [key]: val } as Partial<AppSettings>);
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
      <Text style={[styles.pageTitle, { fontSize: rf(32) }]}>Settings</Text>

      {/* ── Appearance ── */}
      <SectionTitle styles={styles}>Appearance</SectionTitle>
      <View style={[styles.card, { width: cardW, borderRadius: Radius.xl }]}>
        <PickerRow
          styles={styles}
          icon="color-palette-outline"
          label="Theme"
          value={settings.theme}
          options={THEME_OPTIONS}
          onChange={(v) => setSetting('theme', v)}
        />
        <ToggleRow
          styles={styles}
          icon="pulse-outline"
          label="Reduce motion"
          value={settings.reduceMotion}
          onChange={(v) => setSetting('reduceMotion', v)}
        />
      </View>

      {/* ── Feedback ── */}
      <SectionTitle styles={styles}>Feedback</SectionTitle>
      <View style={[styles.card, { width: cardW, borderRadius: Radius.xl }]}>
        <ToggleRow
          styles={styles}
          icon="phone-portrait-outline"
          label="Haptic feedback"
          value={settings.hapticsEnabled}
          onChange={(v) => setSetting('hapticsEnabled', v)}
        />
        {settings.hapticsEnabled && (
          <PickerRow
            styles={styles}
            icon="cellular-outline"
            label="Strength"
            value={settings.hapticStrength}
            options={HAPTIC_OPTIONS}
            onChange={(v) => {
              setSetting('hapticStrength', v);
              // Preview the new strength immediately.
              haptics.buttonTap();
            }}
          />
        )}
      </View>

      {/* ── Swipe ── */}
      <SectionTitle styles={styles}>Swipe</SectionTitle>
      <View style={[styles.card, { width: cardW, borderRadius: Radius.xl }]}>
        <PickerRow
          styles={styles}
          icon="finger-print-outline"
          label="Sensitivity"
          value={settings.swipeSensitivity}
          options={SENSITIVITY_OPTIONS}
          onChange={(v) => setSetting('swipeSensitivity', v)}
        />
        <ToggleRow
          styles={styles}
          icon="swap-horizontal-outline"
          label="Invert directions"
          value={settings.invertSwipe}
          onChange={(v) => setSetting('invertSwipe', v)}
        />
        <ToggleRow
          styles={styles}
          icon="warning-outline"
          label="Confirm before delete"
          value={settings.confirmDelete}
          onChange={(v) => setSetting('confirmDelete', v)}
        />
      </View>

      {/* ── Sync & Data ── */}
      <SectionTitle styles={styles}>Sync &amp; Data</SectionTitle>
      <View style={[styles.card, { width: cardW, borderRadius: Radius.xl }]}>
        <View style={styles.row}>
          <IconBox styles={styles} icon="cloud-outline" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { fontSize: rf(16) }]}>Sync status</Text>
            <Text style={[styles.rowSubLabel, { fontSize: rf(13) }]}>
              {syncStatus.pendingCount > 0
                ? `${syncStatus.pendingCount} pending · last sync ${formatRelative(syncStatus.lastSyncedAt)}`
                : `All synced · ${formatRelative(syncStatus.lastSyncedAt)}`}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.6}
          onPress={handleSyncNow}
          disabled={syncing}
        >
          <IconBox styles={styles} icon="sync-outline" />
          <Text style={[styles.rowLabel, { fontSize: rf(16) }]}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </Text>
          {syncing ? (
            <ActivityIndicator color={colors.purple2} />
          ) : (
            <Ionicons name="chevron-forward" size={rf(16)} color={colors.textMuted} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.6}
          onPress={handleClearData}
        >
          <IconBox styles={styles} icon="trash-outline" color={colors.delete} />
          <Text style={[styles.rowLabel, { fontSize: rf(16), color: colors.delete }]}>
            Clear local data
          </Text>
          <Ionicons name="chevron-forward" size={rf(16)} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── About ── */}
      <SectionTitle styles={styles}>About</SectionTitle>
      <View style={[styles.card, { width: cardW, borderRadius: Radius.xl }]}>
        <ArrowRow styles={styles} icon="star-outline" label="Rate PhotoSwipe" />
        <ArrowRow styles={styles} icon="help-circle-outline" label="Help & support" />
        <ArrowRow styles={styles} icon="shield-checkmark-outline" label="Privacy" />
      </View>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { fontSize: rf(13) }]}>
            PhotoSwipe v1.0 · Made with
          </Text>
          <Ionicons name="heart" size={rf(13)} color={colors.purple3} />
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Row components ─────────────────────────────────────────────────────────
// Each takes the resolved `styles` so the theme is applied consistently
// without needing to re-call useTheme inside every row.

type StylesProp = { styles: ReturnType<typeof createStyles> };

function SectionTitle({ styles, children }: StylesProp & { children: React.ReactNode }) {
  return (
    <Text style={[styles.sectionTitle, { fontSize: rf(12) }]}>
      {String(children).toUpperCase()}
    </Text>
  );
}

function IconBox({ styles, icon, color }: StylesProp & { icon: IoniconName; color?: string }) {
  return (
    <View style={[styles.iconBox, { width: rw(36), height: rw(36), borderRadius: Radius.md }]}>
      <Ionicons name={icon} size={rf(18)} color={color ?? styles._iconColor} />
    </View>
  );
}

function ToggleRow({
  styles, icon, label, value, onChange,
}: StylesProp & {
  icon: IoniconName;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <IconBox styles={styles} icon={icon} />
      <Text style={[styles.rowLabel, { fontSize: rf(16) }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: styles._toggleTrackOff, true: styles._toggleTrackOn }}
        thumbColor={styles._toggleThumb}
      />
    </View>
  );
}

function PickerRow<T extends string>({
  styles, icon, label, value, options, onChange,
}: StylesProp & {
  icon: IoniconName;
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={[styles.row, styles.rowColumn]}>
      <View style={styles.rowTop}>
        <IconBox styles={styles} icon={icon} />
        <Text style={[styles.rowLabel, { fontSize: rf(16) }]}>{label}</Text>
      </View>
      <View style={styles.segmented}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segment, active && styles.segmentActive]}
              activeOpacity={0.7}
              onPress={() => onChange(opt.value)}
            >
              <Text
                style={[styles.segmentText, { fontSize: rf(13) }, active && styles.segmentTextActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ArrowRow({ styles, icon, label }: StylesProp & { icon: IoniconName; label: string }) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={haptics.selection}>
      <IconBox styles={styles} icon={icon} />
      <Text style={[styles.rowLabel, { fontSize: rf(16) }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={rf(16)} color={styles._chevronColor} />
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
// We stash the Switch's three color values on the styles object too (with `_`
// prefix so they're clearly not style rules), so PickerRow/ToggleRow don't
// need to re-call useTheme themselves.

const createStyles = (colors: ThemePalette) => {
  const sheet = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { alignItems: 'center', gap: rh(8), paddingHorizontal: rw(20) },

    pageTitle: {
      alignSelf: 'flex-start',
      fontWeight: Font.bold,
      color: colors.textPrimary,
      marginBottom: rh(12),
    },

    sectionTitle: {
      alignSelf: 'flex-start',
      color: colors.textMuted,
      fontWeight: Font.semibold,
      letterSpacing: 0.8,
      marginTop: rh(16),
      marginBottom: rh(8),
      paddingHorizontal: rw(4),
    },

    card: {
      backgroundColor: colors.surface,
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
      paddingVertical: rh(12),
      gap: rw(12),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowColumn: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: rh(10),
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: rw(12),
    },

    iconBox: {
      backgroundColor: colors.surfaceTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      flex: 1,
      color: colors.textPrimary,
      fontWeight: Font.medium,
    },
    rowSubLabel: {
      color: colors.textSecondary,
      marginTop: rh(2),
    },

    // Segmented picker
    segmented: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceTint,
      borderRadius: Radius.md,
      padding: rw(3),
      gap: rw(2),
    },
    segment: {
      flex: 1,
      paddingVertical: rh(8),
      alignItems: 'center',
      borderRadius: Radius.sm,
    },
    segmentActive: {
      backgroundColor: colors.purple2,
      // Subtle shadow so the active chip lifts off the track.
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 2,
      elevation: 1,
    },
    segmentText: {
      color: colors.textSecondary,
      fontWeight: Font.medium,
    },
    segmentTextActive: {
      color: colors.white,
      fontWeight: Font.semibold,
    },

    footer: {
      marginTop: rh(24),
      alignItems: 'center',
      paddingTop: rh(12),
      width: '100%',
    },
    footerRow: { flexDirection: 'row', alignItems: 'center', gap: rw(5) },
    footerText: { color: colors.textMuted },
  });

  return {
    ...sheet,
    _toggleTrackOff: colors.border,
    _toggleTrackOn: colors.purple2,
    _toggleThumb: colors.white,
    _iconColor: colors.purple3,
    _chevronColor: colors.textMuted,
  };
};