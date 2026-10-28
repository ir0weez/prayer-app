/**
 * v294 — the schedule FAB, Material 3 form and motion.
 *
 * His function is unchanged: one tap opens his five-option add menu
 * (Ministry · Event · Todo · Worship · Time Off, his order, his colours).
 * The form is the v31 drawing's: the button does not sit beside a menu
 * card — the button BECOMES the menu. One surface morphs from the FAB
 * (56×56, radius 16, seed) to the menu (218×276, radius 20, tonal
 * container) on Material's emphasized decelerate, and closes on the
 * emphasized accelerate; the + rotates 135° into a × as it goes; the
 * five rows stagger-rise inside; a deep scrim fades with the state; a
 * press ripple answers a row tap. Flowy, and fun to press.
 */

import React, { useEffect } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import ReAnimated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

export type FabMenuItem = {
  key: string;
  label: string;
  icon: string;
  /** The row's icon-tile colour (his menu's own colours). */
  color: string;
  /** Icon colour on the tile; defaults to white. */
  iconColor?: string;
  /**
   * v295: the v32 drawing's tile dress — a TONAL tile (pale step of
   * the row's colour) with the deep step as the glyph. Supplied for
   * the Classic dress; skins that don't supply it keep the saturated
   * tile + iconColor glyph they shipped with.
   */
  tileColor?: string;
  /** Glyph colour when tileColor is supplied; defaults to color. */
  glyphColor?: string;
  onPress: () => void;
};

const EMPHASIZED_IN = Easing.bezier(0.05, 0.7, 0.1, 1);
const EMPHASIZED_OUT = Easing.bezier(0.3, 0, 0.8, 0.15);

function FabRow({
  item,
  index,
  progress,
  labelColor,
}: {
  item: FabMenuItem;
  index: number;
  progress: SharedValue<number>;
  labelColor: string;
}) {
  const ripple = useSharedValue(0);

  const rowStyle = useAnimatedStyle(() => {
    const start = 0.3 + index * 0.07;
    return {
      opacity: interpolate(progress.value, [start, start + 0.45], [0, 1]),
      transform: [{ translateY: interpolate(progress.value, [start, start + 0.45], [10, 0]) }],
    };
  });

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ripple.value, [0, 1], [0.32, 0]),
    transform: [{ scale: interpolate(ripple.value, [0, 1], [0.3, 1.8]) }],
  }));

  return (
    <ReAnimated.View style={rowStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${item.label}`}
        onPressIn={() => {
          ripple.value = 0;
          ripple.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) });
        }}
        onPress={item.onPress}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            minHeight: 52,
            paddingHorizontal: 16,
            paddingVertical: 6,
            opacity: pressed ? 0.75 : 1,
            overflow: "hidden",
          },
        ]}
      >
        <ReAnimated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: 14,
              top: "50%",
              marginTop: -32,
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: item.color,
            },
            rippleStyle,
          ]}
        />
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: item.tileColor ?? item.color,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name={item.icon as any} size={20} color={item.tileColor ? (item.glyphColor ?? item.color) : (item.iconColor ?? "#FFFFFF")} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: "600", color: labelColor }}>{item.label}</Text>
      </Pressable>
    </ReAnimated.View>
  );
}

export function ScheduleFab({
  open,
  onToggle,
  items,
  fabColor,
  menuSurface,
  labelColor,
  iconColorClosed,
  iconColorOpen,
  scrimTone = "violet",
  getFacePressedStyles,
}: {
  open: boolean;
  onToggle: () => void;
  items: FabMenuItem[];
  fabColor: string;
  menuSurface: string;
  labelColor: string;
  iconColorClosed: string;
  iconColorOpen: string;
  /** The scrim's family: the deep violet of the drawing, or the skins' dark. */
  scrimTone?: "violet" | "dark";
  /**
   * The skins' pressed treatments for the FAB face, supplied by the
   * schedule tab (Paper lifts, 8-bit depresses — the v202/v203 passes);
   * the morph keeps them on its toggle face.
   */
  getFacePressedStyles?: (pressed: boolean) => Array<StyleProp<ViewStyle>>;
}) {
  const scrimColor = scrimTone === "dark" ? "rgba(10,6,24,0.52)" : "rgba(38,18,82,0.52)";
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: open ? 460 : 280,
      easing: open ? EMPHASIZED_IN : EMPHASIZED_OUT,
    });
  }, [open, progress]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const surfaceStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [56, 218]),
    height: interpolate(progress.value, [0, 1], [56, 276]),
    borderRadius: interpolate(progress.value, [0, 1], [16, 20]),
    backgroundColor: interpolateColor(progress.value, [0, 1], [fabColor, menuSurface]),
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 135])}deg` }],
    opacity: interpolate(progress.value, [0, 0.35, 1], [1, 0.9, 1]),
  }));

  const glyphClosedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4], [1, 0]),
  }));
  const glyphOpenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.35, 0.8], [0, 1]),
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

      <ReAnimated.View
        style={[
          {
            position: "absolute",
            right: 15,
            bottom: 60,
            zIndex: 95,
            overflow: "hidden",
            shadowColor: "#2E1065",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 14,
            elevation: 8,
          },
          surfaceStyle,
        ]}
      >
        <View style={{ paddingTop: 6, paddingBottom: 6 }} pointerEvents={open ? "auto" : "none"}>
          {items.map((item, i) => (
            <FabRow key={item.key} item={item} index={i} progress={progress} labelColor={labelColor} />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? "Close add menu" : "Add"}
          onPress={onToggle}
          style={({ pressed }) => [
            {
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 56,
              height: 56,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            },
            ...(getFacePressedStyles?.(pressed) ?? []),
          ]}
        >
          <ReAnimated.View style={iconStyle}>
            {/* Two glyphs cross-fade: white + on the seed, deep × on the tonal menu. */}
            <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
              <ReAnimated.View style={[{ position: "absolute" }, glyphClosedStyle]}>
                <MaterialIcons name="add" size={28} color={iconColorClosed} />
              </ReAnimated.View>
              <ReAnimated.View style={[{ position: "absolute" }, glyphOpenStyle]}>
                <MaterialIcons name="add" size={28} color={iconColorOpen} />
              </ReAnimated.View>
            </View>
          </ReAnimated.View>
        </Pressable>
      </ReAnimated.View>
    </>
  );
}
