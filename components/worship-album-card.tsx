import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';

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
        {album.coverUrl && (
          <Image
            source={{ uri: album.coverUrl }}
            style={[styles.cover, { borderColor: colors.primary }]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}
        {!album.coverUrl && (
          <View style={[styles.cover, styles.placeholderCover, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="album" size={24} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {album.title}
          </Text>
          <View style={styles.artistBadge}>
            <Text style={[styles.artistText, { color: colors.primary }]} numberOfLines={1}>
              {album.artist}
            </Text>
          </View>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  artistBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
  },
  artistText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
