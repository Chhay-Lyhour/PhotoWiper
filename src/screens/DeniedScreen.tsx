/**
 * DeniedScreen
 * Lock icon · numbered steps HOW TO ENABLE · Open Settings · re-check link
 * Design ref: Image 7 (full) + Image 2 (bottom-sheet state)
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  AppState,
  type AppStateStatus,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { Colors, Font, Radius, rw, rh, rf } from '../constants/theme';
import { checkPhotoPermission, isUsable } from '../services/permissions';

type Props = StackScreenProps<RootStackParamList, 'Denied'>;

const STEPS = [
  'Tap "Open Settings" below',
  'Find PhotoSwipe in the list',
  'Enable "Photos" permission',
  'Return to the app',
];

export default function DeniedScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [checking, setChecking] = useState(false);
  const [showStillDenied, setShowStillDenied] = useState(false);
  const sentToSettings = useRef(false);

  const runRecheck = useCallback(
    async (silent = false) => {
      if (!silent) setChecking(true);
      try {
        const result = await checkPhotoPermission();
        if (isUsable(result.state)) {
          navigation.replace('Loading');
        } else if (!silent) {
          setShowStillDenied(true);
        }
      } finally {
        if (!silent) setChecking(false);
      }
    },
    [navigation],
  );

  // Auto-recheck when app returns to foreground (e.g. user came back from Settings)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && sentToSettings.current) {
        sentToSettings.current = false;
        runRecheck(true);
      }
    });
    return () => sub.remove();
  }, [runRecheck]);

  // Also re-check whenever this screen regains focus
  useFocusEffect(
    useCallback(() => {
      runRecheck(true);
    }, [runRecheck]),
  );

  const handleOpenSettings = () => {
    sentToSettings.current = true;
    setShowStillDenied(false);
    Linking.openSettings();
  };

  const handleRecheck = () => runRecheck(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top + rh(32), paddingBottom: insets.bottom + rh(16) }]}>
      <View style={styles.inner}>
        {/* Lock icon */}
        <View style={[styles.iconBox, { width: rw(80), height: rw(80), borderRadius: rw(20) }]}>
          <Text style={[styles.iconGlyph, { fontSize: rf(38) }]}>🔒</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { fontSize: rf(32), maxWidth: width * 0.85 }]}>
          Photos access denied
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { fontSize: rf(16), maxWidth: width * 0.78 }]}>
          PhotoSwipe needs photo access to work.{'\n'}Please enable it in your device settings.
        </Text>

        {/* Steps card */}
        <View style={[styles.card, { width: width - rw(40) }]}>
          <Text style={[styles.cardLabel, { fontSize: rf(12) }]}>HOW TO ENABLE</Text>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={[styles.stepNum, { fontSize: rf(14) }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { fontSize: rf(15) }]}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Privacy note */}
        <View style={styles.privacyRow}>
          <Text style={[styles.privacyIcon, { fontSize: rf(14) }]}>🛡</Text>
          <Text style={[styles.privacyText, { fontSize: rf(13) }]}>
            Photos stay private on your device
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        {/* "Still denied" inline hint */}
        {showStillDenied && (
          <Text style={[styles.stillDenied, { fontSize: rf(13) }]}>
            Still denied — make sure Photos access is enabled in Settings.
          </Text>
        )}

        {/* Open Settings button */}
        <TouchableOpacity
          style={[
            styles.settingsBtn,
            { width: width - rw(40), borderRadius: Radius.full },
            checking && styles.settingsBtnDisabled,
          ]}
          onPress={handleOpenSettings}
          activeOpacity={0.85}
          disabled={checking}
        >
          <Text style={[styles.settingsBtnIcon, { fontSize: rf(17) }]}>⚙</Text>
          <Text style={[styles.settingsBtnText, { fontSize: rf(17) }]}>Open Settings →</Text>
        </TouchableOpacity>

        {/* Re-check link */}
        <TouchableOpacity onPress={handleRecheck} style={styles.recheckBtn} disabled={checking}>
          <Text style={[styles.recheckText, { fontSize: rf(15) }]}>
            {checking ? 'Checking…' : '↻  I\'ve enabled it — re-check'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: rw(20),
  },
  // Icon
  iconBox: {
    backgroundColor: Colors.purple2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rh(24),
  },
  iconGlyph: {},
  // Texts
  title: {
    fontWeight: Font.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: rh(12),
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: rh(24),
    marginBottom: rh(24),
  },
  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: rw(20),
    gap: rh(14),
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: rh(16),
  },
  cardLabel: {
    color: Colors.purple3,
    fontWeight: Font.semibold,
    letterSpacing: 1.2,
    marginBottom: rh(4),
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rw(14),
  },
  stepBadge: {
    width: rw(30),
    height: rw(30),
    borderRadius: Radius.full,
    backgroundColor: Colors.purple3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    color: Colors.white,
    fontWeight: Font.bold,
  },
  stepText: {
    color: Colors.textPrimary,
    flex: 1,
  },
  // Privacy
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rw(6),
    marginBottom: rh(8),
  },
  privacyIcon: {},
  privacyText: {
    color: Colors.textMuted,
  },
  // Inline hint
  stillDenied: {
    color: Colors.delete,
    textAlign: 'center',
    marginBottom: rh(10),
  },

  // Buttons
  settingsBtn: {
    backgroundColor: Colors.purple3,
    paddingVertical: rh(18),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rw(8),
    marginBottom: rh(12),
  },
  settingsBtnDisabled: {
    opacity: 0.6,
  },
  settingsBtnIcon: {
    color: Colors.white,
  },
  settingsBtnText: {
    color: Colors.white,
    fontWeight: Font.semibold,
  },
  recheckBtn: {
    paddingVertical: rh(10),
    paddingHorizontal: rw(24),
  },
  recheckText: {
    color: Colors.purple3,
    fontWeight: Font.medium,
  },
});
