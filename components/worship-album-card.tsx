import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import { VinylRecord } from './vinyl-record';
import { WorshipThoughtBubble } from './worship-thought-bubble';

export interface WorshipAlbum {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  spotifyUrl?: string;
}

interface WorshipAlbumCardProps {
  album: WorshipAlbum;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function WorshipAlbumCard({
  album,
  onPress,
  onEdit,
  onDelete,
}: WorshipAlbumCardProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Spinning vinyl record */}
        <View style={styles.vinylContainer}>
          <VinylRecord albumArtUrl={album.coverUrl} size={100} isPlaying={true} />
        </View>

        {/* Thought bubble with album info */}
        <View style={styles.bubbleContainer}>
          <WorshipThoughtBubble albumTitle={album.title} artistName={album.artist} />
        </View>

        {/* Delete button */}
        {onDelete && (
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="close" size={20} color={colors.error} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    position: 'relative',
  },
  vinylContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  deleteButton: {
    padding: 8,
  },
});
