/**
 * SwipeScreen — Core screen ⭐
 * Two states: active swiping · "All caught up" empty state
 * Design ref: Image 9 (active) + Image 12 (empty / all caught up)
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { Colors, Font, Radius, Card, rw, rh, rf } from '../constants/theme';
import { useStore } from '../store/useStore';

type Nav = StackNavigationProp<RootStackParamList>;

// ── Mock photo data for Phase 1 UI ────────────────────────────────────────
const MOCK_PHOTOS = [
  { id: '1', uri: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800', filename: 'IMG_3800.jpg', fileSize: 5600000 },
  { id: '2', uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', filename: 'IMG_3801.jpg', fileSize: 4200000 },
  { id: '3', uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800', filename: 'IMG_3802.jpg', fileSize: 3800000 },
];
const TOTAL = 24;

export default function SwipeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { deleteQueue } = useStore();

  // Phase 1: simple counter state (Phase 2 will use real gesture engine)
  const [reviewed, setReviewed] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const isEmpty = currentIdx >= MOCK_PHOTOS.length;

  const progressFraction = reviewed / TOTAL;
  const deleteCount = deleteQueue.length;

  const handleKeep = () => {
    setReviewed((r) => r + 1);
    setCurrentIdx((i) => i + 1);
  };

  const handleDelete = () => {
    setReviewed((r) => r + 1);
    setCurrentIdx((i) => i + 1);
  };

  const handleUndo = () => {
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
      setReviewed((r) => Math.max(0, r - 1));
    }
  };

  const handleReview = () => navigation.navigate('Review');

  const photo = MOCK_PHOTOS[currentIdx] ?? null;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + rh(12) }]}>
        <View>
          <Text style={[styles.headerTitle, { fontSize: rf(28) }]}>Discover</Text>
          <Text style={[styles.headerSub, { fontSize: rf(14) }]}>
            {reviewed} / {TOTAL} reviewed
          </Text>
        </View>
        {/* Delete queue badge button */}
        <TouchableOpacity
          style={[styles.badgeBtn, { width: rw(52), height: rw(52), borderRadius: Radius.xl }]}
          onPress={handleReview}
          activeOpacity={0.85}
        >
          <Text style={[styles.badgeBtnIcon, { fontSize: rf(20) }]}>✓</Text>
          {deleteCount > 0 && (
            <View style={styles.badge}>
              <Text style={[styles.badgeText, { fontSize: rf(11) }]}>{deleteCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Progress bar ── */}
      <View style={[styles.progressTrack, { marginHorizontal: rw(20) }]}>
        <View style={[styles.progressFill, { width: `${progressFraction * 100}%` }]} />
      </View>

      {/* ── Card area ── */}
      <View style={styles.cardArea}>
        {!isEmpty && photo ? (
          // Active swipe card
          <View style={[styles.card, { width: Card.width, borderRadius: Card.radius }]}>
            <Image
              source={{ uri: photo.uri }}
              style={styles.cardImage}
              resizeMode="cover"
            />
            {/* Bottom caption */}
            <View style={styles.cardCaption}>
              <Text style={[styles.captionFilename, { fontSize: rf(15) }]}>
                {photo.filename}
              </Text>
              <Text style={[styles.captionHint, { fontSize: rf(13) }]}>
                Swipe right to keep · left to delete
              </Text>
            </View>
          </View>
        ) : (
          // Empty / all caught up state
          <View style={[styles.emptyCard, { width: Card.width, borderRadius: Card.radius }]}>
            <Text style={[styles.emptyEmoji, { fontSize: rf(44) }]}>✦✦{'\n'}✦</Text>
            <Text style={[styles.emptyTitle, { fontSize: rf(24) }]}>All caught up</Text>
            <Text style={[styles.emptySubtitle, { fontSize: rf(15) }]}>
              Review your deletions to free up storage.
            </Text>
            {deleteCount > 0 && (
              <TouchableOpacity
                style={[styles.reviewBtn, { borderRadius: Radius.full }]}
                onPress={handleReview}
                activeOpacity={0.85}
              >
                <Text style={[styles.reviewBtnText, { fontSize: rf(16) }]}>
                  Review {deleteCount}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actions}>
        {/* Delete (X) */}
        <TouchableOpacity
          style={[styles.actionBtn, { width: rw(64), height: rw(64), borderRadius: Radius.full }]}
          onPress={handleDelete}
          activeOpacity={0.8}
          disabled={isEmpty}
        >
          <Text style={[styles.actionX, { fontSize: rf(24) }]}>✕</Text>
        </TouchableOpacity>

        {/* Undo */}
        <TouchableOpacity
          style={[styles.actionBtn, { width: rw(52), height: rw(52), borderRadius: Radius.full }]}
          onPress={handleUndo}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionUndo, { fontSize: rf(20) }]}>↺</Text>
        </TouchableOpacity>

        {/* Keep (heart) */}
        <TouchableOpacity
          style={[styles.actionBtnPrimary, { width: rw(64), height: rw(64), borderRadius: Radius.full }]}
          onPress={handleKeep}
          activeOpacity={0.8}
          disabled={isEmpty}
        >
          <Text style={[styles.actionHeart, { fontSize: rf(26) }]}>♥</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rw(20),
    paddingBottom: rh(12),
  },
  headerTitle: { fontWeight: Font.bold, color: Colors.textPrimary },
  headerSub: { color: Colors.textSecondary, marginTop: rh(2) },
  badgeBtn: {
    backgroundColor: Colors.purple2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeBtnIcon: { color: Colors.white },
  badge: {
    position: 'absolute',
    top: -rh(4),
    right: -rw(4),
    backgroundColor: Colors.delete,
    borderRadius: Radius.full,
    minWidth: rw(20),
    height: rw(20),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rw(4),
  },
  badgeText: { color: Colors.white, fontWeight: Font.bold },

  // Progress
  progressTrack: {
    height: rh(3),
    backgroundColor: Colors.surfaceTint,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: rh(16),
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.purple2,
    borderRadius: Radius.full,
  },

  // Card area
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    height: Card.height,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  cardImage: { width: '100%', height: '100%', position: 'absolute' },
  cardCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: rw(20),
    paddingBottom: rh(24),
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  captionFilename: { color: Colors.white, fontWeight: Font.semibold },
  captionHint: { color: 'rgba(255,255,255,0.72)', marginTop: rh(2) },

  // Empty state card
  emptyCard: {
    height: Card.height,
    backgroundColor: Colors.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
    padding: rw(32),
    gap: rh(12),
  },
  emptyEmoji: { color: '#F59E0B', textAlign: 'center', lineHeight: rh(56) },
  emptyTitle: { fontWeight: Font.bold, color: Colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center', lineHeight: rh(22) },
  reviewBtn: {
    backgroundColor: Colors.purple3,
    paddingVertical: rh(14),
    paddingHorizontal: rw(32),
    marginTop: rh(8),
  },
  reviewBtnText: { color: Colors.white, fontWeight: Font.semibold },

  // Action buttons
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rw(24),
    paddingVertical: rh(24),
  },
  actionBtn: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.purple3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.purple3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  actionX: { color: Colors.delete },
  actionUndo: { color: Colors.textSecondary },
  actionHeart: { color: Colors.white },
});
