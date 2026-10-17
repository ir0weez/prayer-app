import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { getSeasonTheme, type SeasonTheme } from "@/lib/seasons";

/**
 * Decorative seasonal forest border that FRAMES the town board
 * instead of sitting on top of it. The town reads as a clearing
 * in a seasonal forest: spooky woods in October, harvest trees in
 * November, pines and snow in December, plain greenery otherwise.
 * Purely decorative — pointerEvents disabled.
 */

const BORDER_PAD = 26;
const EMOJI_SIZE = 18;

type EdgeDecor = { top: string[]; bottom: string[]; left: string[]; right: string[] };

const BORDER_DECOR: Record<SeasonTheme, EdgeDecor> = {
  spooky: {
    top: ["🕸️", "🦇", "🎃", "🦇", "🕸️"],
    bottom: ["🎃", "👻", "🦇", "👻", "🎃"],
    left: ["🌲", "🦇", "🌲", "🎃"],
    right: ["🌲", "👻", "🌲", "🦇"],
  },
  fall: {
    top: ["🍂", "🦃", "🍁", "🦃", "🍂"],
    bottom: ["🍁", "🌾", "🍂", "🌾", "🍁"],
    left: ["🌳", "🍂", "🦃", "🍁"],
    right: ["🌳", "🍁", "🍂", "🦃"],
  },
  christmas: {
    top: ["🎄", "❄️", "🎅", "❄️", "🎄"],
    bottom: ["❄️", "⛄", "🎄", "⛄", "❄️"],
    left: ["🎄", "❄️", "🎄", "🎁"],
    right: ["🎄", "🎁", "🎄", "❄️"],
  },
  normal: {
    top: ["🌲", "🌳", "🌲", "🌳", "🌲"],
    bottom: ["🌿", "🌳", "🌿", "🌳", "🌿"],
    left: ["🌲", "🌳", "🌲", "🌳"],
    right: ["🌲", "🌳", "🌲", "🌳"],
  },
};

export function SeasonalBorder({ children }: { children: ReactNode }) {
  const theme = getSeasonTheme();
  const decor = BORDER_DECOR[theme];
  const subtle = theme === "normal";
  const opacity = subtle ? 0.6 : 0.9;
  return (
    <View style={{ padding: BORDER_PAD, position: "relative" }}>
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 2, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around" }}
      >
        {decor.top.map((e, i) => (
          <Text key={i} style={{ fontSize: EMOJI_SIZE, opacity }}>
            {e}
          </Text>
        ))}
      </View>
      <View
        pointerEvents="none"
        style={{ position: "absolute", bottom: 2, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around" }}
      >
        {decor.bottom.map((e, i) => (
          <Text key={i} style={{ fontSize: EMOJI_SIZE, opacity }}>
            {e}
          </Text>
        ))}
      </View>
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 2, top: BORDER_PAD, bottom: BORDER_PAD, flexDirection: "column", justifyContent: "space-around" }}
      >
        {decor.left.map((e, i) => (
          <Text key={i} style={{ fontSize: EMOJI_SIZE, opacity }}>
            {e}
          </Text>
        ))}
      </View>
      <View
        pointerEvents="none"
        style={{ position: "absolute", right: 2, top: BORDER_PAD, bottom: BORDER_PAD, flexDirection: "column", justifyContent: "space-around" }}
      >
        {decor.right.map((e, i) => (
          <Text key={i} style={{ fontSize: EMOJI_SIZE, opacity }}>
            {e}
          </Text>
        ))}
      </View>
      {children}
    </View>
  );
}
