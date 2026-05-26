/**
 * ReviewScreen — photo grid of delete queue · tap to rescue · Confirm Delete
 * Design ref: Image 8
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { Colors, Font, Radius, rw, rh, rf } from '../constants/theme';
type Props = StackScreenProps<RootStackParamList, 'Review'>;

// Mock delete-queue photos for Phase 1 UI
const MOCK_DELETE = [
  { id: '1', uri: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400', fileSize: 5600000 },
  { id: '2', uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', fileSize: 5400000 },
  { id: '3', uri: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400', fileSize: 2200000 },
  { id: '4', uri: 'https://images.unsplash.com/photo-1502767089025-6572583495b9?w=400', fileSize: 5600000 },
  { id: '5', uri: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400', fileSize: 5300000 },
  { id: '6', uri: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400', fileSize: 5000000 },
  { id: '7', uri: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400', fileSize: 2900000 },
  { id: '8', uri: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400', fileSize: 1300000 },
  { id: '9', uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', fileSize: 4200000 },
];

function formatMB(bytes: number) {
  const mb = bytes / 1_000_000;
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${(bytes / 1000).toFixed(0)}KB`;
}

export default function ReviewScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // rescued = ids removed from delete queue
  const [rescued, setRescued] = useState<Set<string>>(new Set());

  const remaining = MOCK_DELETE.filter((p) => !rescued.has(p.id));
  const totalBytes = remaining.reduce((s, p) => s + p.fileSize, 0);
  const keptCount = 15; // mock

  const handleRescue = (id: string) => {
    setRescued((prev) => new Set([...prev, id]));
  };

  const handleConfirm = () => {
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
            {remaining.length}
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
        {MOCK_DELETE.map((photo) => {
          const isRescued = rescued.has(photo.id);
          return (
            <TouchableOpacity
              key={photo.id}
              onPress={() => handleRescue(photo.id)}
              activeOpacity={0.8}
              style={[styles.cell, { width: CELL, height: CELL * 1.15 }]}
            >
              <Image
                source={{ uri: photo.uri }}
                style={[styles.cellImage, isRescued && styles.cellRescued]}
                resizeMode="cover"
              />
              {/* File size label */}
              {!isRescued && (
                <View style={styles.sizeTag}>
                  <Text style={[styles.sizeText, { fontSize: rf(11) }]}>
                    {formatMB(photo.fileSize)}
                  </Text>
                </View>
              )}
              {/* X badge */}
              {!isRescued && (
                <View style={[styles.xBadge, { width: rw(22), height: rw(22), borderRadius: Radius.full }]}>
                  <Text style={[styles.xText, { fontSize: rf(12) }]}>✕</Text>
                </View>
              )}
              {/* Rescued overlay */}
              {isRescued && (
                <View style={styles.rescuedOverlay}>
                  <Text style={[styles.rescuedIcon, { fontSize: rf(28) }]}>♥</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Confirm button ── */}
      <View style={[styles.footer, { paddingHorizontal: rw(20), paddingBottom: insets.bottom + rh(8) }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, { borderRadius: Radius.full }]}
          onPress={handleConfirm}
          activeOpacity={0.85}
          disabled={remaining.length === 0}
        >
          <Text style={[styles.confirmText, { fontSize: rf(17) }]}>
            Confirm Delete ({remaining.length})
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
