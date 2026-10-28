import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/use-colors';
import { useSkin } from '@/hooks/use-skin';
import { mix } from '@/lib/color-themes';
import { TERM_PHOS, hasTypeScale, skinText } from '@/lib/skin-themes';

export interface AlbumCardProps {
  title: string;
  artist: string;
  tracks?: Array<{ id: string; title: string; key?: string }>;
  completedTracks?: Record<string, boolean>;
  onToggleTrack?: (trackId: string, pressEvent?: any) => void;
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

/**
 * v295: the worship card recomposed to the approved v19-fixed drawing —
 * header ("This week's music" + the Saved Albums text button), the
 * album cover as the card's art at 80px with title / artist / heard
 * count / progress thread beside it, and the songs as an always-visible
 * checklist: number, title, Key, and the M3 checkbox in the seed.
 * Heard rows strike through and quiet down. NO caption, NO label pill.
 * The management actions (Open / Edit / Save / Delete) stay behind the
 * header chevron — the drawing's face stays clean; nothing is lost.
 */
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
}: AlbumCardProps) {
  const colors = useColors();
  const { isSkinned, tokens: skinTokens } = useSkin();
  // v298: under Classic the v32 drawing's metrics rule — the
  // CLASSIC_TYPE_SCALE spreads (15px rowBody, 20px cardTitle, 18px
  // sectionTitle…) inflated every worship row on his phone (the same
  // spread family v297 removed from the todo rows). The type scale
  // now applies only where it belongs: the skinned dresses.
  const classic = !isSkinned;
  const scaleText = hasTypeScale(skinTokens) && isSkinned;
  const [imageError, setImageError] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = isExpanded ?? internalExpanded;
  const hasActions = Boolean(onOpen || onEdit || onToggleSaved || onDelete);
  const toggleExpanded = () => {
    const nextExpanded = !expanded;
    if (onToggleExpanded) onToggleExpanded(nextExpanded);
    else setInternalExpanded(nextExpanded);
  };
  const heardCount = tracks.filter((track) => completedTracks[track.id]).length;
  const heardPct = tracks.length > 0 ? Math.round((heardCount / tracks.length) * 100) : 0;
  const deepPrimary = skinTokens.isTerminal ? TERM_PHOS : mix(colors.primary, "#000000", 0.15);

  return (
    <View style={{ backgroundColor: isSkinned ? skinTokens.surface ?? colors.surface : colors.surface, borderRadius: isSkinned ? skinTokens.cardRadius ?? 22 : 22, overflow: 'hidden', borderWidth: 1, borderColor: isSkinned ? skinTokens.border ?? colors.border : mix(colors.primary, colors.surface, 0.85), marginBottom: isSkinned ? 12 + skinTokens.type.gapBoost : 12, ...(classic ? { paddingTop: 13, paddingHorizontal: 15, paddingBottom: 11 } : { padding: 16 }), ...(isSkinned ? skinTokens.cardShadow ?? {} : {}), ...(skinTokens.frame ?? {}) }}>
      {sectionTitle && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '800', ...(scaleText ? skinText(skinTokens, skinTokens.type.sectionTitle, skinTokens.type.sectionLineHeight) : null) }}>{sectionTitle}</Text>
          {onOpenLibrary && (
            <Pressable accessibilityRole="button" accessibilityLabel="Open saved albums" onPress={onOpenLibrary} style={({ pressed }) => [{ marginLeft: 'auto', paddingVertical: 4, opacity: pressed ? 0.65 : 1 }]}>
              <Text style={{ color: classic ? deepPrimary : skinTokens.isTerminal ? TERM_PHOS : colors.primary, fontSize: classic ? 12 : 12.5, fontWeight: classic ? '700' : '800', ...(scaleText ? skinText(skinTokens, skinTokens.type.labelText) : null) }}>Saved Albums</Text>
            </Pressable>
          )}
          {hasActions && (
            <Pressable accessibilityRole="button" accessibilityLabel={expanded ? "Hide album actions" : "Show album actions"} onPress={() => (onOpenDetails ? onOpenDetails() : toggleExpanded())} style={({ pressed }) => [{ padding: 2, opacity: pressed ? 0.65 : 1 }]}>
              <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: classic ? 12 : 13, marginTop: sectionTitle ? 12 : 0 }}>
        <Pressable
          accessibilityRole={onCoverPress ? "button" : undefined}
          accessibilityLabel={onCoverPress ? `Open ${title} album` : undefined}
          disabled={!onCoverPress}
          onPress={onCoverPress}
          style={({ pressed }) => [{ width: 80, height: 80, borderRadius: classic ? 10 : 16, overflow: 'hidden', backgroundColor: colors.muted, borderWidth: 1, borderColor: isSkinned ? skinTokens.border ?? colors.border : mix(colors.primary, colors.surface, 0.85), opacity: pressed ? 0.72 : 1 }]}
        >
          {!imageError && coverUrl ? (
            <Image source={{ uri: coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" onError={() => setImageError(true)} />
          ) : (
            <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.muted }}>
              <MaterialIcons name="music-note" size={34} color={colors.foreground} />
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1, gap: classic ? 0 : 3 }}>
          <Text style={{ fontSize: 16.5, fontWeight: '800', color: colors.foreground, ...(scaleText ? skinText(skinTokens, skinTokens.type.cardTitle) : null) }} numberOfLines={2}>{title}</Text>
          <Text style={{ fontSize: 12.5, fontWeight: classic ? '700' : '400', color: colors.muted, marginTop: classic ? 2 : 0, ...(scaleText ? skinText(skinTokens, skinTokens.type.cardMeta) : null) }} numberOfLines={1}>{artist}</Text>
          {tracks.length > 0 && (
            <>
              <Text style={{ fontSize: 11.5, fontWeight: classic ? '600' : '700', color: classic ? colors.muted : deepPrimary, marginTop: classic ? 5 : 2 }}>
                {heardCount} of {tracks.length} heard
              </Text>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: mix(colors.primary, colors.surface, 0.82), maxWidth: 150, width: '100%', overflow: 'hidden', marginTop: classic ? 6 : 3 }}>
                <View style={{ height: '100%', width: `${heardPct}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
              </View>
            </>
          )}
        </View>
      </View>
      {tracks.length > 0 ? (
        <View style={{ marginTop: 10 }}>
          {tracks.map((track, index) => {
            const isCompleted = Boolean(completedTracks[track.id]);
            return (
              <Pressable
                key={track.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isCompleted }}
                accessibilityLabel={`${isCompleted ? 'Mark' : 'Complete'} ${track.title}`}
                onPress={(e) => onToggleTrack?.(track.id, e)}
                style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: classic ? 9 : 10, paddingVertical: classic ? 6 : 7, paddingHorizontal: 2, opacity: pressed ? 0.65 : 1 }]}
              >
                {/* v298: the drawing's number cell — 18px wide,
                    right-aligned, 12/800, never wraps (his 10–16
                    stacked vertically in the old 14px cell). Done
                    rows take the seed; open rows the muted step. */}
                <Text numberOfLines={1} style={classic ? { width: 18, textAlign: 'right', color: isCompleted ? colors.primary : mix(colors.primary, colors.surface, 0.45), fontSize: 12, fontWeight: '800' } : { width: 14, color: colors.muted, fontSize: 11.5, fontWeight: '600' }}>{index + 1}</Text>
                {/* v298: title + key as the drawing's column — the key
                    is a quiet sub-line under the title, rendered only
                    when the song carries one (his Oct 28 ruling: no
                    key entered, no line). */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: isCompleted ? (classic ? mix(colors.primary, colors.surface, 0.35) : colors.muted) : colors.foreground, fontSize: 13.5, fontWeight: '600', textDecorationLine: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? (classic ? 1 : 0.55) : 1, ...(scaleText ? skinText(skinTokens, skinTokens.type.rowBody, skinTokens.type.rowBodyLineHeight) : null) }} numberOfLines={1}>{track.title}</Text>
                  {track.key ? <Text style={{ color: isCompleted ? (classic ? mix(colors.primary, colors.surface, 0.35) : colors.muted) : colors.muted, fontSize: 11.5, marginTop: 1, ...(scaleText ? skinText(skinTokens, skinTokens.type.cardMeta) : null) }} numberOfLines={1}>Key of {track.key}</Text> : null}
                </View>
                <View style={{ width: 22, height: 22, borderRadius: (skinTokens.isEightBit || skinTokens.isTerminal) ? 2 : classic ? 6 : 7, borderWidth: classic ? 2.5 : 2, borderColor: isCompleted ? colors.primary : classic ? colors.primary : mix(colors.primary, colors.surface, 0.55), backgroundColor: isCompleted ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {isCompleted && <MaterialIcons name="check" size={13} color="#FFFFFF" />}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 12 }}>No songs added yet.</Text>
      )}
      {expanded && hasActions && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
          {onOpen && <Pressable accessibilityRole="button" accessibilityLabel="Open album link" onPress={onOpen} style={({ pressed }) => [{ flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name="open-in-new" size={19} color={colors.primary} /><Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Open</Text></Pressable>}
          {onEdit && <Pressable accessibilityRole="button" accessibilityLabel="Edit album" onPress={onEdit} style={({ pressed }) => [{ width: 56, minHeight: 44, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name="edit" size={20} color={colors.foreground} /></Pressable>}
          {onToggleSaved && <Pressable accessibilityRole="button" accessibilityLabel={isSaved ? "Remove album from saved" : "Save album"} onPress={onToggleSaved} style={({ pressed }) => [{ width: 56, minHeight: 44, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: isSaved ? colors.primary : colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name={isSaved ? 'star' : 'star-border'} size={21} color={isSaved ? colors.primary : colors.foreground} /></Pressable>}
          {onDelete && <Pressable accessibilityRole="button" accessibilityLabel="Delete album" onPress={onDelete} style={({ pressed }) => [{ flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: colors.error, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name="delete-outline" size={20} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Delete</Text></Pressable>}
        </View>
      )}
    </View>
  );
}
