/**
 * ReviewScreen — photo grid of delete queue · tap to rescue · Confirm Delete
 * Design ref: Image 8
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList, SwipeRecord } from '../types';
import { Colors, Font, Radius, rw, rh, rf } from '../constants/theme';
import { getActiveSessionId } from '../services/photoQueue';
import { getDeleteQueue, rescuePhoto } from '../services/swipeEngine';
import { getSession } from '../services/analyticsService';

type Props = StackScreenProps<RootStackParamList, 'Review'>;

function formatMB(bytes: number) {
  const mb = bytes / 1_000_000;
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${(bytes / 1000).toFixed(0)}KB`;
}

export default function ReviewScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [deleteQueue, setDeleteQueue] = useState<SwipeRecord[]>([]);
  const [keptCount, setKeptCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const loadQueue = useCallback(async () => {
    const sid = await getActiveSessionId();
    if (!sid) {
      setDeleteQueue([]);
      return;
    }
    setSessionId(sid);
    const [queue, session] = await Promise.all([getDeleteQueue(sid), getSession(sid)]);
    setDeleteQueue(queue);
    setKeptCount(session?.keptCount ?? 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadQueue();
    }, [loadQueue]),
  );

  const totalBytes = deleteQueue.reduce((s, p) => s + (p.fileSize ?? 0), 0);

  const handleRescue = async (photoId: string) => {
    if (!sessionId || busy) return;
    setBusy(true);
    setDeleteQueue((q) => q.filter((r) => r.photoId !== photoId));
    try {
      await rescuePhoto(sessionId, photoId);
    } catch (e) {
      console.warn('[rescue]', e);
      await loadQueue();
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = () => {
    if (deleteQueue.length === 0) return;
    navigation.replace('Deleting');
  };

  // 3-column grid: padding (rw(20) each side) + 2 gaps of 4px between cells
  const GRID_PADDING = rw(20);
  const GRID_GAP = 4;
  const CELL = Math.floor((width - GRID_PADDING * 2 - GRID_GAP * 2) / 3);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + rh(16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.backIcon, { fontSize: rf(18) }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: rf(22) }]}>Review deletions</Text>
        <View style={styles.backBtn} />
      </View>

      {/* ── Stats row ── */}
      <View style={[styles.statsRow, { paddingHorizontal: rw(20) }]}>
        <View style={[styles.statChip, { flex: 1 }]}>
          <Text style={[styles.statNum, { fontSize: rf(28), color: Colors.delete }]}>
            {deleteQueue.length}
          </Text>
          <Text style={[styles.statLabel, { fontSize: rf(11) }]}>PHOTOS</Text>
        </View>
        <View style={[styles.statChip, { flex: 1 }]}>
          <Text style={[styles.statNum, { fontSize: rf(28), color: Colors.purple2 }]}>
            {(totalBytes / 1_000_000).toFixed(1)}
          </Text>
          <Text style={[styles.statLabel, { fontSize: rf(11) }]}>MB FREED</Text>
        </View>
        <View style={[styles.statChip, { flex: 1 }]}>
          <Text style={[styles.statNum, { fontSize: rf(28), color: Colors.keep }]}>
            {keptCount}
          </Text>
          <Text style={[styles.statLabel, { fontSize: rf(11) }]}>KEPT</Text>
        </View>
      </View>

      <Text style={[styles.hint, { fontSize: rf(14), paddingHorizontal: rw(20) }]}>
        Tap a photo to rescue it.
      </Text>

      {/* ── Photo grid ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.grid,
          { paddingHorizontal: GRID_PADDING, paddingBottom: rh(100), gap: GRID_GAP },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {deleteQueue.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { fontSize: rf(15) }]}>
              No photos queued for deletion.
            </Text>
          </View>
        ) : (
          deleteQueue.map((photo) => (
            <TouchableOpacity
              key={photo.photoId}
              onPress={() => handleRescue(photo.photoId)}
              activeOpacity={0.8}
              disabled={busy}
              style={[styles.cell, { width: CELL, height: CELL * 1.15 }]}
            >
              <Image
                source={{ uri: photo.uri }}
                style={styles.cellImage}
                resizeMode="cover"
              />
              {photo.fileSize !== undefined && (
                <View style={styles.sizeTag}>
                  <Text style={[styles.sizeText, { fontSize: rf(11) }]}>
                    {formatMB(photo.fileSize)}
                  </Text>
                </View>
              )}
              <View style={[styles.xBadge, { width: rw(22), height: rw(22), borderRadius: Radius.full }]}>
                <Text style={[styles.xText, { fontSize: rf(12) }]}>✕</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ── Confirm button ── */}
      <View style={[styles.footer, { paddingHorizontal: rw(20), paddingBottom: insets.bottom + rh(8) }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, { borderRadius: Radius.full }]}
          onPress={handleConfirm}
          activeOpacity={0.85}
          disabled={deleteQueue.length === 0}
        >
          <Text style={[styles.confirmText, { fontSize: rf(17) }]}>
            Confirm Delete ({deleteQueue.length})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rw(20),
    paddingBottom: rh(16),
  },
  backBtn: { width: rw(40), height: rw(40), alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: Radius.full },
  backIcon: { color: Colors.textPrimary },
  headerTitle: { fontWeight: Font.bold, color: Colors.textPrimary },

  // Stats
  statsRow: { flexDirection: 'row', gap: rw(8), marginBottom: rh(12) },
  statChip: {
    backgroundColor: Colors.surfaceTint,
    borderRadius: Radius.lg,
    paddingVertical: rh(14),
    alignItems: 'center',
  },
  statNum: { fontWeight: Font.extrabold },
  statLabel: { color: Colors.textMuted, fontWeight: Font.semibold, letterSpacing: 0.8, marginTop: rh(2) },

  hint: { color: Colors.textSecondary, marginBottom: rh(12) },

  // Grid
  scroll: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  cellImage: { width: '100%', height: '100%' },
  cellRescued: { opacity: 0.3 },
  emptyWrap: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: rh(40) },
  emptyText: { color: Colors.textSecondary },
  sizeTag: {
    position: 'absolute',
    bottom: rh(6),
    left: rw(6),
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radius.xs,
    paddingHorizontal: rw(5),
    paddingVertical: rh(2),
  },
  sizeText: { color: Colors.white },
  xBadge: {
    position: 'absolute',
    top: rh(6),
    right: rw(6),
    backgroundColor: Colors.delete,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xText: { color: Colors.white, fontWeight: Font.bold },
  rescuedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34,197,94,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescuedIcon: { color: Colors.keep },

  // Footer
  footer: { paddingTop: rh(12), backgroundColor: Colors.bg },
  confirmBtn: {
    backgroundColor: Colors.purple3,
    paddingVertical: rh(18),
    alignItems: 'center',
  },
  confirmText: { color: Colors.white, fontWeight: Font.semibold },
});
