/**
 * ResumeScreen — incomplete session detected · Resume or Start Fresh
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { Font, Radius, rw, rh, rf, type ThemePalette } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { getQueueProgress } from '../services/photoQueue';
import { getDeleteQueueIds, pauseSession } from '../services/swipeEngine';

type Props = StackScreenProps<RootStackParamList, 'Resume'>;

export default function ResumeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sessionId = route.params?.sessionId;

  const [photosLeft, setPhotosLeft] = useState(0);
  const [markedToDelete, setMarkedToDelete] = useState(0);
  const [busy, setBusy] = useState(false);

  // If we somehow landed here without a valid sessionId, bail out cleanly
  // rather than crash on a null reference inside the effect below.
  useEffect(() => {
    if (!sessionId) {
      console.warn('[Resume] no sessionId in route params, routing to Permission');
      navigation.replace('Permission');
    }
  }, [sessionId, navigation]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const [progress, deleteIds] = await Promise.all([
          getQueueProgress(sessionId),
          getDeleteQueueIds(sessionId),
        ]);
        if (cancelled) return;
        setPhotosLeft(Math.max(progress.total - progress.reviewed, 0));
        setMarkedToDelete(deleteIds.length);
      } catch (err) {
        console.warn('[Resume] failed to read session stats:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const handleResume = () => {
    if (busy) return;
    try {
      navigation.replace('MainTabs');
    } catch (err) {
      console.warn('[Resume] navigation failed:', err);
    }
  };

  const handleFresh = async () => {
    if (busy || !sessionId) return;
    setBusy(true);
    try {
      await pauseSession(sessionId);
      navigation.replace('Loading');
    } catch (err) {
      console.warn('[Resume] start-fresh failed:', err);
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + rh(48), paddingBottom: insets.bottom + rh(24) }]}>
      <View style={styles.inner}>
        {/* Icon */}
        <View style={[styles.iconBox, { width: rw(88), height: rw(88), borderRadius: rw(22) }]}>
          <Text style={[styles.iconGlyph, { fontSize: rf(42) }]}>↻</Text>
        </View>

        <Text style={[styles.title, { fontSize: rf(30) }]}>Session found</Text>
        <Text style={[styles.subtitle, { fontSize: rf(16), maxWidth: width * 0.75 }]}>
          You have an unfinished cleanup session. Would you like to continue where you left off?
        </Text>

        {/* Info card */}
        <View style={[styles.card, { width: width - rw(40) }]}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { fontSize: rf(13) }]}>PHOTOS LEFT</Text>
            <Text style={[styles.cardValue, { fontSize: rf(22), color: colors.purple2 }]}>{photosLeft}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { fontSize: rf(13) }]}>MARKED TO DELETE</Text>
            <Text style={[styles.cardValue, { fontSize: rf(22), color: colors.delete }]}>{markedToDelete}</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* Resume button */}
        <TouchableOpacity
          style={[styles.resumeBtn, { width: width - rw(40), borderRadius: Radius.full, opacity: busy ? 0.6 : 1 }]}
          onPress={handleResume}
          activeOpacity={0.85}
          disabled={busy}
        >
          <Text style={[styles.resumeText, { fontSize: rf(17) }]}>↻  Resume session</Text>
        </TouchableOpacity>

        {/* Start fresh */}
        <TouchableOpacity
          style={[styles.freshBtn, { width: width - rw(40), borderRadius: Radius.full, opacity: busy ? 0.6 : 1 }]}
          onPress={handleFresh}
          activeOpacity={0.85}
          disabled={busy}
        >
          <Text style={[styles.freshText, { fontSize: rf(17) }]}>
            {busy ? 'Working…' : 'Start fresh'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, alignItems: 'center', paddingHorizontal: rw(20) },
  iconBox: { backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center', marginBottom: rh(24) },
  iconGlyph: { color: colors.purple3, fontWeight: Font.bold },
  title: { fontWeight: Font.bold, color: colors.textPrimary, marginBottom: rh(12) },
  subtitle: { color: colors.textSecondary, textAlign: 'center', lineHeight: rh(24), marginBottom: rh(28) },
  card: { backgroundColor: colors.surface, borderRadius: Radius.xl, padding: rw(20), borderWidth: 1, borderColor: colors.border },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: rh(8) },
  cardLabel: { color: colors.textMuted, fontWeight: Font.semibold, letterSpacing: 0.8 },
  cardValue: { fontWeight: Font.bold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: rh(4) },
  resumeBtn: { backgroundColor: colors.purple3, paddingVertical: rh(18), alignItems: 'center', marginBottom: rh(12) },
  resumeText: { color: colors.white, fontWeight: Font.semibold },
  freshBtn: { backgroundColor: colors.surface, paddingVertical: rh(18), alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  freshText: { color: colors.textSecondary, fontWeight: Font.medium },
});
