/**
 * ResumeScreen — incomplete session detected · Resume or Start Fresh
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { Colors, Font, Radius, rw, rh, rf } from '../constants/theme';
import { getQueueProgress } from '../services/photoQueue';
import { getDeleteQueueIds, pauseSession } from '../services/swipeEngine';

type Props = StackScreenProps<RootStackParamList, 'Resume'>;

export default function ResumeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { sessionId } = route.params;

  const [photosLeft, setPhotosLeft] = useState(0);
  const [markedToDelete, setMarkedToDelete] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [progress, deleteIds] = await Promise.all([
        getQueueProgress(sessionId),
        getDeleteQueueIds(sessionId),
      ]);
      if (cancelled) return;
      setPhotosLeft(Math.max(progress.total - progress.reviewed, 0));
      setMarkedToDelete(deleteIds.length);
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const handleResume = () => navigation.replace('MainTabs');
  const handleFresh  = async () => {
    await pauseSession(sessionId);
    navigation.replace('Loading');
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
            <Text style={[styles.cardValue, { fontSize: rf(22), color: Colors.purple2 }]}>{photosLeft}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { fontSize: rf(13) }]}>MARKED TO DELETE</Text>
            <Text style={[styles.cardValue, { fontSize: rf(22), color: Colors.delete }]}>{markedToDelete}</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* Resume button */}
        <TouchableOpacity
          style={[styles.resumeBtn, { width: width - rw(40), borderRadius: Radius.full }]}
          onPress={handleResume}
          activeOpacity={0.85}
        >
          <Text style={[styles.resumeText, { fontSize: rf(17) }]}>↻  Resume session</Text>
        </TouchableOpacity>

        {/* Start fresh */}
        <TouchableOpacity
          style={[styles.freshBtn, { width: width - rw(40), borderRadius: Radius.full }]}
          onPress={handleFresh}
          activeOpacity={0.85}
        >
          <Text style={[styles.freshText, { fontSize: rf(17) }]}>Start fresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { flex: 1, alignItems: 'center', paddingHorizontal: rw(20) },
  iconBox: { backgroundColor: Colors.surfaceTint, alignItems: 'center', justifyContent: 'center', marginBottom: rh(24) },
  iconGlyph: { color: Colors.purple3, fontWeight: Font.bold },
  title: { fontWeight: Font.bold, color: Colors.textPrimary, marginBottom: rh(12) },
  subtitle: { color: Colors.textSecondary, textAlign: 'center', lineHeight: rh(24), marginBottom: rh(28) },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: rw(20), borderWidth: 1, borderColor: Colors.border },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: rh(8) },
  cardLabel: { color: Colors.textMuted, fontWeight: Font.semibold, letterSpacing: 0.8 },
  cardValue: { fontWeight: Font.bold },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: rh(4) },
  resumeBtn: { backgroundColor: Colors.purple3, paddingVertical: rh(18), alignItems: 'center', marginBottom: rh(12) },
  resumeText: { color: Colors.white, fontWeight: Font.semibold },
  freshBtn: { backgroundColor: Colors.surface, paddingVertical: rh(18), alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  freshText: { color: Colors.textSecondary, fontWeight: Font.medium },
});
