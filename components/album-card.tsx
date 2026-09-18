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
          gap: 10,
        }}
      >
        {/* Album Cover Image */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 10,
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
              <MaterialIcons name="music-note" size={28} color={colors.foreground} />
            </View>
          )}
        </View>

        {/* Album Info */}
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: colors.foreground,
            }}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 18,
              lineHeight: 23,
              fontWeight: '700',
              color: colors.muted,
            }}
            numberOfLines={2}
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
        {tracks.length > 0 && (
          <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={22} color={colors.muted} />
        )}
      </Pressable>
      {expanded && tracks.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 4, marginBottom: 2 }} />
          {tracks.map((track, index) => (
            <View key={track.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 30 }}>
              <Text style={{ width: 20, color: colors.muted, fontSize: 12, fontWeight: '700', textAlign: 'right' }}>{index + 1}</Text>
              <MaterialIcons name="music-note" size={17} color={colors.primary} />
              <Text style={{ flex: 1, color: colors.foreground, fontSize: 14, fontWeight: '500' }} numberOfLines={1}>{track.title}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
