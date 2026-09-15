import React, { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';

export interface AlbumCardProps {
  title: string;
  artist: string;
  coverUrl?: string;
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * Material Design album card with image on left, text on right
 */
export function AlbumCard({ 
  title, 
  artist, 
  coverUrl, 
  onOpen,
  onEdit,
  onDelete,
}: AlbumCardProps) {
  const colors = useColors();
  const [imageError, setImageError] = useState(false);
  
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          gap: 12,
        }}
      >
        {/* Album Cover Image */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: colors.muted,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {!imageError && coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={{ width: '100%', height: '100%' }}
              onError={() => setImageError(true)}
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.muted,
              }}
            >
              <MaterialIcons name="music-note" size={32} color={colors.foreground} />
            </View>
          )}
        </View>

        {/* Album Info */}
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: colors.foreground,
            }}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.muted,
            }}
            numberOfLines={1}
          >
            {artist}
          </Text>
        </View>

        {(onOpen || onEdit || onDelete) && (
          <View style={{ gap: 2 }}>
            {onOpen && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open album link"
                onPress={onOpen}
                style={({ pressed }) => [{ opacity: pressed ? 0.55 : 1, padding: 7 }]}
              >
                <MaterialIcons name="open-in-new" size={19} color={colors.primary} />
              </Pressable>
            )}
            {onEdit && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit album"
                onPress={onEdit}
                style={({ pressed }) => [{ opacity: pressed ? 0.55 : 1, padding: 7 }]}
              >
                <MaterialIcons name="edit" size={19} color={colors.muted} />
              </Pressable>
            )}
            {onDelete && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete album"
                onPress={onDelete}
                style={({ pressed }) => [{ opacity: pressed ? 0.55 : 1, padding: 7 }]}
              >
                <MaterialIcons name="delete-outline" size={20} color={colors.error} />
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
