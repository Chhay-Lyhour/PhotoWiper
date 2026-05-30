/**
 * PermissionScreen
 * Light lavender bg · purple photo icon · 3 checklist items · Allow / Not now
 * Design ref: Image 6
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { Font, Radius, rw, rh, rf, type ThemePalette } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { requestPhotoPermission, checkPhotoPermission, isUsable } from '../services/permissions';

type Props = StackScreenProps<RootStackParamList, 'Permission'>;

const CHECKS = [
  'Read your photo library',
  'Delete only what you approve',
  'No data ever leaves your device',
];

export default function PermissionScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [requesting, setRequesting] = useState(false);
  // Gate the Allow UI until we've checked the current OS state, so users only
  // ever see the screen that matches their state (smart routing):
  //   usable  → straight into the app (don't re-ask)
  //   blocked → Denied screen (can't prompt; Open Settings is the only path)
  //   else    → show the Allow UI below
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { state } = await checkPhotoPermission();
        if (cancelled) return;
        if (isUsable(state)) { navigation.replace('Loading'); return; }
        if (state === 'blocked') { navigation.replace('Denied'); return; }
      } catch (err) {
        console.warn('[Permission] initial check failed:', err);
      }
      if (!cancelled) setChecked(true);
    })();
    return () => { cancelled = true; };
  }, [navigation]);

  // Respect the real OS permission result: only proceed to Loading when the
  // grant is usable (full or limited access). Anything else routes to the
  // Denied screen so the user gets a clear "access needed" path instead of
  // landing on a silent error later when we try to read the library.
  const handleAllow = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const { state } = await requestPhotoPermission();
      navigation.replace(isUsable(state) ? 'Loading' : 'Denied');
    } catch (err) {
      console.warn('[Permission] request failed:', err);
      navigation.replace('Denied');
    } finally {
      setRequesting(false);
    }
  };

  const handleNotNow = () => navigation.replace('Denied');

  // While the initial state check is in flight, render an empty bg (avoids a
  // flash of the Allow UI before we may redirect to Loading/Denied).
  if (!checked) {
    return <View style={styles.container} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + rh(24), paddingBottom: insets.bottom + rh(16) }]}>
      <View style={styles.inner}>
        {/* Icon */}
        <View style={[styles.iconBox, { width: rw(80), height: rw(80), borderRadius: rw(20) }]}>
          <Ionicons name="images-outline" size={rf(38)} color={colors.white} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { fontSize: rf(32), maxWidth: width * 0.82 }]}>
          Access your photos
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { fontSize: rf(16), maxWidth: width * 0.78 }]}>
          PhotoSwipe needs permission to read your gallery so you can review and clean it.
        </Text>

        {/* Checklist card */}
        <View style={[styles.card, { width: width - rw(40) }]}>
          {CHECKS.map((item, i) => (
            <View key={i} style={styles.checkRow}>
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={rf(15)} color={colors.white} />
              </View>
              <Text style={[styles.checkText, { fontSize: rf(16) }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        {/* Allow button */}
        <TouchableOpacity
          style={[
            styles.allowBtn,
            { width: width - rw(40), borderRadius: Radius.full },
            requesting && styles.allowBtnDisabled,
          ]}
          onPress={handleAllow}
          activeOpacity={0.85}
          disabled={requesting}
        >
          <Text style={[styles.allowText, { fontSize: rf(17) }]}>
            {requesting ? 'Requesting…' : 'Allow Access'}
          </Text>
        </TouchableOpacity>

        {/* Not now */}
        <TouchableOpacity onPress={handleNotNow} style={styles.notNowBtn}>
          <Text style={[styles.notNowText, { fontSize: rf(15) }]}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: rw(20),
  },
  // Icon
  iconBox: {
    backgroundColor: colors.purple2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rh(24),
  },
  iconGlyph: {},
  // Texts
  title: {
    fontWeight: Font.bold,
    color: colors.textPrimary,
    marginBottom: rh(12),
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: rh(24),
    marginBottom: rh(28),
  },
  // Card
  card: {
    backgroundColor: colors.surfaceTint,
    borderRadius: Radius.xl,
    padding: rw(20),
    gap: rh(14),
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rw(12),
  },
  checkBadge: {
    width: rw(28),
    height: rw(28),
    borderRadius: Radius.full,
    backgroundColor: colors.purple3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: colors.white,
    fontWeight: Font.bold,
  },
  checkText: {
    color: colors.purple3,
    fontWeight: Font.medium,
    flex: 1,
  },
  // Buttons
  allowBtn: {
    backgroundColor: colors.purple3,
    paddingVertical: rh(18),
    alignItems: 'center',
    marginBottom: rh(12),
  },
  allowBtnDisabled: {
    opacity: 0.6,
  },
  allowText: {
    color: colors.white,
    fontWeight: Font.semibold,
  },
  notNowBtn: {
    paddingVertical: rh(10),
    paddingHorizontal: rw(24),
  },
  notNowText: {
    color: colors.textMuted,
  },
});
