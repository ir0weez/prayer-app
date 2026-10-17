import { Text, View } from "react-native";
import { SEASON_DECOR, getSeasonTheme } from "@/lib/seasons";

/**
 * Subtle seasonal decorations for a map: a light tint plus emoji
 * in the four corners only (never covering buildings).
 * Renders nothing outside of seasonal months.
 */
export function SeasonalOverlay({ width, height }: { width: number; height: number }) {
  const theme = getSeasonTheme();
  if (theme === "normal") return null;
  const decor = SEASON_DECOR[theme];
  const [tl, tr, bl, br] = decor.corners;
  return (
    <View pointerEvents="none" style={{ position: "absolute", width, height, zIndex: 5 }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: decor.tint }} />
      <Text style={{ position: "absolute", top: 2, left: 4, fontSize: 22, opacity: 0.9 }}>{tl}</Text>
      <Text style={{ position: "absolute", top: 2, right: 4, fontSize: 22, opacity: 0.9 }}>{tr}</Text>
      <Text style={{ position: "absolute", bottom: 2, left: 4, fontSize: 22, opacity: 0.9 }}>{bl}</Text>
      <Text style={{ position: "absolute", bottom: 2, right: 4, fontSize: 22, opacity: 0.9 }}>{br}</Text>
    </View>
  );
}
