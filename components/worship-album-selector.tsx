import React, { useState } from 'react';
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
}

export function WorshipAlbumSelector({
  selectedDate,
  linkedAlbums = [],
  onAddAlbum,
  onRemoveAlbum,
}: WorshipAlbumSelectorProps) {
  const colors = useColors();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formArtist, setFormArtist] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formSpotifyUrl, setFormSpotifyUrl] = useState('');

  const handleAddAlbum = () => {
    if (!formTitle.trim() || !formArtist.trim()) return;

    const newAlbum: WorshipAlbum = {
      id: `album-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: formTitle,
      artist: formArtist,
      coverUrl: formCoverUrl || undefined,
      spotifyUrl: formSpotifyUrl || undefined,
    };

    onAddAlbum?.(newAlbum);
    setFormTitle('');
    setFormArtist('');
    setFormCoverUrl('');
    setFormSpotifyUrl('');
    setShowAddModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MaterialIcons name="music-note" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Worship</Text>
        </View>
        <Pressable
          onPress={() => setShowAddModal(true)}
          style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialIcons name="add" size={20} color={colors.primary} />
        </Pressable>
      </View>

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

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAddModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowAddModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Album</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.foreground }]}>Album Title *</Text>
              <TextInput
                placeholder="e.g., Hillsong Worship"
                placeholderTextColor={colors.muted}
                value={formTitle}
                onChangeText={setFormTitle}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Artist *</Text>
              <TextInput
                placeholder="e.g., Hillsong United"
                placeholderTextColor={colors.muted}
                value={formArtist}
                onChangeText={setFormArtist}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Album Cover URL</Text>
              <TextInput
                placeholder="https://example.com/cover.jpg"
                placeholderTextColor={colors.muted}
                value={formCoverUrl}
                onChangeText={setFormCoverUrl}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Spotify Link</Text>
              <TextInput
                placeholder="https://open.spotify.com/album/..."
                placeholderTextColor={colors.muted}
                value={formSpotifyUrl}
                onChangeText={setFormSpotifyUrl}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />

              <View style={styles.modalButtons}>
                <Pressable
                  onPress={() => setShowAddModal(false)}
                  style={({ pressed }) => [styles.modalButton, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.modalButtonText, { color: colors.primary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleAddAlbum}
                  disabled={!formTitle.trim() || !formArtist.trim()}
                  style={({ pressed }) => [
                    styles.modalButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: !formTitle.trim() || !formArtist.trim() ? 0.5 : pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Add</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
