import { memo, useMemo } from "react";
import { View } from "react-native";

// ---------------------------------------------------------------------------
// NightWindowGlow: warm window light for buildings at night (8 PM – 6 AM).
// Purely visual — pointerEvents="none", no animations, so it's cheap.
// A soft amber tint over the building body plus a few glowing window panes
// placed deterministically per building id (stable across renders).
// ---------------------------------------------------------------------------

/** Open-air / decorative types with no windows to light. */
const NO_WINDOW_TYPES = new Set([
  "banquet-table",
  "community-garden",
  "amphitheater",
  "fountain-plaza",
]);

export function hasLitWindows(type: string): boolean {
  return !NO_WINDOW_TYPES.has(type);
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type WindowPane = { left: number; top: number; w: number; h: number };

function NightWindowGlowImpl({
  buildingId,
  width,
  height,
}: {
  buildingId: string;
  width: number;
  height: number;
}) {
  const windows = useMemo<WindowPane[]>(() => {
    const h = hashStr(buildingId);
    const count = 2 + (h % 2); // 2–3 panes
    const out: WindowPane[] = [];
    const bandTop = height * 0.42;
    const bandH = height * 0.3;
    for (let i = 0; i < count; i++) {
      const frac = (0.22 + 0.56 * ((h >> (i * 5)) % 32) / 32 + i * 0.02) % 1;
      out.push({
        left: width * (0.18 + 0.64 * frac),
        top: bandTop + (bandH * (((h >> (i * 7 + 3)) % 16) / 16)) * 0.6,
        w: 7 + ((h >> (i * 3)) % 3) * 2,
        h: 9 + ((h >> (i * 4 + 1)) % 2) * 3,
      });
    }
    return out;
  }, [buildingId, width, height]);

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0, width, height, zIndex: 1 }}
    >
      {/* Soft warm wash over the building body */}
      <View
        style={{
          position: "absolute",
          left: width * 0.12,
          right: width * 0.12,
          top: height * 0.3,
          bottom: height * 0.2,
          backgroundColor: "#FBBF24",
          opacity: 0.14,
          borderRadius: 8,
        }}
      />
      {/* Glowing window panes */}
      {windows.map((wp, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: wp.left,
            top: wp.top,
            width: wp.w,
            height: wp.h,
            borderRadius: 2,
            backgroundColor: "#FDE68A",
            opacity: 0.95,
            shadowColor: "#FBBF24",
            shadowOpacity: 0.8,
            shadowRadius: 7,
          }}
        />
      ))}
    </View>
  );
}

/** Memoized: props are primitives/stable, so ambient layers skip re-renders
 *  when the hometown screen re-renders for unrelated reasons. */
export const NightWindowGlow = memo(NightWindowGlowImpl);
