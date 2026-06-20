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
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
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

  // Manual entry form
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleAddSong = () => {
    if (!title.trim()) return;

    onAdd({
      title,
      artist: artist || undefined,
      album: album || undefined,
      orderNumber: orderNumber ? parseInt(orderNumber, 10) : undefined,
      imageUrl: imageUrl || undefined,
    });

    // Reset form
    setTitle('');
    setArtist('');
    setAlbum('');
    setOrderNumber('');
    setImageUrl('');
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setArtist('');
    setAlbum('');
    setOrderNumber('');
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

            <Text style={[styles.label, { color: colors.foreground }]}>Order Number</Text>
            <TextInput
              placeholder="e.g., 1, 2, 3..."
              placeholderTextColor={colors.muted}
              value={orderNumber}
              onChangeText={setOrderNumber}
              keyboardType="number-pad"
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.foreground }]}>Album Cover Photo URL</Text>
            <TextInput
              placeholder="https://example.com/cover.jpg"
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
              onPress={handleAddSong}
              disabled={!title.trim()}
              style={[
                styles.button,
                { backgroundColor: colors.primary, opacity: !title.trim() ? 0.5 : 1 },
              ]}
            >
              <Text style={styles.buttonText}>Add Song</Text>
            </Pressable>
          </View>
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
