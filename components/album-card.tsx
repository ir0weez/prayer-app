import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/use-colors';

export interface AlbumCardProps {
  title: string;
  artist: string;
  tracks?: Array<{ id: string; title: string; key?: string }>;
  completedTracks?: Record<string, boolean>;
  onToggleTrack?: (trackId: string) => void;
  coverUrl?: string;
  onOpen?: () => void;
  onOpenDetails?: () => void;
  onCoverPress?: () => void;
  onEdit?: () => void;
  onToggleSaved?: () => void;
  isSaved?: boolean;
  onDelete?: () => void;
  onOpenLibrary?: () => void;
  isExpanded?: boolean;
  onToggleExpanded?: (expanded: boolean) => void;
  sectionTitle?: string;
  sectionIcon?: keyof typeof MaterialIcons.glyphMap;
}

export function AlbumCard({
  title,
  artist,
  tracks = [],
  completedTracks = {},
  onToggleTrack,
  coverUrl,
  onOpen,
  onOpenDetails,
  onCoverPress,
  onEdit,
  onToggleSaved,
  isSaved = false,
  onDelete,
  onOpenLibrary,
  isExpanded,
  onToggleExpanded,
  sectionTitle,
  sectionIcon = 'music-note',
}: AlbumCardProps) {
  const colors = useColors();
  const [imageError, setImageError] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = isExpanded ?? internalExpanded;
  const hasActions = tracks.length > 0 || onEdit || onToggleSaved || onDelete || onOpen;
  const toggleExpanded = () => {
    const nextExpanded = !expanded;
    if (onToggleExpanded) onToggleExpanded(nextExpanded);
    else setInternalExpanded(nextExpanded);
  };

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
      {sectionTitle && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 }}>
          <MaterialIcons name={sectionIcon} size={20} color={colors.primary} />
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '600' }}>{sectionTitle}</Text>
          {onOpenLibrary && (
            <Pressable accessibilityRole="button" accessibilityLabel="Open saved albums" onPress={onOpenLibrary} style={({ pressed }) => [{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}>
              <MaterialIcons name="collections-bookmark" size={17} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Saved Albums</Text>
            </Pressable>
          )}
        </View>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}${tracks.length ? ', show tracks' : ''}`} onPress={() => onOpenDetails ? onOpenDetails() : hasActions && toggleExpanded()} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
        <Pressable
          accessibilityRole={onCoverPress ? "button" : undefined}
          accessibilityLabel={onCoverPress ? `Open ${title} album` : undefined}
          disabled={!onCoverPress}
          onPress={onCoverPress}
          style={({ pressed }) => [{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}
        >
          {!imageError && coverUrl ? (
            <Image source={{ uri: coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" onError={() => setImageError(true)} />
          ) : (
            <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.muted }}>
              <MaterialIcons name="music-note" size={28} color={colors.foreground} />
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={2}>{title}</Text>
          <Text style={{ fontSize: 18, lineHeight: 23, fontWeight: '700', color: colors.muted }} numberOfLines={2}>{artist}</Text>
        </View>
        {hasActions && <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={22} color={colors.muted} />}
      </Pressable>
      {expanded && hasActions && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 4, marginBottom: 2 }} />
          {tracks.map((track, index) => {
            const isCompleted = Boolean(completedTracks[track.id]);
            const trackContent = (
              <>
                <Text style={{ width: 20, color: isCompleted ? colors.primary : colors.muted, fontSize: 12, fontWeight: '700', textAlign: 'right' }}>{index + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: isCompleted ? colors.muted : colors.foreground, fontSize: 14, fontWeight: '500', textDecorationLine: isCompleted ? 'line-through' : 'none' }} numberOfLines={1}>{track.title}</Text>
                  {track.key && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2, textDecorationLine: isCompleted ? 'line-through' : 'none' }}>Key of {track.key}</Text>}
                </View>
                {onToggleTrack && <MaterialIcons name={isCompleted ? 'check-circle' : 'radio-button-unchecked'} size={18} color={isCompleted ? colors.primary : colors.border} />}
              </>
            );
            return onToggleTrack ? (
              <Pressable key={track.id} accessibilityRole="button" accessibilityLabel={`${isCompleted ? 'Mark' : 'Complete'} ${track.title}`} onPress={() => onToggleTrack(track.id)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 30, borderRadius: 8, opacity: pressed ? 0.65 : 1 }]}>
                {trackContent}
              </Pressable>
            ) : (
              <View key={track.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 30 }}>
                {trackContent}
              </View>
            );
          })}
          {tracks.length === 0 && <Text style={{ color: colors.muted, fontSize: 13, paddingVertical: 4 }}>No songs added yet.</Text>}
          {(onOpen || onEdit || onToggleSaved || onDelete) && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
              {onOpen && <Pressable accessibilityRole="button" accessibilityLabel="Open album link" onPress={onOpen} style={({ pressed }) => [{ flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name="open-in-new" size={19} color={colors.primary} /><Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Open</Text></Pressable>}
              {onEdit && <Pressable accessibilityRole="button" accessibilityLabel="Edit album" onPress={onEdit} style={({ pressed }) => [{ width: 56, minHeight: 44, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name="edit" size={20} color={colors.foreground} /></Pressable>}
              {onToggleSaved && <Pressable accessibilityRole="button" accessibilityLabel={isSaved ? "Remove album from saved" : "Save album"} onPress={onToggleSaved} style={({ pressed }) => [{ width: 56, minHeight: 44, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: isSaved ? colors.primary : colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name={isSaved ? 'star' : 'star-border'} size={21} color={isSaved ? colors.primary : colors.foreground} /></Pressable>}
              {onDelete && <Pressable accessibilityRole="button" accessibilityLabel="Delete album" onPress={onDelete} style={({ pressed }) => [{ flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: colors.error, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name="delete-outline" size={20} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Delete</Text></Pressable>}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
