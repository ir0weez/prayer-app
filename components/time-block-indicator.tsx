import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing, type GestureResponderEvent } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useSkin } from "@/hooks/use-skin";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BIT_DUSK, BIT_GOLD, BIT_ON_DUSK_FAINT, BIT_ON_DUSK_SOFT, TERM_DIM, TERM_FONT_FAMILY, TERM_MID, TERM_PANEL, TERM_PHOS } from "@/lib/skin-themes";
import { TimeBlock, timeToMinutes, minutesToTime, whiteBlockHeight, whiteBlockBadge } from "@/lib/time-blocks";
import { mix } from "@/lib/color-themes";
import { format12HourTime } from "@/lib/utils";
import { NowPill } from "./now-indicator";

interface TimeBlockIndicatorProps {
  block: TimeBlock;
  nowMinutes?: number | null;
  onPress?: (block: TimeBlock) => void;
  onLongPress?: (block: TimeBlock, e: GestureResponderEvent) => void;
  onPressOut?: () => void;
}

interface TimeBlockGroupProps {
  blocks: TimeBlock[];
  nowMinutes?: number | null;
  onPress?: (block: TimeBlock) => void;
  onLongPress?: (block: TimeBlock, e: GestureResponderEvent) => void;
  onPressOut?: () => void;
}

/** True when "now" falls inside this white block's hour. */
function blockContainsNow(block: TimeBlock, nowMinutes?: number | null): boolean {
  return (
    nowMinutes != null &&
    timeToMinutes(block.startTime) <= nowMinutes &&
    nowMinutes < timeToMinutes(block.endTime)
  );
}

/**
 * White-space block: a skinny, tappable empty slot for one hour of unscheduled
 * time. Tapping opens the event creator pre-filled with the block's start time.
 * Shows fixed hours (no live countdown); the parent removes blocks once their
 * hour has passed.
 */

/** Card height: 30m compact (52), 60m taller (64), 90m+ tallest (76).
 *  A "now" block shrinks as time passes: >60m left = tall, 31-60m = medium,
 *  1-30m = compact. Disappears at 0 (handled by block filtering). */
function blockCardHeight(block: TimeBlock, nowMinutes?: number | null): number {
  const remaining = nowMinutes != null && blockContainsNow(block, nowMinutes)
    ? timeToMinutes(block.endTime) - nowMinutes
    : null;
  return whiteBlockHeight(block.durationMinutes, remaining);
}

export function TimeBlockIndicator({ block, nowMinutes, onPress, onLongPress, onPressOut }: TimeBlockIndicatorProps) {
  const colors = useColors();
  const { isSkinned, tokens: skinTokens, monoFont } = useSkin();
  const isNow = blockContainsNow(block, nowMinutes);
  const isTerminal = skinTokens.isTerminal;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`White space from ${format12HourTime(block.startTime)} to ${format12HourTime(block.endTime)}. Tap to add an event.`}
      onPress={() => onPress?.(block)}
      onLongPress={(e) => onLongPress?.(block, e)}
      delayLongPress={350}
      onPressOut={() => onPressOut?.()}
      style={({ pressed }) => [
        styles.container,
        {
          // Paper (mockup "Unified"): solid edge, paper-white stock,
          // the kit offset shadow — the dashed Classic edge is gone.
          // 8-bit (v184): the mockup's white block is a DUSK HUD panel
          // — #2A1B4E fill, 3px #6E5BB5 edge, lavender text, gold
          // keyword and duration pill — never a light card.
          // Terminal (v186): the mockup's prompt row — a dashed
          // mid-green edge on the panel green, a ">" for the plus,
          // and the duration as a bracketed [ 30m ] outline pill.
          backgroundColor: isTerminal ? TERM_PANEL : skinTokens.isEightBit ? BIT_DUSK : isSkinned ? skinTokens.surface ?? colors.surface : "#FFFFFF",
          borderColor: isTerminal ? TERM_MID : skinTokens.isEightBit ? "#6E5BB5" : isSkinned ? skinTokens.border ?? colors.border : mix(colors.primary, "#FFFFFF", 0.72),
          borderRadius: isSkinned ? undefined : 22,
          borderStyle: isTerminal ? "dashed" : isSkinned ? "solid" : "dashed",
          opacity: pressed ? 0.65 : 1,
          minHeight: blockCardHeight(block, nowMinutes),
          ...(skinTokens.isEightBit ? { borderWidth: 3, borderRadius: 2 } : {}),
          ...(isTerminal ? { borderWidth: 1.5, borderRadius: 2 } : {}),
          ...({}),
          ...(isSkinned ? skinTokens.cardShadow ?? {} : {}),
        },
      ]}
    >
      <View style={styles.left}>
        {isTerminal ? (
          <Text style={{ fontFamily: TERM_FONT_FAMILY, fontSize: 19, lineHeight: 19, color: TERM_PHOS }}>{">"}</Text>
        ) : (
          <MaterialIcons name="add" size={18} color={skinTokens.isEightBit ? BIT_GOLD : colors.muted} />
        )}
        <Text style={[styles.label, { color: isTerminal ? TERM_MID : skinTokens.isEightBit ? BIT_ON_DUSK_SOFT : colors.muted }, isTerminal && monoFont ? { fontFamily: monoFont } : null]}>Add event?</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[styles.time, { color: isTerminal ? TERM_MID : skinTokens.isEightBit ? BIT_ON_DUSK_FAINT : colors.muted }, isTerminal && monoFont ? { fontFamily: monoFont } : null]}>
          {isNow && nowMinutes != null ? format12HourTime(minutesToTime(nowMinutes)) : format12HourTime(block.startTime)} → {format12HourTime(block.endTime)}
        </Text>
        {(() => {
          if (isNow) return <NowPill />;
          const label = whiteBlockBadge(block.durationMinutes);
          if (isTerminal) {
            return (
              <View style={{ backgroundColor: "transparent", borderWidth: 1.5, borderColor: TERM_PHOS, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: TERM_PHOS, fontSize: 11, fontFamily: TERM_FONT_FAMILY }}>{`[ ${label} ]`}</Text>
              </View>
            );
          }
          return (
            <View style={{ backgroundColor: skinTokens.isEightBit ? BIT_GOLD : colors.primary, borderRadius: skinTokens.isEightBit ? 2 : 8, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: skinTokens.isEightBit ? "#241547" : "#FFFFFF", fontSize: 10, fontWeight: "800" }}>{label}</Text>
            </View>
          );
        })()}
      </View>
    </Pressable>
  );
}

/**
 * A run of hour-adjacent white blocks rendered as ONE touching box, with a
 * separate tappable row per hour divided by hairlines. Each row still opens
 * the event creator pre-filled with its own hour.
 */
export function TimeBlockGroup({ blocks, nowMinutes, onPress, onLongPress, onPressOut }: TimeBlockGroupProps) {
  const colors = useColors();
  const { isSkinned, tokens: skinTokens, monoFont } = useSkin();
  const isTerminal = skinTokens.isTerminal;
  if (blocks.length === 0) return null;

  return (
    <View
      accessibilityRole="button"
      style={[
        styles.groupContainer,
        {
          backgroundColor: isTerminal ? TERM_PANEL : skinTokens.isEightBit ? BIT_DUSK : isSkinned ? skinTokens.surface ?? colors.surface : "#FFFFFF",
          borderColor: isTerminal ? TERM_MID : skinTokens.isEightBit ? "#6E5BB5" : isSkinned ? skinTokens.border ?? colors.border : mix(colors.primary, "#FFFFFF", 0.72),
          borderRadius: isSkinned ? undefined : 22,
          borderStyle: isTerminal ? "dashed" : isSkinned ? "solid" : "dashed",
          ...(skinTokens.isEightBit ? { borderWidth: 3, borderRadius: 2 } : {}),
          ...(isTerminal ? { borderWidth: 1.5, borderRadius: 2 } : {}),
          ...({}),
          ...(isSkinned ? skinTokens.cardShadow ?? {} : {}),
        },
      ]}
    >
      {blocks.map((block, index) => (
        <Pressable
          key={block.id}
          accessibilityRole="button"
          accessibilityLabel={`White space from ${format12HourTime(block.startTime)} to ${format12HourTime(block.endTime)}. Tap to choose what to add.`}
          onPress={() => onPress?.(block)}
          onLongPress={(e) => onLongPress?.(block, e)}
          delayLongPress={350}
          onPressOut={() => onPressOut?.()}
          style={({ pressed }) => [
            styles.groupRow,
            index > 0 && {
              borderTopWidth: skinTokens.isEightBit ? 2 : StyleSheet.hairlineWidth,
              borderTopColor: isTerminal ? TERM_DIM : skinTokens.isEightBit ? "#6E5BB5" : colors.border,
            },
            {
              opacity: pressed ? 0.65 : 1,
              // Height scales subtly with duration
              minHeight: blockCardHeight(block, nowMinutes),
            },
          ]}
        >
          {isTerminal ? (
            <TermPromptLabel startIndex={index} />
          ) : (
            <CyclingAddLabel startIndex={index} mutedColor={skinTokens.isEightBit ? BIT_ON_DUSK_SOFT : colors.muted} accentColor={skinTokens.isEightBit ? BIT_GOLD : colors.primary} />
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[styles.time, { color: isTerminal ? TERM_MID : skinTokens.isEightBit ? BIT_ON_DUSK_FAINT : colors.muted }, isTerminal && monoFont ? { fontFamily: monoFont } : null]}>
              {(() => {
                const isNowBlock = blockContainsNow(block, nowMinutes);
                const start = isNowBlock && nowMinutes != null ? minutesToTime(nowMinutes) : block.startTime;
                return `${format12HourTime(start)} → ${format12HourTime(block.endTime)}`;
              })()}
            </Text>
            {(() => {
              const isNow = blockContainsNow(block, nowMinutes);
              if (isNow) return <NowPill />;
              // Duration badge: 30m, 1h, 1h 30m (shared formatter).
              const label = whiteBlockBadge(block.durationMinutes);
              if (isTerminal) {
                return (
                  <View style={{ backgroundColor: "transparent", borderWidth: 1.5, borderColor: TERM_PHOS, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: TERM_PHOS, fontSize: 11, fontFamily: TERM_FONT_FAMILY }}>{`[ ${label} ]`}</Text>
                  </View>
                );
              }
              return (
                <View style={{ backgroundColor: skinTokens.isEightBit ? BIT_GOLD : colors.primary, borderRadius: skinTokens.isEightBit ? 2 : 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: skinTokens.isEightBit ? "#241547" : "#FFFFFF", fontSize: 10, fontWeight: "800" }}>{label}</Text>
                </View>
              );
            })()}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const ADD_WORDS = ["event", "todo", "ministry", "rest"];
const WORD_CYCLE_MS = 2800;

/**
 * Terminal prompt label (v186): the mockup's white-block row —
 * "> add ministry ?" as standing text. NO cycling, NO wavy letters:
 * the terminal doesn't animate its prompts; each row keeps the word
 * its startIndex assigns, in VT323 with the keyword lit bright.
 */
function TermPromptLabel({ startIndex }: { startIndex: number }) {
  const word = ADD_WORDS[startIndex % ADD_WORDS.length];
  return (
    <View style={styles.left}>
      <Text style={{ fontFamily: TERM_FONT_FAMILY, fontSize: 19, lineHeight: 19, color: TERM_PHOS }}>{">"}</Text>
      <Text style={{ fontFamily: TERM_FONT_FAMILY, fontSize: 17, color: TERM_MID }}>add </Text>
      <Text style={{ fontFamily: TERM_FONT_FAMILY, fontSize: 17, color: TERM_PHOS }}>{word}</Text>
      <Text style={{ fontFamily: TERM_FONT_FAMILY, fontSize: 17, color: TERM_MID }}>?</Text>
    </View>
  );
}

/**
 * "add <event|todo|ministry|rest>?" — each row starts on a different word of
 * the loop and they all cycle together, so neighboring rows always say
 * something different. The switch is a soft fade with a slight rise — calm,
 * no bounce. The word itself sits still (his ruling: no letter wave).
 */
function CyclingAddLabel({ startIndex, mutedColor, accentColor }: { startIndex: number; mutedColor: string; accentColor: string }) {
  const [wordIndex, setWordIndex] = useState(startIndex);
  const anim = useRef(new Animated.Value(0)).current;

  const translateY = anim.interpolate({ inputRange: [-1, 0, 1], outputRange: [6, 0, -6] });
  const opacity = anim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] });

  useEffect(() => {
    const wordTimer = setInterval(() => {
      Animated.timing(anim, { toValue: 1, duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => {
        setWordIndex((w) => (w + 1) % ADD_WORDS.length);
        anim.setValue(-1);
        Animated.timing(anim, { toValue: 0, duration: 240, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
      });
    }, WORD_CYCLE_MS);
    return () => clearInterval(wordTimer);
  }, [anim]);

  return (
    <View style={styles.left}>
      <MaterialIcons name="add" size={18} color={mutedColor} />
      <Text style={[styles.label, { color: mutedColor }]}>add </Text>
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Text style={[styles.label, { color: accentColor, fontWeight: "800" }]}>
          {ADD_WORDS[wordIndex % ADD_WORDS.length]}
        </Text>
      </Animated.View>
      <Text style={[styles.label, { color: mutedColor }]}>?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  time: {
    fontSize: 12,
    fontWeight: "500",
  },
  groupContainer: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  groupRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
