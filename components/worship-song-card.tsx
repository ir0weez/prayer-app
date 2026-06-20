import React from 'react';
import { View, Text, Pressable, StyleSheet, Image, Linking } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import type { WorshipSong } from '@/lib/worship-list';

interface WorshipSongCardProps {
  song: WorshipSong;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function WorshipSongCard({
  song,
  onEdit,
  onDelete,
}: WorshipSongCardProps) {
  const colors = useColors();



  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.content}>
        {song.imageUrl && (
          <Image
            source={{ uri: song.imageUrl }}
            style={styles.thumbnail}
          />
        )}
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {song.title}
          </Text>
          {song.artist && (
            <Text style={[styles.artist, { color: colors.muted }]} numberOfLines={1}>
              {song.artist}
            </Text>
          )}
          {song.album && (
            <Text style={[styles.album, { color: colors.muted }]} numberOfLines={1}>
              {song.album}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          {onEdit && (
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <MaterialIcons name="edit" size={20} color={colors.primary} />
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <MaterialIcons name="delete" size={20} color={colors.error} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
    marginBottom: 2,
  },
  album: {
    fontSize: 11,
    marginBottom: 2,
  },

  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
