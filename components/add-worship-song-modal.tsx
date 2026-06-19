import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import { parseMusicLink } from '@/lib/worship-list';
import type { WorshipSong } from '@/lib/worship-list';

interface AddWorshipSongModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (song: Omit<WorshipSong, 'id'>) => void;
}

export function AddWorshipSongModal({
  visible,
  onClose,
  onAdd,
}: AddWorshipSongModalProps) {
  const colors = useColors();
  const [mode, setMode] = useState<'link' | 'manual'>('link');
  const [loading, setLoading] = useState(false);

  // Link mode
  const [musicLink, setMusicLink] = useState('');

  // Manual mode
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [duration, setDuration] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleAddFromLink = async () => {
    if (!musicLink.trim()) return;

    setLoading(true);
    try {
      const metadata = await parseMusicLink(musicLink);
      if (metadata) {
        onAdd({
          title: metadata.title || 'Unknown Song',
          artist: metadata.artist,
          album: metadata.album,
          imageUrl: metadata.imageUrl,
          spotifyUrl: metadata.spotifyUrl,
          appleMusicUrl: metadata.appleMusicUrl,
        });
        setMusicLink('');
        onClose();
      }
    } catch (error) {
      console.error('Error parsing music link:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddManual = () => {
    if (!title.trim()) return;

    onAdd({
      title,
      artist: artist || undefined,
      album: album || undefined,
      duration: duration || undefined,
      imageUrl: imageUrl || undefined,
    });

    // Reset form
    setTitle('');
    setArtist('');
    setAlbum('');
    setDuration('');
    setImageUrl('');
    onClose();
  };

  const handleClose = () => {
    setMusicLink('');
    setTitle('');
    setArtist('');
    setAlbum('');
    setDuration('');
    setImageUrl('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Add Song</Text>
          <Pressable onPress={handleClose}>
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          {/* Mode Selector */}
          <View style={styles.modeSelector}>
            <Pressable
              onPress={() => setMode('link')}
              style={[
                styles.modeButton,
                mode === 'link' && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  { color: mode === 'link' ? '#FFFFFF' : colors.foreground },
                ]}
              >
                Paste Link
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('manual')}
              style={[
                styles.modeButton,
                mode === 'manual' && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  { color: mode === 'manual' ? '#FFFFFF' : colors.foreground },
                ]}
              >
                Manual Entry
              </Text>
            </Pressable>
          </View>

          {mode === 'link' ? (
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Spotify or Apple Music Link
              </Text>
              <TextInput
                placeholder="https://open.spotify.com/track/..."
                placeholderTextColor={colors.muted}
                value={musicLink}
                onChangeText={setMusicLink}
                editable={!loading}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />
              <Text style={[styles.hint, { color: colors.muted }]}>
                Paste a Spotify or Apple Music link. We'll automatically fetch the song details.
              </Text>
              <Pressable
                onPress={handleAddFromLink}
                disabled={!musicLink.trim() || loading}
                style={[
                  styles.button,
                  { backgroundColor: colors.primary, opacity: !musicLink.trim() || loading ? 0.5 : 1 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Add from Link</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.foreground }]}>Song Title *</Text>
              <TextInput
                placeholder="e.g., Amazing Grace"
                placeholderTextColor={colors.muted}
                value={title}
                onChangeText={setTitle}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Artist</Text>
              <TextInput
                placeholder="e.g., John Newton"
                placeholderTextColor={colors.muted}
                value={artist}
                onChangeText={setArtist}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Album</Text>
              <TextInput
                placeholder="e.g., Hymns of Faith"
                placeholderTextColor={colors.muted}
                value={album}
                onChangeText={setAlbum}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Duration</Text>
              <TextInput
                placeholder="e.g., 3:45"
                placeholderTextColor={colors.muted}
                value={duration}
                onChangeText={setDuration}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Image URL</Text>
              <TextInput
                placeholder="https://..."
                placeholderTextColor={colors.muted}
                value={imageUrl}
                onChangeText={setImageUrl}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />

              <Pressable
                onPress={handleAddManual}
                disabled={!title.trim()}
                style={[
                  styles.button,
                  { backgroundColor: colors.primary, opacity: !title.trim() ? 0.5 : 1 },
                ]}
              >
                <Text style={styles.buttonText}>Add Song</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    marginTop: -12,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
