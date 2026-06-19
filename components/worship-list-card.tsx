import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import type { WorshipList } from '@/lib/worship-list';

interface WorshipListCardProps {
  list: WorshipList;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function WorshipListCard({
  list,
  onPress,
  onEdit,
  onDelete,
}: WorshipListCardProps) {
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
        {list.imageUrl && (
          <Image
            source={{ uri: list.imageUrl }}
            style={[styles.cover, { borderColor: list.color || colors.primary }]}
          />
        )}
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {list.name}
          </Text>
          <Text style={[styles.songCount, { color: colors.muted }]}>
            {list.songs.length} {list.songs.length === 1 ? 'song' : 'songs'}
          </Text>
          {list.description && (
            <Text style={[styles.description, { color: colors.muted }]} numberOfLines={2}>
              {list.description}
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
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  songCount: {
    fontSize: 12,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
