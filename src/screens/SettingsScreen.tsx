/**
 * SettingsScreen — sectioned settings.
 *
 * Sections:
 *   Appearance  — theme picker, reduce motion
 *   Feedback    — master haptics toggle, strength picker
 *   Swipe       — sensitivity, invert direction, confirm-before-delete
 *   Sync & Data — sync status row
 *   Permissions — photo library access + system settings shortcut
 *   About       — help modal, privacy modal, version
 */
import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, useWindowDimensions, Alert, ActivityIndicator,
  Modal, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, CommonActions, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
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

const APP_VERSION = '1.0.0';

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
  const [photoPermStatus, setPhotoPermStatus] = useState<MediaLibrary.PermissionStatus | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);

  const refreshSyncStatus = useCallback(async () => {
    try {
      setSyncStatus(await getSyncStatus());
    } catch (e) {
      console.warn('[settings] getSyncStatus failed:', e);
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    try {
      const perm = await MediaLibrary.getPermissionsAsync();
      setPhotoPermStatus(perm.status);
    } catch (e) {
      console.warn('[settings] getPermissionsAsync failed:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    refreshSyncStatus();
    checkPermissions();
  }, [refreshSyncStatus, checkPermissions]));

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

  const handleOpenPhotoSettings = useCallback(() => {
    haptics.buttonTap();
    Linking.openSettings();
  }, []);

  const cardW = width - rw(40);

  const setSetting = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    haptics.selection();
    updateSettings({ [key]: val } as Partial<AppSettings>);
  };

  const permLabel =
    photoPermStatus === MediaLibrary.PermissionStatus.GRANTED  ? 'Full access' :
    photoPermStatus === MediaLibrary.PermissionStatus.DENIED   ? 'Not allowed' :
    photoPermStatus === MediaLibrary.PermissionStatus.UNDETERMINED ? 'Not set up' :
    'Checking…';

  const permBadgeColor =
    photoPermStatus === MediaLibrary.PermissionStatus.GRANTED  ? colors.keep :
    photoPermStatus === MediaLibrary.PermissionStatus.DENIED   ? colors.delete :
    colors.textMuted;

  return (
    <>
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

        {/* ── Permissions ── */}
        <SectionTitle styles={styles}>Permissions</SectionTitle>
        <View style={[styles.card, { width: cardW, borderRadius: Radius.xl }]}>
          <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={handleOpenPhotoSettings}>
            <IconBox styles={styles} icon="images-outline" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { fontSize: rf(16) }]}>Photo Library</Text>
              <Text style={[styles.rowSubLabel, { fontSize: rf(13) }]}>
                {photoPermStatus === 'denied'
                  ? 'Tap to allow access in Settings'
                  : 'Manage in iOS Settings'}
              </Text>
            </View>
            <View style={[styles.permBadge, { backgroundColor: permBadgeColor + '22' }]}>
              <Text style={[styles.permBadgeText, { color: permBadgeColor, fontSize: rf(11) }]}>
                {permLabel}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={rf(16)} color={styles._chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={() => Linking.openSettings()}>
            <IconBox styles={styles} icon="settings-outline" />
            <Text style={[styles.rowLabel, { fontSize: rf(16) }]}>Open iOS Settings</Text>
            <Ionicons name="open-outline" size={rf(15)} color={styles._chevronColor} />
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        <SectionTitle styles={styles}>About</SectionTitle>
        <View style={[styles.card, { width: cardW, borderRadius: Radius.xl }]}>
          <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={() => { haptics.selection(); setHelpVisible(true); }}>
            <IconBox styles={styles} icon="help-circle-outline" />
            <Text style={[styles.rowLabel, { fontSize: rf(16) }]}>Help &amp; Support</Text>
            <Ionicons name="chevron-forward" size={rf(16)} color={styles._chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={() => { haptics.selection(); setPrivacyVisible(true); }}>
            <IconBox styles={styles} icon="shield-checkmark-outline" />
            <Text style={[styles.rowLabel, { fontSize: rf(16) }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={rf(16)} color={styles._chevronColor} />
          </TouchableOpacity>
          <View style={styles.row}>
            <IconBox styles={styles} icon="information-circle-outline" />
            <Text style={[styles.rowLabel, { fontSize: rf(16) }]}>Version</Text>
            <Text style={[styles.rowSubLabel, { fontSize: rf(15) }]}>{APP_VERSION}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { fontSize: rf(13) }]}>
              PhotoSwipe v{APP_VERSION} · Made with
            </Text>
            <Ionicons name="heart" size={rf(13)} color={colors.purple3} />
          </View>
        </View>
      </ScrollView>

      {/* ── Help & Support Modal ── */}
      <ContentModal
        visible={helpVisible}
        title="Help & Support"
        icon="help-circle-outline"
        colors={colors}
        styles={styles}
        onClose={() => setHelpVisible(false)}
      >
        <ModalSection title="How PhotoSwipe works" styles={styles}>
          PhotoSwipe shows your photos one by one. Swipe right to keep a photo, or swipe left to mark it for deletion. After reviewing, you can confirm which photos to permanently delete — freeing up storage on your device.
        </ModalSection>

        <ModalSection title="Swipe gestures" styles={styles}>
          <ModalBullet icon="heart" color={colors.keep} styles={styles}>
            Swipe right — keep the photo
          </ModalBullet>
          <ModalBullet icon="trash" color={colors.delete} styles={styles}>
            Swipe left — mark for deletion
          </ModalBullet>
          <ModalBullet icon="arrow-undo" color={colors.purple3} styles={styles}>
            Tap the undo button — rescue the last photo you marked
          </ModalBullet>
        </ModalSection>

        <ModalSection title="Review before deleting" styles={styles}>
          Nothing is deleted immediately. After swiping, go to the Review screen to see all photos marked for deletion. You can rescue individual photos before confirming. Deletion only happens when you tap "Confirm Delete".
        </ModalSection>

        <ModalSection title="Frequently asked questions" styles={styles}>
          <ModalBullet icon="chatbubble-outline" color={colors.purple3} styles={styles}>
            Can I undo a deletion? No — once you confirm, photos are permanently deleted from your device. Always review carefully first.
          </ModalBullet>
          <ModalBullet icon="chatbubble-outline" color={colors.purple3} styles={styles}>
            Are my photos uploaded anywhere? Never. All processing happens locally on your device. See our Privacy Policy for more.
          </ModalBullet>
          <ModalBullet icon="chatbubble-outline" color={colors.purple3} styles={styles}>
            Why does the app need photo access? PhotoSwipe needs to read and delete photos from your library. You can manage this in the Permissions section of Settings.
          </ModalBullet>
        </ModalSection>

        <ModalSection title="Contact" styles={styles}>
          Found a bug or have a suggestion? Reach out at support@photoswipe.app — we read every message.
        </ModalSection>
      </ContentModal>

      {/* ── Privacy Policy Modal ── */}
      <ContentModal
        visible={privacyVisible}
        title="Privacy Policy"
        icon="shield-checkmark-outline"
        colors={colors}
        styles={styles}
        onClose={() => setPrivacyVisible(false)}
      >
        <ModalSection title="Your photos stay on your device" styles={styles}>
          PhotoSwipe processes all photos locally. We never upload, transmit, or store your photos on any server. The app accesses your photo library solely to display and delete photos at your direction.
        </ModalSection>

        <ModalSection title="What data we collect" styles={styles}>
          <ModalBullet icon="checkmark-circle-outline" color={colors.keep} styles={styles}>
            Anonymous usage statistics (number of sessions, photos reviewed) — no personal info attached.
          </ModalBullet>
          <ModalBullet icon="checkmark-circle-outline" color={colors.keep} styles={styles}>
            Crash reports to help us fix bugs — contains no photo content.
          </ModalBullet>
          <ModalBullet icon="close-circle-outline" color={colors.delete} styles={styles}>
            We do NOT collect names, emails, location, or any identifiable information.
          </ModalBullet>
          <ModalBullet icon="close-circle-outline" color={colors.delete} styles={styles}>
            We do NOT sell or share data with third parties.
          </ModalBullet>
        </ModalSection>

        <ModalSection title="Photo library access" styles={styles}>
          We request access to your photo library to show and delete photos. You can revoke this permission at any time in iOS Settings → PhotoSwipe → Photos. Revoking access will prevent the app from functioning.
        </ModalSection>

        <ModalSection title="Local data" styles={styles}>
          Swipe history, session records, and stats are stored locally using SQLite on your device. You can wipe all local data at any time from Settings → Sync & Data → Clear local data.
        </ModalSection>

        <ModalSection title="Data retention" styles={styles}>
          Local app data persists until you clear it or uninstall the app. Anonymous stats may be retained on our servers for up to 12 months for aggregate analytics.
        </ModalSection>

        <ModalSection title="Contact" styles={styles}>
          Questions about your data? Contact us at privacy@photoswipe.app
        </ModalSection>

        <Text style={[styles.modalMeta, { fontSize: rf(12) }]}>
          Last updated: May 2025
        </Text>
      </ContentModal>
    </>
  );
}

// ─── Modal Components ────────────────────────────────────────────────────────

function ContentModal({
  visible, title, icon, colors, styles, onClose, children,
}: {
  visible: boolean;
  title: string;
  icon: IoniconName;
  colors: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
        {/* Modal header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <View style={[styles.modalIconWrap, { backgroundColor: colors.surfaceTint, borderRadius: Radius.md }]}>
            <Ionicons name={icon} size={rf(20)} color={colors.purple3} />
          </View>
          <Text style={[styles.modalTitle, { fontSize: rf(18), color: colors.textPrimary }]}>{title}</Text>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={rf(18)} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ModalSection({
  title, styles, children,
}: {
  title: string;
  styles: ReturnType<typeof createStyles>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.modalSection}>
      <Text style={[styles.modalSectionTitle, { fontSize: rf(13) }]}>{title.toUpperCase()}</Text>
      {typeof children === 'string' ? (
        <Text style={[styles.modalBody, { fontSize: rf(15) }]}>{children}</Text>
      ) : (
        <View style={styles.modalBullets}>{children}</View>
      )}
    </View>
  );
}

function ModalBullet({
  icon, color, styles, children,
}: {
  icon: IoniconName;
  color: string;
  styles: ReturnType<typeof createStyles>;
  children: string;
}) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name={icon} size={rf(16)} color={color} style={{ marginTop: rh(1) }} />
      <Text style={[styles.modalBody, { fontSize: rf(15), flex: 1 }]}>{children}</Text>
    </View>
  );
}

// ─── Row components ──────────────────────────────────────────────────────────

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

// ─── Styles ──────────────────────────────────────────────────────────────────

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

    // Permission badge
    permBadge: {
      paddingHorizontal: rw(8),
      paddingVertical: rh(3),
      borderRadius: Radius.full,
    },
    permBadgeText: {
      fontWeight: Font.semibold,
      letterSpacing: 0.3,
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

    // Modal
    modalContainer: { flex: 1 },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: rw(20),
      paddingVertical: rh(14),
      gap: rw(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalIconWrap: {
      width: rw(36),
      height: rw(36),
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      flex: 1,
      fontWeight: Font.bold,
      color: colors.textPrimary,
    },
    modalCloseBtn: {
      width: rw(36),
      height: rw(36),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceTint,
      borderRadius: Radius.full,
    },
    modalScroll: { flex: 1 },
    modalScrollContent: {
      paddingHorizontal: rw(20),
      paddingTop: rh(20),
      paddingBottom: rh(40),
      gap: rh(24),
    },
    modalSection: { gap: rh(10) },
    modalSectionTitle: {
      color: colors.textMuted,
      fontWeight: Font.semibold,
      letterSpacing: 0.8,
    },
    modalBody: {
      color: colors.textSecondary,
      lineHeight: rh(22),
    },
    modalBullets: { gap: rh(10) },
    bulletRow: {
      flexDirection: 'row',
      gap: rw(10),
      alignItems: 'flex-start',
    },
    modalMeta: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: rh(8),
    },
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
