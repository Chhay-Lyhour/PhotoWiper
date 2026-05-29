/**
 * SplashScreen
 * Dark purple background · logo · tagline · "Get Started" button
 * Design ref: Image 10 (dark theme)
 */
import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { Font, Radius, rw, rh, rf, type ThemePalette } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { getActiveSessionId } from '../services/photoQueue';

type Props = StackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideY,  { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sid = await getActiveSessionId();
        if (cancelled) return;
        if (sid) {
          navigation.replace('Resume', { sessionId: sid });
          return;
        }
      } catch (e) {
        console.warn('[Splash] active session check failed:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [navigation]);

  const handleStart = () => navigation.replace('Permission');

  const iconSize = rw(110);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Subtle background dots */}
      <View style={[styles.dot, { width: rw(180), height: rw(180), top: rh(-40), right: rw(-60), opacity: 0.12 }]} />
      <View style={[styles.dot, { width: rw(120), height: rw(120), bottom: rh(160), left: rw(-40), opacity: 0.08 }]} />

      <Animated.View style={[styles.content, { opacity, transform: [{ translateY: slideY }] }]}>
        {/* Logo icon */}
        <View style={[styles.iconContainer, { width: iconSize, height: iconSize, borderRadius: rw(28) }]}>
          <Ionicons name="sparkles" size={rf(52)} color={colors.white} />
          <Text style={[styles.iconPlus, { fontSize: rf(22) }]}>+</Text>
        </View>

        {/* App name */}
        <View style={styles.nameRow}>
          <Text style={[styles.namePhoto, { fontSize: rf(44) }]}>Photo</Text>
          <Text style={[styles.nameSwipe, { fontSize: rf(44) }]}>Swipe</Text>
        </View>

        {/* Tagline */}
        <Text style={[styles.tagline, { fontSize: rf(17), maxWidth: width * 0.72 }]}>
          Clean your gallery in minutes.{'\n'}Swipe to keep what matters.
        </Text>

        {/* CTA button */}
        <TouchableOpacity
          style={[styles.btn, { width: width * 0.72, borderRadius: Radius.full }]}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { fontSize: rf(17) }]}>Get Started</Text>
        </TouchableOpacity>

        {/* Privacy note */}
        <Text style={[styles.privacy, { fontSize: rf(13) }]}>
          Private. On-device. Nothing uploaded.
        </Text>
      </Animated.View>
    </View>
  );
}

// Splash is intentionally always dark (per the design ref) — `colors.bgDark`
// is the same value in both palettes, so the screen stays on-brand regardless
// of the user's theme preference.
const createStyles = (colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    backgroundColor: colors.purple1,
    borderRadius: 9999,
  },
  content: {
    alignItems: 'center',
    gap: rh(20),
  },
  // Logo
  iconContainer: {
    backgroundColor: colors.purple2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rh(8),
    position: 'relative',
  },
  iconGlyph: {
    color: colors.white,
  },
  iconPlus: {
    color: colors.white,
    position: 'absolute',
    top: rh(10),
    right: rw(10),
    fontWeight: Font.bold,
  },
  // Title
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  namePhoto: {
    color: colors.white,
    fontWeight: Font.bold,
  },
  nameSwipe: {
    color: colors.purple1,
    fontWeight: Font.bold,
  },
  // Tagline
  tagline: {
    color: '#A89BC2',
    textAlign: 'center',
    lineHeight: rh(26),
    marginTop: rh(4),
  },
  // Button
  btn: {
    backgroundColor: colors.purple2,
    paddingVertical: rh(18),
    alignItems: 'center',
    marginTop: rh(16),
  },
  btnText: {
    color: colors.white,
    fontWeight: Font.semibold,
  },
  // Privacy
  privacy: {
    color: '#6B5A8A',
    textAlign: 'center',
    marginTop: rh(4),
  },
});
