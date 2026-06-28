import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Modal, TextInput, StyleSheet, Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import { WorshipAlbumCard, type WorshipAlbum as WorshipAlbumType } from '@/components/worship-album-card';

export type WorshipAlbum = WorshipAlbumType;

interface WorshipAlbumSelectorProps {
  selectedDate: string;
  linkedAlbums?: WorshipAlbum[];
  onAddAlbum?: (album: WorshipAlbum) => void;
  onRemoveAlbum?: (albumId: string) => void;
  showAddModal?: boolean;
  onShowAddModal?: (show: boolean) => void;
}

export function WorshipAlbumSelector({
  selectedDate,
  linkedAlbums = [],
  onAddAlbum,
  onRemoveAlbum,
  showAddModal: externalShowAddModal = false,
  onShowAddModal,
}: WorshipAlbumSelectorProps) {
  const colors = useColors();

  // Form is handled by parent component, so we don't need local form state

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>

      {linkedAlbums.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
          <MaterialIcons name="music-note" size={32} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>No albums added</Text>
          <Text style={[styles.emptySubtext, { color: colors.muted }]}>Tap + to add a worship album</Text>
        </View>
      ) : (
        <ScrollView style={styles.albumsList} showsVerticalScrollIndicator={false}>
          {linkedAlbums.map((album) => (
            <WorshipAlbumCard
              key={album.id}
              album={album}
              onPress={() => {
                if (album.spotifyUrl) {
                  // In a real app, this would open the Spotify link
                  // For now, just show the URL
                  console.log('Opening:', album.spotifyUrl);
                }
              }}
              onDelete={() => onRemoveAlbum?.(album.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Form is handled by parent component via onShowAddModal callback */}
    </View>
  );
}

// Add button component for use in ExpandableSection header
export function WorshipAddButton({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <MaterialIcons name="add" size={20} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    borderRadius: 8,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 12,
  },
  albumsList: {
    maxHeight: 200,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalForm: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
