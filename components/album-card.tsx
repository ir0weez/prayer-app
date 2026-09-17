import React, { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';

export interface AlbumCardProps {
  title: string;
  artist: string;
  tracks?: Array<{ id: string; title: string }>;
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
  tracks = [],
  coverUrl, 
  onOpen,
  onEdit,
  onDelete,
}: AlbumCardProps) {
  const colors = useColors();
  const [imageError, setImageError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}${tracks.length ? ', show tracks' : ''}`}
        onPress={() => tracks.length > 0 && setExpanded((value) => !value)}
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
                onPress={(event) => { event.stopPropagation?.(); onOpen(); }}
                style={({ pressed }) => [{ opacity: pressed ? 0.55 : 1, padding: 7 }]}
              >
                <MaterialIcons name="open-in-new" size={19} color={colors.primary} />
              </Pressable>
            )}
            {onEdit && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit album"
                onPress={(event) => { event.stopPropagation?.(); onEdit(); }}
                style={({ pressed }) => [{ opacity: pressed ? 0.55 : 1, padding: 7 }]}
              >
                <MaterialIcons name="edit" size={19} color={colors.muted} />
              </Pressable>
            )}
            {onDelete && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete album"
                onPress={(event) => { event.stopPropagation?.(); onDelete(); }}
                style={({ pressed }) => [{ opacity: pressed ? 0.55 : 1, padding: 7 }]}
              >
                <MaterialIcons name="delete-outline" size={20} color={colors.error} />
              </Pressable>
            )}
          </View>
        )}
      </Pressable>
      {expanded && tracks.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          {tracks.map((track, index) => (
            <View key={track.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ width: 20, color: colors.muted, fontSize: 11, fontWeight: '700', textAlign: 'right' }}>{index + 1}</Text>
              <MaterialIcons name="music-note" size={16} color={colors.primary} />
              <Text style={{ flex: 1, color: colors.foreground, fontSize: 13 }} numberOfLines={1}>{track.title}</Text>
            </View>
          ))}
        </View>
      )}
      {tracks.length > 0 && (
        <View pointerEvents="none" style={{ position: 'absolute', right: 12, bottom: expanded ? 10 : 12 }}>
          <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={18} color={colors.muted} />
        </View>
      )}
    </View>
  );
}
