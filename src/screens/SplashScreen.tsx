/**
 * SplashScreen
 * Dark purple background · logo · tagline · "Get Started" button
 * Design ref: Image 10 (dark theme)
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { Colors, Font, Radius, rw, rh, rf } from '../constants/theme';

type Props = StackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Fade-in animation
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideY,  { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

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
          <Text style={[styles.iconGlyph, { fontSize: rf(52) }]}>✦</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    backgroundColor: Colors.purple1,
    borderRadius: 9999,
  },
  content: {
    alignItems: 'center',
    gap: rh(20),
  },
  // Logo
  iconContainer: {
    backgroundColor: Colors.purple2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rh(8),
    position: 'relative',
  },
  iconGlyph: {
    color: Colors.white,
  },
  iconPlus: {
    color: Colors.white,
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
    color: Colors.white,
    fontWeight: Font.bold,
  },
  nameSwipe: {
    color: Colors.purple1,
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
    backgroundColor: Colors.purple2,
    paddingVertical: rh(18),
    alignItems: 'center',
    marginTop: rh(16),
  },
  btnText: {
    color: Colors.white,
    fontWeight: Font.semibold,
  },
  // Privacy
  privacy: {
    color: '#6B5A8A',
    textAlign: 'center',
    marginTop: rh(4),
  },
});
