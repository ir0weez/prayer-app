/**
 * v473 — the shared add FAB: the Circle morph + the spring menu.
 * (Jonathan's picks, Nov 8 — fab-speed-dial FAB-2 for the menu,
 * fab-plus-circle-morph-concepts-v2 for the button.)
 *
 * One component serves both add doors: Schedule (through the
 * shell bridge — lib/schedule-fab-bridge.ts / ScheduleFabHost)
 * and People (rendered by the shell directly). Same seat, same
 * motion, same feel; only the glyph's mark and the menu's items
 * differ by page.
 *
 * THE BUTTON stays a 56dp circle in the page's own colour dress.
 * Its glyph is the Circle morph (components/fab-circle-glyph.tsx):
 * the + whips into a drawn ring — a person inside it on People,
 * a check on Schedule — and the ring IS the open state. There
 * is no × and no container morph anymore: the v294–v362 form
 * (the button growing into a 218×276 menu card, the + rotating
 * 135° into a ×, tonal row tiles) is superseded whole.
 *
 * THE MENU is FAB-2's Tumblr spring: a dim scrim
 * (rgba(24,20,44,.38)) over the page — the page itself scales
 * to .975 behind it (useFabPageScale, applied by each page) —
 * and the items rise from the FAB as 48dp full-colour circles
 * with white icons and white bold labels at their left. The
 * item nearest the FAB leads at 430ms; each item farther away
 * follows 55ms later (the approved mockup's own delay math:
 * 430 + (count - 1 - index) * 55). Labels slide in 45ms after
 * their circle. On close everything leaves at once, no stagger.
 *
 * The seat is unchanged (v298): under Classic the FAB's bottom
 * edge clears the shell tab bar's occupied height by 12; the
 * floating skin bars leave the right-hand notch, seat 60.
 */

import React, { useEffect } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTabBarOccupiedHeight } from "@/components/app-tab-bar";
import { FabCircleGlyph, type FabGlyphVariant } from "@/components/fab-circle-glyph";
import { useSkin } from "@/hooks/use-skin";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import ReAnimated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

export type FabMenuItem = {
  key: string;
  label: string;
  icon: string;
  /** The item's own colour — the menu circle's fill (his colours). */
  color: string;
  /** Icon colour on the circle; defaults to white. */
  iconColor?: string;
  onPress: () => void;
};

/** FAB-2's spring, as drawn: cubic-bezier(.34,1.45,.64,1). */
const MENU_SPRING = Easing.bezier(0.34, 1.45, 0.64, 1);
/** The mockup's scene settle: 350ms, cubic-bezier(.2,0,0,1). */
const PAGE_SCALE_MS = 350;

/**
 * v473: the page's own half of the open state — while its FAB
 * menu is open, the page content scales subtly to .975 (the
 * approved mockups draw the scene shrinking behind the dim).
 * Each page applies the returned style to its content root,
 * driven by the same open state it hands the FAB.
 */
export function useFabPageScale(open: boolean) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withTiming(open ? 0.975 : 1, {
      duration: PAGE_SCALE_MS,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
  }, [open, scale]);
  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
}

function FabRow({
  item,
  index,
  count,
  open,
}: {
  item: FabMenuItem;
  index: number;
  count: number;
  open: boolean;
}) {
  const progress = useSharedValue(0);
  const labelProgress = useSharedValue(0);

  // FAB-2's stagger, the mockup's own math: items are listed
  // top-to-bottom (farthest from the FAB first), and the delay
  // runs 430 + (count - 1 - index) * 55 — so the item NEAREST
  // the FAB leads at 430ms and each farther item follows 55ms
  // later, the circles cascading up out of the button. Each row
  // rides its OWN spring (no shared morph progress — the v362
  // lag was rows slicing one surface's timeline, not the
  // stagger itself). Close: everything leaves at once.
  const delay = 430 + (count - 1 - index) * 55;

  useEffect(() => {
    if (open) {
      progress.value = withDelay(delay, withTiming(1, { duration: 420, easing: MENU_SPRING }));
      labelProgress.value = withDelay(delay + 45, withTiming(1, { duration: 300, easing: MENU_SPRING }));
    } else {
      progress.value = withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) });
      labelProgress.value = withTiming(0, { duration: 120, easing: Easing.in(Easing.quad) });
    }
  }, [open, delay, progress, labelProgress]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.38], [0, 1], "clamp"),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [26, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.6, 1]) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelProgress.value,
    transform: [{ translateX: interpolate(labelProgress.value, [0, 1], [12, 0]) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${item.label}`}
      onPress={item.onPress}
      pointerEvents={open ? "auto" : "none"}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <ReAnimated.View style={[{ flexDirection: "row", alignItems: "center", gap: 10 }, rowStyle]}>
        <ReAnimated.View style={labelStyle}>
          <Text
            style={{
              fontSize: 13.5,
              fontWeight: "700",
              color: "#FFFFFF",
              textShadowColor: "rgba(0,0,0,0.35)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 5,
            }}
          >
            {item.label}
          </Text>
        </ReAnimated.View>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: item.color,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#14102A",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          <MaterialIcons name={item.icon as any} size={22} color={item.iconColor ?? "#FFFFFF"} />
        </View>
      </ReAnimated.View>
    </Pressable>
  );
}

export function ScheduleFab({
  open,
  onToggle,
  items,
  fabColor,
  glyphColor,
  glyphVariant,
  scrimTone = "violet",
  getFacePressedStyles,
}: {
  open: boolean;
  onToggle: () => void;
  items: FabMenuItem[];
  fabColor: string;
  /** The glyph's stroke colour, both faces (+ and ring). */
  glyphColor: string;
  /** The mark inside the ring: a person (People) or a check (Schedule). */
  glyphVariant: FabGlyphVariant;
  /** The scrim's family: the approved neutral dim, or the skins' deeper dark. */
  scrimTone?: "violet" | "dark";
  /**
   * The skins' pressed treatments for the FAB face, supplied by
   * the owning page (Paper lifts, 8-bit depresses — the v202/v203
   * passes); the button keeps them on its face.
   */
  getFacePressedStyles?: (pressed: boolean) => Array<StyleProp<ViewStyle>>;
}) {
  const scrimColor = scrimTone === "dark" ? "rgba(10,6,24,0.52)" : "rgba(24,20,44,0.38)";
  // v298: the seat derives from the shell's own tab-bar metric.
  // The fixed bottom straddled his attached Classic bar (13 + 58
  // + 20 = 91 tall with its pads — his Oct 28 screenshot: "the
  // plus fab is now literally over the tab bar"). Under Classic
  // the FAB's bottom edge now clears the bar's top edge by 12.
  // The skins' bar FLOATS (left 18 / right 83), leaving the
  // FAB's right-hand notch open — its seat is unchanged.
  const tabBarOccupied = useTabBarOccupiedHeight();
  const { tokens: fabSkinTokens } = useSkin();
  const fabBottom = fabSkinTokens.id === "classic" ? tabBarOccupied + 12 : 60;

  const scrimProgress: SharedValue<number> = useSharedValue(0);
  useEffect(() => {
    scrimProgress.value = withTiming(open ? 1 : 0, {
      duration: 300,
      easing: Easing.inOut(Easing.quad),
    });
  }, [open, scrimProgress]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimProgress.value,
  }));

  return (
    <>
      <ReAnimated.View
        pointerEvents={open ? "auto" : "none"}
        style={[
          { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: scrimColor, zIndex: 90 },
          scrimStyle,
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={onToggle} accessibilityLabel="Close add menu" />
      </ReAnimated.View>

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: 15,
          bottom: fabBottom,
          zIndex: 95,
          alignItems: "flex-end",
        }}
      >
        <View
          pointerEvents="box-none"
          style={{ flexDirection: "column", alignItems: "flex-end", gap: 14, marginBottom: 12 }}
        >
          {items.map((item, index) => (
            <FabRow key={item.key} item={item} index={index} count={items.length} open={open} />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? "Close add menu" : "Add"}
          onPress={onToggle}
          style={({ pressed }) => [
            {
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: fabColor,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#2E1065",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 14,
              elevation: 8,
              opacity: pressed ? 0.85 : 1,
            },
            ...(getFacePressedStyles?.(pressed) ?? []),
          ]}
        >
          <FabCircleGlyph open={open} variant={glyphVariant} color={glyphColor} />
        </Pressable>
      </View>
    </>
  );
}
