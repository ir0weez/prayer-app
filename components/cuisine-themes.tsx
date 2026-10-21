// ---------- cuisine themes for restaurant interiors ----------
// Each restaurant type gets themed SVG decor: wall art, overhead lighting,
// a signature back-wall piece, and a color palette. Real SVG art, no emojis.
// Animations: sine-ease only, no bounce.

import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";

export type CuisineId =
  | "pizza-place"
  | "burger-joint"
  | "taco-stand"
  | "sushi-bar"
  | "diner"
  | "upper-room"
  | "manna-house"
  | "feast-hall"
  | "banquet-table";

export type CuisinePalette = {
  bg: string; // screen background
  wall: string; // back wall
  floor: string; // floor base
  floorLine: string;
  card: string;
  cardBorder: string;
  accent: string; // gold/primary accent
  text: string;
  textDim: string;
  cloth: string[]; // tablecloth colors by tier (index 0 = bare)
  wood: string; // table/chair wood
  woodDark: string;
  outdoor?: boolean; // Marriage Supper: open-sky feel
};

export const CUISINE_THEMES: Record<CuisineId, CuisinePalette> = {
  "pizza-place": {
    // Party-palace purple (animatronic pizza theater): deep violet walls,
    // wild carpet floor, pink-red stage accent.
    bg: "#22102A", wall: "#3A2150", floor: "#4A2A63", floorLine: "#38204D",
    card: "#2E1A3E", cardBorder: "#5E4390", accent: "#FF5A7A",
    text: "#F9F0FF", textDim: "#C3A9DE",
    cloth: ["", "#F5EFE0", "#C0392B", "#7B2D8B"], // party tables: cream, red, purple
    wood: "#8B5E34", woodDark: "#5E3D22",
  },
  "burger-joint": {
    // Cold, bright red-and-white (west-coast burger institution): white
    // tile everywhere, red trim, dark text on light cards.
    bg: "#EFEAE2", wall: "#FFFFFF", floor: "#F7F4EE", floorLine: "#D8D2C8",
    card: "#FFFFFF", cardBorder: "#D22630", accent: "#D22630",
    text: "#2A2320", textDim: "#6E625A",
    cloth: ["", "#FFFFFF", "#D22630", "#F3E9D2"], // crisp white, then red
    wood: "#B02A30", woodDark: "#7A1D22",
  },
  "taco-stand": {
    // Retro taco cantina (the beloved 90s one): purple walls, teal + pink
    // sunset stripes, geometric shapes.
    bg: "#241433", wall: "#3A2260", floor: "#4A3A6E", floorLine: "#33224F",
    card: "#2E1B47", cardBorder: "#5E4390", accent: "#FF7BAC",
    text: "#F6EEFC", textDim: "#B9A3D9",
    cloth: ["", "#F3E9FF", "#2EC4B6", "#7B2D8B"], // lavender, teal, purple
    wood: "#6E5136", woodDark: "#46301E",
  },
  "sushi-bar": {
    bg: "#14161C", wall: "#23262E", floor: "#3E3226", floorLine: "#2E2419",
    card: "#1E2128", cardBorder: "#3E4250", accent: "#C0392B",
    text: "#EDE8DC", textDim: "#9A94A0",
    cloth: ["", "#2E3138", "#C0392B", "#1A1C22"], // dark + vermillion
    wood: "#B8BEC6", woodDark: "#7A828C",
  },
  diner: {
    // Classic American diner: warm wood browns, orange
    // booth warmth, golden-yellow accents — always open, always coffee.
    bg: "#211510", wall: "#46301E", floor: "#5D4128", floorLine: "#46301E",
    card: "#33241A", cardBorder: "#6E4A2A", accent: "#F39C2C",
    text: "#FBEED8", textDim: "#C8A878",
    cloth: ["", "#F7EBD4", "#E67E22", "#8B3A1E"], // cream, orange, deep rust
    wood: "#8B5E34", woodDark: "#5E3D22",
  },
  "upper-room": {
    bg: "#201A14", wall: "#3E3226", floor: "#6B5E4A", floorLine: "#52463A",
    card: "#322A20", cardBorder: "#5E4E38", accent: "#E0A63F",
    text: "#F5EAD6", textDim: "#B8A888",
    cloth: ["", "#F7F0DC", "#E0A63F", "#8B6A3A"], // linen + gold
    wood: "#9B7443", woodDark: "#6B4E28",
  },
  "manna-house": {
    bg: "#241A10", wall: "#4A3620", floor: "#7A5E38", floorLine: "#5E462A",
    card: "#382A18", cardBorder: "#6B5232", accent: "#E8A84C",
    text: "#F8ECD8", textDim: "#C8A878",
    cloth: ["", "#F5EBD0", "#D4883A", "#8B5A24"], // warm bakery
    wood: "#7A5A38", woodDark: "#4E3822",
  },
  "feast-hall": {
    bg: "#1E1610", wall: "#3A2C1E", floor: "#5E4E3A", floorLine: "#463A2C",
    card: "#2E2418", cardBorder: "#5E4A30", accent: "#E0A63F",
    text: "#F5EAD0", textDim: "#B8A078",
    cloth: ["", "#F7ECD4", "#7A2E2E", "#4E1E1E"], // crimson + gold
    wood: "#8B6A48", woodDark: "#5E4A30",
  },
  "banquet-table": {
    bg: "#1A2030", wall: "#2A3450", floor: "#3E5A3E", floorLine: "#2E4430",
    card: "#242E44", cardBorder: "#3E4E6E", accent: "#FFD97A",
    text: "#F0EDE0", textDim: "#A8B8C8",
    cloth: ["", "#F8F4E8", "#FFD97A", "#E8E0C8"], // white + gold, open sky
    wood: "#8B6A48", woodDark: "#5E4A30",
    outdoor: true,
  },
};

// ---------- gentle glow pulse (sine easing) ----------
function GlowPulse({ children, duration = 1600 }: { children: React.ReactNode; duration?: number }) {
  const g = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(g, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(g, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [g, duration]);
  return (
    <Animated.View style={{ opacity: g.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }}>
      {children}
    </Animated.View>
  );
}

// ---------- steam wisps: three curls riding one slow sine loop ----------
// One Animated.Value drives all three wisps (per-wisp interpolation ranges
// give the stagger) — cheap, native driver, no bounce.
function SteamWisps({ color = "#F6EEFC", width = 72 }: { color?: string; width?: number }) {
  const s = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: 1, duration: 2300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(s, { toValue: 0, duration: 2300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [s]);
  return (
    <View pointerEvents="none" style={{ flexDirection: "row", justifyContent: "space-between", width, height: 20 }}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{
            width: 6,
            height: 16,
            borderRadius: 3,
            backgroundColor: color,
            opacity: s.interpolate({ inputRange: [0, 1], outputRange: i === 1 ? [0.34, 0.12] : [0.1, 0.36] }),
            transform: [
              { translateY: s.interpolate({ inputRange: [0, 1], outputRange: [4 + i * 1.5, -4 - i * 1.5] }) },
              { translateX: s.interpolate({ inputRange: [0, 1], outputRange: [0, i === 0 ? -2 : i === 2 ? 2 : 0] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ---------- the cantina sun: drawn face, rays shimmering on a slow sine ----------
function SunMedallion() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 58, height: 58 }}>
      {/* rays — one very slow shimmer (opacity + a breath of scale) */}
      <Animated.View
        style={{
          position: "absolute",
          width: 58,
          height: 58,
          alignItems: "center",
          justifyContent: "center",
          opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
          transform: [{ scale: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1.05] }) }],
        }}
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <View
            key={deg}
            style={{
              position: "absolute",
              width: 5,
              height: 13,
              borderRadius: 2.5,
              backgroundColor: "#FF9E4F",
              borderWidth: 1,
              borderColor: "#D97A24",
              transform: [{ rotate: `${deg}deg` }, { translateY: -25 }],
            }}
          />
        ))}
      </Animated.View>
      {/* the face — warm disc, drawn eyes, smile, rosy cheeks */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "#FFD23F",
          borderWidth: 2,
          borderColor: "#E8A20C",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <View style={{ position: "absolute", top: 3, left: 6, width: 11, height: 5, borderRadius: 2.5, backgroundColor: "#FFF3C9", opacity: 0.85 }} />
        <View style={{ flexDirection: "row", marginTop: 3 }}>
          <View style={{ width: 3.6, height: 3.6, borderRadius: 1.8, backgroundColor: "#7A5410", marginHorizontal: 3 }} />
          <View style={{ width: 3.6, height: 3.6, borderRadius: 1.8, backgroundColor: "#7A5410", marginHorizontal: 3 }} />
        </View>
        <View style={{ width: 13, height: 6.5, borderBottomLeftRadius: 6.5, borderBottomRightRadius: 6.5, backgroundColor: "#7A5410", marginTop: 2.6, opacity: 0.9 }} />
        <View style={{ position: "absolute", bottom: 8, left: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF7BAC", opacity: 0.75 }} />
        <View style={{ position: "absolute", bottom: 8, right: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF7BAC", opacity: 0.75 }} />
      </View>
    </View>
  );
}

// ============================================================
// WALL DECOR — themed art frames per cuisine
// ============================================================
export function CuisineWallDecor({ cuisine, tier }: { cuisine: string; tier: number }) {
  const frameColor = tier >= 3 ? "#E0A63F" : tier >= 2 ? "#8B5E34" : "#5E3D22";
  const frame = (key: number, inner: React.ReactNode) => (
    <View
      key={key}
      style={{
        width: 64, height: 52, borderRadius: 6,
        backgroundColor: "#2A2018", borderWidth: 4, borderColor: frameColor,
        marginHorizontal: 14, overflow: "hidden", alignItems: "center", justifyContent: "center",
      }}
    >
      {inner}
    </View>
  );

  let art: React.ReactNode = null;
  switch (cuisine) {
    case "pizza-place":
      // framed pizza slice + hanging garlic braid
      art = (
        <>
          {frame(0, (
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 0, height: 0, borderLeftWidth: 16, borderRightWidth: 16, borderTopWidth: 26, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#E8A84C" }} />
              <View style={{ flexDirection: "row", marginTop: -20 }}>
                {["#C0392B", "#C0392B", "#7A8B3A"].map((c, i) => (
                  <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c, marginHorizontal: 2 }} />
                ))}
              </View>
            </View>
          ))}
          {frame(1, (
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 2, height: 20, backgroundColor: "#8B6A3A" }} />
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#F0E8D8", borderWidth: 1, borderColor: "#C8B898", marginTop: -2 }} />
              ))}
            </View>
          ))}
        </>
      );
      break;
    case "burger-joint":
      // the crossed palms + a crisp red-and-white burger poster
      art = (
        <>
          {frame(0, (
            <View style={{ width: 52, height: 42, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "flex-end", overflow: "hidden" }}>
              {/* two palm trunks, crossed */}
              <View style={{ position: "absolute", bottom: -4, left: 12, width: 5, height: 36, borderRadius: 2.5, backgroundColor: "#8B5E34", transform: [{ rotate: "-24deg" }] }} />
              <View style={{ position: "absolute", bottom: -4, right: 12, width: 5, height: 36, borderRadius: 2.5, backgroundColor: "#8B5E34", transform: [{ rotate: "24deg" }] }} />
              {/* fronds */}
              {[-52, -26, 0, 26, 52].map((deg, i) => (
                <View key={i} style={{ position: "absolute", top: 3, left: 24, width: 17, height: 6, borderRadius: 3, backgroundColor: "#3E7D3A", transform: [{ rotate: `${deg}deg` }] }} />
              ))}
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, backgroundColor: "#D22630" }} />
            </View>
          ))}
          {frame(1, (
            <View style={{ width: 50, height: 38, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#D22630", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 30, height: 7, borderRadius: 3.5, backgroundColor: "#E8A84C" }} />
              <View style={{ width: 34, height: 5, backgroundColor: "#3E7D3A", marginTop: 1 }} />
              <View style={{ width: 32, height: 6, borderRadius: 3, backgroundColor: "#8B4A2A", marginTop: 1 }} />
              <View style={{ width: 30, height: 7, borderRadius: 3.5, backgroundColor: "#E8A84C", marginTop: 1 }} />
            </View>
          ))}
        </>
      );
      break;
    case "taco-stand":
      // retro sunset medallion + Memphis geometric shapes
      art = (
        <>
          {frame(0, (
            <View style={{ width: 44, height: 40, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden", borderWidth: 2, borderColor: "#FFD23F" }}>
              <View style={{ height: 8, backgroundColor: "#FF7BAC" }} />
              <View style={{ height: 8, backgroundColor: "#FF9E4F" }} />
              <View style={{ height: 8, backgroundColor: "#FFD23F" }} />
              <View style={{ height: 8, backgroundColor: "#2EC4B6" }} />
              <View style={{ height: 8, backgroundColor: "#3A2260" }} />
              {/* the little sun, ringed, with stubby rays */}
              <View style={{ position: "absolute", top: 8, left: 10, width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
                {[45, 135, 225, 315].map((deg) => (
                  <View key={deg} style={{ position: "absolute", width: 3.4, height: 8, borderRadius: 1.7, backgroundColor: "#FF9E4F", transform: [{ rotate: `${deg}deg` }, { translateY: -11 }] }} />
                ))}
                <View style={{ width: 17, height: 17, borderRadius: 8.5, backgroundColor: "#FFF3C9", borderWidth: 1.6, borderColor: "#FF9E4F" }} />
              </View>
            </View>
          ))}
          {frame(1, (
            <View style={{ width: 50, height: 38, backgroundColor: "#2EC4B6", overflow: "hidden", borderWidth: 1.5, borderColor: "#1F8A80" }}>
              <View style={{ position: "absolute", top: 5, left: 6, width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 12, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#FF7BAC" }} />
              <View style={{ position: "absolute", top: 22, left: 24, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFD23F" }} />
              <View style={{ position: "absolute", top: 8, right: 6, width: 14, height: 4, borderRadius: 2, backgroundColor: "#3A2260", transform: [{ rotate: "24deg" }] }} />
              {/* a zigzag, chained from three little bars */}
              <View style={{ position: "absolute", bottom: 6, left: 7, flexDirection: "row" }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ width: 6, height: 3, borderRadius: 1.5, backgroundColor: "#F6EEFC", transform: [{ rotate: i % 2 === 0 ? "-28deg" : "28deg" }] }} />
                ))}
              </View>
              <View style={{ position: "absolute", bottom: 7, right: 9, width: 7, height: 7, backgroundColor: "#FF7BAC", transform: [{ rotate: "45deg" }] }} />
              {/* outlined ring, drawn not filled */}
              <View style={{ position: "absolute", top: 20, left: 5, width: 11, height: 11, borderRadius: 5.5, borderWidth: 2, borderColor: "#3A2260" }} />
            </View>
          ))}
        </>
      );
      break;
    case "sushi-bar":
      // koi fish + noren curtain
      art = (
        <>
          {frame(0, (
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 36, height: 14, borderRadius: 7, backgroundColor: "#E8E4DA" }} />
              <View style={{ width: 14, height: 10, backgroundColor: "#C0392B", borderRadius: 5, marginTop: -12, marginLeft: -8 }} />
              <View style={{ width: 0, height: 0, borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 10, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#E8E4DA", marginLeft: 34, marginTop: -11 }} />
            </View>
          ))}
          {frame(1, (
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 44, height: 6, backgroundColor: "#1A1C22" }} />
              <View style={{ flexDirection: "row" }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ width: 13, height: 30, backgroundColor: i === 1 ? "#C0392B" : "#2E3138", marginHorizontal: 1, alignItems: "center", paddingTop: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#F0E8D8", opacity: 0.9 }} />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </>
      );
      break;
    case "diner":
      // chrome clock + menu board
      art = (
        <>
          {frame(0, (
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#F0F0F0", borderWidth: 3, borderColor: "#8A929A", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 2, height: 10, backgroundColor: "#2E343C" }} />
              <View style={{ width: 8, height: 2, backgroundColor: "#2E343C", marginTop: -6, marginLeft: 6 }} />
            </View>
          ))}
          {frame(1, (
            <View style={{ width: 50, height: 36, borderRadius: 4, backgroundColor: "#1A1C20", borderWidth: 2, borderColor: "#8A929A", padding: 4 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ height: 4, borderRadius: 2, backgroundColor: "#F5D97A", marginVertical: 2, width: i === 2 ? "60%" : "100%" }} />
              ))}
            </View>
          ))}
        </>
      );
      break;
    case "upper-room":
      // olive branch + stone tablet
      art = (
        <>
          {frame(0, (
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 3, height: 30, backgroundColor: "#5E6E3A", transform: [{ rotate: "20deg" }] }} />
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{ position: "absolute", top: 6 + i * 6, left: i % 2 === 0 ? 22 : 36, width: 12, height: 7, borderRadius: 4, backgroundColor: "#6B8B4A", transform: [{ rotate: i % 2 === 0 ? "-30deg" : "30deg" }] }} />
              ))}
            </View>
          ))}
          {frame(1, (
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 8, height: 30, backgroundColor: "#8B6A4A" }} />
              <View style={{ width: 24, height: 8, backgroundColor: "#8B6A4A", marginTop: -26 }} />
            </View>
          ))}
        </>
      );
      break;
    case "manna-house":
      // wheat sheaf + bread shelf
      art = (
        <>
          {frame(0, (
            <View style={{ alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ alignItems: "center", marginHorizontal: 2 }}>
                  <View style={{ width: 3, height: 24, backgroundColor: "#C8A84C" }} />
                  <View style={{ width: 10, height: 14, borderRadius: 5, backgroundColor: "#E8C86A", marginTop: -16 }} />
                </View>
              ))}
            </View>
          ))}
          {frame(1, (
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 48, height: 4, backgroundColor: "#8B5E34" }} />
              <View style={{ flexDirection: "row", marginTop: 2 }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ width: 14, height: 10, borderRadius: 5, backgroundColor: "#D8A85C", marginHorizontal: 2, borderWidth: 1, borderColor: "#A87838" }} />
                ))}
              </View>
            </View>
          ))}
        </>
      );
      break;
    case "feast-hall":
      // tapestry + heraldic banner
      art = (
        <>
          {frame(0, (
            <View style={{ width: 50, height: 40, backgroundColor: "#7A2E2E", borderWidth: 2, borderColor: "#E0A63F", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#E0A63F", opacity: 0.85 }} />
              <View style={{ width: 12, height: 12, backgroundColor: "#7A2E2E", marginTop: -16 }} />
            </View>
          ))}
          {frame(1, (
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 40, height: 6, backgroundColor: "#5E3D22" }} />
              <View style={{ width: 30, height: 32, backgroundColor: "#2E4A6E", borderBottomLeftRadius: 8, borderBottomRightRadius: 8, alignItems: "center", paddingTop: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#E0A63F" }} />
              </View>
            </View>
          ))}
        </>
      );
      break;
    case "banquet-table":
      // stars + dove (open sky)
      art = (
        <>
          {frame(0, (
            <View style={{ width: 52, height: 40, backgroundColor: "#1A2440", alignItems: "center", justifyContent: "center" }}>
              {[[10, 8], [30, 14], [20, 26], [40, 28]].map(([x, y], i) => (
                <View key={i} style={{ position: "absolute", left: x, top: y, width: 4, height: 4, borderRadius: 2, backgroundColor: "#FFD97A" }} />
              ))}
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#F0E8D0", opacity: 0.9 }} />
            </View>
          ))}
          {frame(1, (
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 30, height: 16, borderRadius: 8, backgroundColor: "#F0EDE0" }} />
              <View style={{ width: 18, height: 8, backgroundColor: "#F0EDE0", borderRadius: 4, marginTop: -12, marginLeft: -14, transform: [{ rotate: "-25deg" }] }} />
              <View style={{ width: 18, height: 8, backgroundColor: "#F0EDE0", borderRadius: 4, marginTop: -8, marginLeft: 14, transform: [{ rotate: "25deg" }] }} />
            </View>
          ))}
        </>
      );
      break;
    default:
      art = null;
  }

  if (!art) return null;
  return <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 10 }}>{art}</View>;
}

// ============================================================
// OVERHEAD — themed ceiling lighting per cuisine + level
// ============================================================
export function CuisineOverhead({ cuisine, level, lightsTier }: { cuisine: string; level: number; lightsTier: number }) {
  if (level < 2 && lightsTier === 0) return null;

  switch (cuisine) {
    case "pizza-place":
      // Italian bistro string lights, warmer with level
      return <BistroLights color={level >= 3 ? "#FFD97A" : "#FFB84D"} count={level >= 3 ? 12 : 8} />;
    case "burger-joint":
      // red-and-white striped awning, bright and cold
      return <StripedAwning rich={level >= 3} />;
    case "taco-stand":
      // retro sunset-stripe band with hanging geometric shapes
      return <RetroSunsetBand rich={level >= 3} />;
    case "sushi-bar":
      // paper lanterns
      return <PaperLanterns count={level >= 3 ? 5 : 3} />;
    case "diner":
      // chrome pendants
      return <ChromePendants count={level >= 3 ? 4 : 2} />;
    case "upper-room":
      // hanging oil lamps
      return <OilLamps count={level >= 3 ? 5 : 3} />;
    case "manna-house":
      // warm pendants + hanging herbs
      return <BakeryPendants count={level >= 3 ? 4 : 2} />;
    case "feast-hall":
      // grand chandeliers handled by existing DiningChandelier; add banners
      return <FeastBanners rich={level >= 3} />;
    case "banquet-table":
      // stars + string lights (open sky)
      return <StarryLights count={level >= 3 ? 12 : 8} />;
    default:
      return <BistroLights color="#FFB84D" count={8} />;
  }
}

function BistroLights({ color, count }: { color: string; count: number }) {
  return (
    <GlowPulse>
      <View style={{ alignItems: "center", marginTop: 8, marginBottom: -4 }}>
        <View style={{ position: "absolute", top: 8, left: 30, right: 30, height: 2, backgroundColor: "#3E2C1A" }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", width: "88%" }}>
          {Array.from({ length: count }).map((_, i) => (
            <View key={i} style={{ marginTop: 6 + (i % 2) * 4, width: 14, height: 14, borderRadius: 7, backgroundColor: color, opacity: 0.85, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
            </View>
          ))}
        </View>
      </View>
    </GlowPulse>
  );
}

function StripedAwning({ rich }: { rich: boolean }) {
  return (
    <View style={{ alignItems: "center", marginVertical: 8 }}>
      {/* bright cold light bar above the awning */}
      <GlowPulse duration={2200}>
        <View style={{ width: 150, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF", opacity: 0.95 }} />
      </GlowPulse>
      <View style={{ flexDirection: "row", marginTop: 5 }}>
        {Array.from({ length: rich ? 12 : 9 }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 24,
              height: 20,
              backgroundColor: i % 2 === 0 ? "#D22630" : "#FFFFFF",
              borderBottomLeftRadius: 10,
              borderBottomRightRadius: 10,
              borderWidth: 1,
              borderColor: "#D8D2C8",
              marginHorizontal: 0.5,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function RetroSunsetBand({ rich }: { rich: boolean }) {
  const bulbColors = ["#FFD23F", "#FF7BAC", "#2EC4B6", "#FF9E4F"];
  const bulbCount = rich ? 7 : 5;
  return (
    <View style={{ alignItems: "center", marginVertical: 6 }}>
      {/* the sunset stripes, in a drawn frame: gold rim, inner trim line */}
      <View style={{ width: "92%", borderRadius: 7, overflow: "hidden", borderWidth: 3, borderColor: "#FFD23F" }}>
        <View style={{ height: 6, backgroundColor: "#FF7BAC" }} />
        <View style={{ height: 6, backgroundColor: "#FF9E4F" }} />
        <View style={{ height: 6, backgroundColor: "#FFD23F" }} />
        <View style={{ height: 6, backgroundColor: "#2EC4B6" }} />
        <View style={{ position: "absolute", top: 2, left: 2, right: 2, bottom: 2, borderWidth: 1, borderColor: "rgba(58,34,96,0.55)", borderRadius: 5 }} />
      </View>
      {/* a wire of bulbs under the band, twinkling in stagger */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 1 }}>
        {Array.from({ length: bulbCount }).map((_, i) => (
          <View key={i} style={{ alignItems: "center", marginHorizontal: 13 }}>
            <View style={{ width: 2, height: 7, backgroundColor: "#5E4390" }} />
            <GlowPulse duration={1500 + (i % 4) * 350}>
              <View
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 4.5,
                  backgroundColor: bulbColors[i % bulbColors.length],
                  borderWidth: 1,
                  borderColor: "rgba(36,20,51,0.65)",
                }}
              />
            </GlowPulse>
          </View>
        ))}
      </View>
      {/* hanging Memphis shapes */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 1 }}>
        {(rich
          ? ["tri", "dot", "bar", "diamond", "tri", "dot", "bar", "diamond"]
          : ["tri", "dot", "bar", "diamond", "tri", "dot"]
        ).map((shape, i) => (
          <View key={i} style={{ alignItems: "center", marginHorizontal: 11 }}>
            <View style={{ width: 2, height: 9, backgroundColor: "#5E4390" }} />
            {shape === "tri" ? (
              <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 10, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#FF7BAC" }} />
            ) : shape === "dot" ? (
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFD23F", borderWidth: 1, borderColor: "#D97A24" }} />
            ) : shape === "bar" ? (
              <View style={{ width: 13, height: 4.5, borderRadius: 2, backgroundColor: "#2EC4B6", transform: [{ rotate: i % 2 === 0 ? "22deg" : "-22deg" }] }} />
            ) : (
              <View style={{ width: 8.5, height: 8.5, backgroundColor: "#F6EEFC", transform: [{ rotate: "45deg" }] }} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function PaperLanterns({ count }: { count: number }) {
  return (
    <GlowPulse duration={2000}>
      <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 8 }}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={{ alignItems: "center", marginHorizontal: 10 }}>
            <View style={{ width: 2, height: 18, backgroundColor: "#3E3226" }} />
            <View style={{ width: 34, height: 30, borderRadius: 15, backgroundColor: "#F5E8C8", borderWidth: 1, borderColor: "#D8C898", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFB84D", opacity: 0.9 }} />
            </View>
            <View style={{ width: 20, height: 4, backgroundColor: "#8B2A1E", marginTop: -2, borderRadius: 2 }} />
          </View>
        ))}
      </View>
    </GlowPulse>
  );
}

function ChromePendants({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ alignItems: "center", marginHorizontal: 16 }}>
          <View style={{ width: 2, height: 22, backgroundColor: "#5A626C" }} />
          <View style={{ width: 36, height: 20, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: "#9AA2AC", borderWidth: 2, borderColor: "#6E767E" }} />
          <GlowPulse duration={1800}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFE9B8", marginTop: -4 }} />
          </GlowPulse>
        </View>
      ))}
    </View>
  );
}

function OilLamps({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ alignItems: "center", marginHorizontal: 12 }}>
          <View style={{ width: 2, height: 16, backgroundColor: "#5E3D22" }} />
          <GlowPulse duration={1400 + i * 200}>
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 10, height: 12, borderRadius: 5, backgroundColor: "#FF9A3D" }} />
              <View style={{ width: 22, height: 14, borderRadius: 7, backgroundColor: "#8B5E34", borderWidth: 2, borderColor: "#5E3D22", marginTop: -3 }} />
            </View>
          </GlowPulse>
        </View>
      ))}
    </View>
  );
}

function BakeryPendants({ count }: { count: number }) {
  return (
    <View style={{ alignItems: "center", marginVertical: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={{ alignItems: "center", marginHorizontal: 18 }}>
            <View style={{ width: 2, height: 20, backgroundColor: "#5E3D22" }} />
            <View style={{ width: 30, height: 24, borderTopLeftRadius: 15, borderTopRightRadius: 15, backgroundColor: "#3E3226", borderWidth: 2, borderColor: "#E8A84C" }} />
            <GlowPulse duration={1700}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFD97A", marginTop: -4 }} />
            </GlowPulse>
          </View>
        ))}
      </View>
      {/* hanging dried herbs */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 2 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ alignItems: "center", marginHorizontal: 20 }}>
            <View style={{ width: 2, height: 12, backgroundColor: "#5E6E3A" }} />
            <View style={{ width: 8, height: 16, borderRadius: 4, backgroundColor: "#6B8B4A" }} />
          </View>
        ))}
      </View>
    </View>
  );
}

function FeastBanners({ rich }: { rich: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 6 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ alignItems: "center", marginHorizontal: 22 }}>
          <View style={{ width: 34, height: 5, backgroundColor: "#5E3D22" }} />
          <View style={{ width: 26, height: rich ? 52 : 38, backgroundColor: i === 1 ? "#7A2E2E" : "#2E4A6E", borderBottomLeftRadius: 6, borderBottomRightRadius: 6, borderWidth: 1, borderColor: "#E0A63F", alignItems: "center", paddingTop: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#E0A63F", opacity: 0.9 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function StarryLights({ count }: { count: number }) {
  return (
    <View style={{ alignItems: "center", marginVertical: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", width: "90%" }}>
        {Array.from({ length: count }).map((_, i) => (
          <GlowPulse key={i} duration={1200 + (i % 4) * 400}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFD97A", margin: 7 }} />
          </GlowPulse>
        ))}
      </View>
      <BistroLights color="#FFE9B8" count={8} />
    </View>
  );
}

// ============================================================
// SIGNATURE — the hero back-wall piece per cuisine
// ============================================================
export function CuisineSignature({ cuisine, level, kitchenTier }: { cuisine: string; level: number; kitchenTier: number }) {
  switch (cuisine) {
    case "pizza-place":
      return <PizzaOven level={level} kitchenTier={kitchenTier} />;
    case "burger-joint":
      return <BurgerCounter level={level} />;
    case "taco-stand":
      return <RetroCantina level={level} kitchenTier={kitchenTier} />;
    case "sushi-bar":
      return <SushiCounter level={level} kitchenTier={kitchenTier} />;
    case "diner":
      return <PieCase level={level} kitchenTier={kitchenTier} />;
    case "upper-room":
      return <CommunionTable level={level} />;
    case "manna-house":
      return <BreadOven level={level} kitchenTier={kitchenTier} />;
    case "feast-hall":
      return <GobletDisplay level={level} />;
    case "banquet-table":
      return <FloralGarland level={level} />;
    default:
      return null;
  }
}

// ---------- pizza: brick oven with visible flames + peel ----------
function PizzaOven({ level, kitchenTier }: { level: number; kitchenTier: number }) {
  const size = level >= 3 ? 1.25 : level >= 2 ? 1.1 : 0.95;
  return (
    <View style={{ alignItems: "center", marginTop: 6, transform: [{ scale: size }] }}>
      <View style={{ width: 120, height: 84, borderTopLeftRadius: 60, borderTopRightRadius: 60, backgroundColor: "#8B4A2E", borderWidth: 4, borderColor: "#5E2E1A", alignItems: "center", justifyContent: "flex-end", paddingBottom: 12, overflow: "hidden" }}>
        {/* brick courses */}
        <View style={{ position: "absolute", top: 18, left: 8, right: 8, height: 2, backgroundColor: "#5E2E1A", opacity: 0.5 }} />
        <View style={{ position: "absolute", top: 36, left: 8, right: 8, height: 2, backgroundColor: "#5E2E1A", opacity: 0.5 }} />
        {/* fire */}
        <GlowPulse duration={900}>
          <View style={{ alignItems: "center" }}>
            <View style={{ width: 34, height: 26, borderRadius: 10, backgroundColor: "#FF9A3D", opacity: 0.9 }} />
            <View style={{ width: 20, height: 16, borderRadius: 8, backgroundColor: "#FFD97A", marginTop: -14 }} />
          </View>
        </GlowPulse>
        {/* pizza inside */}
        {kitchenTier >= 1 && (
          <View style={{ position: "absolute", bottom: 10, right: 16, width: 26, height: 26, borderRadius: 13, backgroundColor: "#E8A84C", borderWidth: 3, borderColor: "#C87830" }}>
            <View style={{ position: "absolute", top: 6, left: 6, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#C0392B" }} />
            <View style={{ position: "absolute", top: 12, left: 12, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#C0392B" }} />
          </View>
        )}
      </View>
      <View style={{ width: 140, height: 10, borderRadius: 5, backgroundColor: "#5E2E1A", marginTop: 2 }} />
      {/* pizza peel leaning */}
      {level >= 2 && (
        <View style={{ position: "absolute", right: -34, bottom: 0, alignItems: "center", transform: [{ rotate: "18deg" }] }}>
          <View style={{ width: 4, height: 52, backgroundColor: "#8B5E34" }} />
          <View style={{ width: 26, height: 20, borderRadius: 6, backgroundColor: "#C68B4E", marginTop: -4 }} />
        </View>
      )}
    </View>
  );
}

// ---------- burger: bright white order counter, crossed palms above ----------
// The west-coast institution look: white tile, red stripe, menu boards,
// and the two palms that cross over the counter. Evoked, never copied.
function BurgerCounter({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      {/* the crossed palms */}
      <View style={{ width: 120, height: 52 }}>
        <View style={{ position: "absolute", bottom: 0, left: 34, width: 6, height: 44, borderRadius: 3, backgroundColor: "#8B5E34", transform: [{ rotate: "-21deg" }] }} />
        <View style={{ position: "absolute", bottom: 0, right: 34, width: 6, height: 44, borderRadius: 3, backgroundColor: "#8B5E34", transform: [{ rotate: "21deg" }] }} />
        {[-55, -28, 0, 28, 55].map((deg, i) => (
          <View key={i} style={{ position: "absolute", top: 2, left: 52, width: 24, height: 8, borderRadius: 4, backgroundColor: "#3E7D3A", transform: [{ rotate: `${deg}deg` }] }} />
        ))}
        <View style={{ position: "absolute", top: 10, left: 56, width: 8, height: 8, borderRadius: 4, backgroundColor: "#6E4525" }} />
      </View>
      {/* menu boards */}
      <View style={{ flexDirection: "row", marginTop: 2 }}>
        {[0, 1, 2].map((b) => (
          <View key={b} style={{ width: 52, height: 34, borderRadius: 4, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#D22630", marginHorizontal: 3, padding: 4 }}>
            <View style={{ height: 5, borderRadius: 2.5, backgroundColor: "#D22630", width: "80%" }} />
            {[0, 1, 2].map((r) => (
              <View key={r} style={{ height: 3, borderRadius: 1.5, backgroundColor: "#B9B0A4", marginTop: 3, width: r === 2 ? "55%" : "92%" }} />
            ))}
          </View>
        ))}
      </View>
      {/* the counter: white with the red stripe */}
      <View style={{ width: 168, marginTop: 5, borderRadius: 8, overflow: "hidden", borderWidth: 2, borderColor: "#D8D2C8", backgroundColor: "#FFFFFF" }}>
        <View style={{ height: 10, backgroundColor: "#F1EDE4" }} />
        <View style={{ height: 7, backgroundColor: "#D22630" }} />
        <View style={{ height: 26, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-evenly" }}>
          {/* red trays waiting on the counter */}
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: 30, height: 7, borderRadius: 2, backgroundColor: "#D22630", opacity: 0.9 }} />
          ))}
        </View>
      </View>
      {level >= 3 && (
        <Text style={{ color: "#6E625A", fontSize: 10, marginTop: 4, fontStyle: "italic" }}>Fresh, never frozen — the palms saw to it</Text>
      )}
    </View>
  );
}

// ---------- taco menu board: drawn items + prices, no words ----------
// Same idiom as the burger counter's boards — a header stripe, item bars,
// and a little gold price tag per row — in cantina colors.
function CantinaMenuBoard() {
  return (
    <View
      style={{
        width: 46,
        height: 58,
        borderRadius: 5,
        backgroundColor: "#2A1745",
        borderWidth: 2,
        borderColor: "#FF7BAC",
        padding: 4,
        marginHorizontal: 2,
      }}
    >
      <View style={{ height: 6, borderRadius: 3, backgroundColor: "#2EC4B6", marginBottom: 5 }} />
      {[17, 12, 15].map((w, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", marginTop: i === 0 ? 0 : 5 }}>
          <View style={{ width: w, height: 4, borderRadius: 2, backgroundColor: "#F6EEFC", opacity: 0.9 }} />
          <View style={{ flex: 1 }} />
          <View style={{ width: 8, height: 4.5, borderRadius: 2, backgroundColor: "#FFD23F" }} />
        </View>
      ))}
      {/* a tiny taco doodle at the foot of the board */}
      <View style={{ alignSelf: "center", marginTop: 6, width: 14, height: 8, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: "#E8C86A", borderWidth: 1, borderColor: "#A87838" }} />
    </View>
  );
}

// ---------- taco: retro cantina — arch, sun medallion, sunset-stripe grill ----------
// The beloved 90s cantina: purple arch, a generic sun (no logos), teal and
// pink stripes, geometric shapes. The grill still cooks underneath.
// Drawn pass: double-outlined arch on pilasters with a keystone, menu
// boards flanking from L2, steam curling off the grill pass.
function RetroCantina({ level, kitchenTier }: { level: number; kitchenTier: number }) {
  const pilaster = (key: number) => (
    <View key={key} style={{ alignItems: "center", marginHorizontal: 2 }}>
      {/* capital + base in pink, the column itself teal with a groove */}
      <View style={{ width: 16, height: 6, borderRadius: 2, backgroundColor: "#FF7BAC", borderWidth: 1, borderColor: "#33224F" }} />
      <View style={{ width: 11, height: 54, backgroundColor: "#2EC4B6", borderWidth: 1.5, borderColor: "#1F8A80" }}>
        <View style={{ position: "absolute", left: 3.5, top: 4, bottom: 4, width: 2, backgroundColor: "#1F8A80", opacity: 0.8 }} />
      </View>
      <View style={{ width: 16, height: 6, borderRadius: 2, backgroundColor: "#FF7BAC", borderWidth: 1, borderColor: "#33224F" }} />
    </View>
  );
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {level >= 2 && <CantinaMenuBoard />}
        {pilaster(0)}
        {/* the arch, double-outlined, keystone at the crown */}
        <View style={{ position: "relative" }}>
          <View
            style={{
              width: 150,
              height: 78,
              borderTopLeftRadius: 75,
              borderTopRightRadius: 75,
              backgroundColor: "#3A2260",
              borderWidth: 3,
              borderColor: "#2EC4B6",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* inner arch line in pink */}
            <View
              style={{
                position: "absolute",
                top: 5,
                left: 5,
                right: 5,
                bottom: 0,
                borderTopLeftRadius: 68,
                borderTopRightRadius: 68,
                borderWidth: 1.5,
                borderBottomWidth: 0,
                borderColor: "#FF7BAC",
                opacity: 0.85,
              }}
            />
            {/* sunset stripes across the arch */}
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
              <View style={{ height: 6, backgroundColor: "#FF7BAC", opacity: 0.85 }} />
              <View style={{ height: 6, backgroundColor: "#FF9E4F", opacity: 0.85 }} />
              <View style={{ height: 6, backgroundColor: "#FFD23F", opacity: 0.85 }} />
            </View>
            {/* little Memphis diamonds on the arch face */}
            <View style={{ position: "absolute", top: 16, left: 18, width: 7, height: 7, backgroundColor: "#2EC4B6", transform: [{ rotate: "45deg" }] }} />
            <View style={{ position: "absolute", top: 16, right: 18, width: 7, height: 7, backgroundColor: "#FF7BAC", transform: [{ rotate: "45deg" }] }} />
            {/* the sun */}
            <SunMedallion />
          </View>
          {/* keystone */}
          <View
            style={{
              position: "absolute",
              top: -5,
              alignSelf: "center",
              width: 16,
              height: 20,
              borderRadius: 3,
              backgroundColor: "#FFD23F",
              borderWidth: 2,
              borderColor: "#E8A20C",
            }}
          />
        </View>
        {pilaster(1)}
        {level >= 2 && <CantinaMenuBoard />}
      </View>
      {/* steam curling off the grill pass */}
      <View style={{ height: 16, marginTop: 1, marginBottom: -3, zIndex: 2 }}>
        <SteamWisps width={92} />
      </View>
      {/* grill top with heat shimmer */}
      <View style={{ width: 150, height: 16, borderRadius: 8, backgroundColor: "#241433", borderWidth: 2, borderColor: "#5E4390", marginTop: 4 }}>
        <GlowPulse duration={1000}>
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 2 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ width: 18, height: 6, borderRadius: 3, backgroundColor: "#FF9E4F", marginHorizontal: 6, opacity: 0.85 }} />
            ))}
          </View>
        </GlowPulse>
      </View>
      {/* sunset-stripe grill front (richer with level) */}
      <View style={{ width: 150, marginTop: 2, borderRadius: 8, overflow: "hidden", borderWidth: 2, borderColor: "#33224F" }}>
        <View style={{ height: 3, backgroundColor: "#FFD23F" }} />
        {["#FF7BAC", "#FF9E4F", "#FFD23F", "#2EC4B6"].slice(0, level >= 3 ? 4 : level >= 2 ? 3 : 2).map((c, i) => (
          <View key={i} style={{ height: 11, backgroundColor: c, opacity: 0.92 }} />
        ))}
        <View style={{ height: 12, backgroundColor: "#3A2260", flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i % 2 === 0 ? "#FFD23F" : "#2EC4B6", marginHorizontal: 4 }} />
          ))}
        </View>
      </View>
      {kitchenTier >= 3 && (
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: 22, height: 14, borderRadius: 7, backgroundColor: "#E8C86A", marginHorizontal: 5, borderWidth: 1.5, borderColor: "#A87838" }} />
          ))}
        </View>
      )}
    </View>
  );
}

// ---------- taco: the cantina counter (the stand's own kitchen station) ----------
// Drawn pots with lids on a wood slab; the front is plain planks at tier 0,
// then cantina tile from tier 1, deeper and richer by tier, with a hanging
// chili ristra from tier 2. Labeled as this place's kitchen — the Cantina
// Kitchen — never the generic home one.
export function TacoCantinaCounter({ tier }: { tier: number }) {
  const pot = (key: number, w: number, h: number) => (
    <View key={key} style={{ alignItems: "center", marginHorizontal: 4 }}>
      {/* lid knob + lid */}
      <View style={{ width: 6, height: 4, borderRadius: 2, backgroundColor: "#33333C" }} />
      <View style={{ width: w * 0.72, height: 5, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: "#8A8A96", borderWidth: 1.5, borderColor: "#33333C", marginBottom: -1.5, zIndex: 2 }} />
      {/* body with a rim band and a shine */}
      <View style={{ width: w, height: h, borderRadius: 5, backgroundColor: "#5A5A64", borderWidth: 2, borderColor: "#33333C", overflow: "hidden" }}>
        <View style={{ height: 4, backgroundColor: "#8A8A96", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 4, top: 8, width: 4, height: Math.max(h - 14, 4), borderRadius: 2, backgroundColor: "#FFFFFF", opacity: 0.16 }} />
      </View>
    </View>
  );
  const tileColors = ["#2EC4B6", "#FF7BAC", "#5E4390", "#7B2D8B"];
  const tileRows = tier >= 2 ? 3 : 2;
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {pot(0, 24, 20)}
        {pot(1, 30, 26)}
        {pot(2, 20, 16)}
        {/* chili ristra hanging by the pots (tier 2+) */}
        {tier >= 2 && (
          <View style={{ alignItems: "center", marginLeft: 7 }}>
            <View style={{ width: 2, height: 7, backgroundColor: "#5E4390" }} />
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  width: 9,
                  height: 13,
                  borderRadius: 5,
                  backgroundColor: "#C22E2E",
                  borderWidth: 1,
                  borderColor: "#7E1B1B",
                  marginTop: i === 0 ? 0 : -4,
                  transform: [{ rotate: i % 2 === 0 ? "-14deg" : "14deg" }],
                }}
              >
                <View style={{ position: "absolute", top: -2, left: 2.5, width: 3.5, height: 4.5, borderRadius: 1.75, backgroundColor: "#4E8B4A" }} />
              </View>
            ))}
          </View>
        )}
      </View>
      {/* the slab top, with a highlight along its front edge */}
      <View style={{ width: 166, height: 10, borderRadius: 4, backgroundColor: "#8B5E34", borderWidth: 2, borderColor: "#46301E", marginTop: -1, zIndex: 2 }}>
        <View style={{ height: 3, borderRadius: 1.5, backgroundColor: "#C68B4E", marginHorizontal: 5, marginTop: 1 }} />
      </View>
      {/* the front: planks at tier 0, cantina tile from tier 1 */}
      <View style={{ width: 158, borderWidth: 2, borderColor: "#241433", borderTopWidth: 0, backgroundColor: "#33224F", padding: tier >= 1 ? 4 : 5 }}>
        {tier >= 1 ? (
          Array.from({ length: tileRows }).map((_, r) => (
            <View key={r} style={{ flexDirection: "row" }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 11,
                    borderRadius: 1.5,
                    margin: 1,
                    backgroundColor: tileColors[(i + r * 2) % tileColors.length],
                    borderWidth: 0.75,
                    borderColor: "rgba(36,20,51,0.5)",
                  }}
                />
              ))}
            </View>
          ))
        ) : (
          <>
            <View style={{ height: 9 }} />
            <View style={{ height: 2, backgroundColor: "#241433", opacity: 0.65 }} />
            <View style={{ height: 9 }} />
            <View style={{ height: 2, backgroundColor: "#241433", opacity: 0.65 }} />
            <View style={{ height: 9 }} />
          </>
        )}
      </View>
      {/* ground shadow */}
      <View style={{ width: 148, height: 8, borderRadius: 4, backgroundColor: "#000000", opacity: 0.18, marginTop: 3 }} />
      <Text style={{ color: "#B9A3D9", fontSize: 10, marginTop: 3, fontStyle: "italic" }}>
        {tier > 0 ? "Cantina Kitchen" : "Cantina Counter"}
      </Text>
    </View>
  );
}

// ---------- sushi: chef counter with bamboo + conveyor ----------
function SushiCounter({ level, kitchenTier }: { level: number; kitchenTier: number }) {
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      {/* bamboo backdrop */}
      <View style={{ flexDirection: "row", marginBottom: -2 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={{ width: 14, height: level >= 3 ? 64 : 48, backgroundColor: i % 2 === 0 ? "#7A9B5A" : "#6B8B4E", borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#4E6E38", borderRadius: 3, marginHorizontal: 1 }}>
            <View style={{ height: 3, backgroundColor: "#4E6E38", marginTop: 14 }} />
            <View style={{ height: 3, backgroundColor: "#4E6E38", marginTop: 14 }} />
          </View>
        ))}
      </View>
      {/* dark wood counter */}
      <View style={{ width: 170, height: 40, borderRadius: 6, backgroundColor: "#2E2419", borderWidth: 2, borderColor: "#1A1410" }}>
        {/* conveyor belt with plates */}
        {kitchenTier >= 1 && (
          <View style={{ position: "absolute", top: 8, left: 8, right: 8, height: 24, borderRadius: 12, backgroundColor: "#3E3A34", borderWidth: 1, borderColor: "#5A544C", flexDirection: "row", alignItems: "center", paddingHorizontal: 8 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: 20, height: 14, borderRadius: 7, backgroundColor: "#E8E4DA", marginHorizontal: 6, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#C0392B" }}>
                <View style={{ width: 10, height: 6, borderRadius: 3, backgroundColor: i === 1 ? "#E8A87A" : "#7AC8A8" }} />
              </View>
            ))}
          </View>
        )}
      </View>
      {/* noren curtain below */}
      {level >= 2 && (
        <View style={{ flexDirection: "row", marginTop: 2 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: 44, height: 26, backgroundColor: i === 1 ? "#C0392B" : "#1A1C22", marginHorizontal: 1, alignItems: "center", paddingTop: 4, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#F0E8D8", opacity: 0.85 }} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------- diner: pie display case ----------
function PieCase({ level, kitchenTier }: { level: number; kitchenTier: number }) {
  const pies = level >= 3 ? 4 : level >= 2 ? 3 : 2;
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      {/* glass case */}
      <View style={{ width: 160, height: 64, borderRadius: 10, backgroundColor: "rgba(200,220,235,0.18)", borderWidth: 3, borderColor: "#9AA2AC", overflow: "hidden" }}>
        {/* chrome shelves */}
        <View style={{ position: "absolute", top: 30, left: 0, right: 0, height: 3, backgroundColor: "#9AA2AC" }} />
        {/* pies */}
        <View style={{ flexDirection: "row", justifyContent: "space-evenly", alignItems: "flex-end", height: "100%", paddingBottom: 6, paddingTop: 8 }}>
          {Array.from({ length: pies }).map((_, i) => (
            <View key={i} style={{ alignItems: "center" }}>
              <View style={{ width: 26, height: 14, borderTopLeftRadius: 13, borderTopRightRadius: 13, backgroundColor: ["#E8A84C", "#C0392B", "#8B5E34", "#E8C86A"][i % 4], borderWidth: 1, borderColor: "#8B5E34" }} />
              <View style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: "#D8DDE2" }} />
            </View>
          ))}
        </View>
        {/* glass shine */}
        <View style={{ position: "absolute", top: 0, left: 12, width: 18, height: "100%", backgroundColor: "#FFFFFF", opacity: 0.12, transform: [{ rotate: "12deg" }] }} />
      </View>
      {/* chrome base */}
      <View style={{ width: 170, height: 12, borderRadius: 6, backgroundColor: "#7A828C", borderWidth: 2, borderColor: "#5A626C", marginTop: 2 }} />
      {kitchenTier >= 2 && (
        <View style={{ flexDirection: "row", marginTop: 6, alignItems: "flex-end" }}>
          {/* coffee mugs */}
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: 16, height: 18, borderRadius: 3, backgroundColor: "#F0F0F0", marginHorizontal: 5, borderWidth: 1, borderColor: "#9AA2AC" }} />
          ))}
        </View>
      )}
    </View>
  );
}

// ---------- diner: the coffee station (always on) ----------
// Glass decanters on warmers — brown band for regular, orange for decaf —
// mugs in a row, and a slow curl of steam. The cups sold here (3 a day)
// grant Dark Forest energy; this is where they come from.
export function DinerCoffeeStation({ level }: { level: number }) {
  const steam = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(steam, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(steam, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [steam]);
  const pot = (key: number, band: string) => (
    <View key={key} style={{ alignItems: "center", marginHorizontal: 7 }}>
      {/* steam curl */}
      <Animated.View
        style={{
          width: 5,
          height: 13,
          borderRadius: 2.5,
          backgroundColor: "#F5EFE0",
          marginBottom: 1,
          opacity: steam.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.4] }),
          transform: [{ translateY: steam.interpolate({ inputRange: [0, 1], outputRange: [2, -2] }) }],
        }}
      />
      {/* glass decanter */}
      <View style={{ width: 24, height: 26, borderTopLeftRadius: 5, borderTopRightRadius: 5, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, backgroundColor: "rgba(214,232,255,0.25)", borderWidth: 1.6, borderColor: "#9AA2AC", overflow: "hidden", alignItems: "center" }}>
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 15, backgroundColor: "#3E2415" }} />
        <View style={{ width: "100%", height: 6, backgroundColor: band, marginTop: 3 }} />
      </View>
      {/* handle + warmer plate */}
      <View style={{ position: "absolute", right: -5, top: 16, width: 7, height: 11, borderRadius: 3.5, borderWidth: 2, borderColor: "#2E2E34" }} />
      <View style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: "#2E2E34", marginTop: 1.5 }} />
    </View>
  );
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {pot(0, "#6E4525")}
        {pot(1, "#E67E22")}
        {level >= 2 && pot(2, "#6E4525")}
      </View>
      {/* mugs in a row */}
      <View style={{ flexDirection: "row", marginTop: 5 }}>
        {Array.from({ length: level >= 3 ? 5 : 3 }).map((_, i) => (
          <View key={i} style={{ width: 14, height: 11, borderRadius: 2.5, backgroundColor: "#F7EBD4", borderWidth: 1, borderColor: "#C8A878", marginHorizontal: 3 }} />
        ))}
      </View>
      <Text style={{ color: "#C8A878", fontSize: 10, marginTop: 3, fontStyle: "italic" }}>The coffee station — bottomless, basically</Text>
    </View>
  );
}

// ---------- upper room: communion table with bread and cup ----------
function CommunionTable({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      {/* stone backdrop */}
      <View style={{ width: 150, height: 70, borderRadius: 10, backgroundColor: "#5E5346", borderWidth: 3, borderColor: "#463C30", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <View style={{ position: "absolute", top: 20, left: 0, right: 0, height: 2, backgroundColor: "#463C30", opacity: 0.6 }} />
        <View style={{ position: "absolute", top: 44, left: 0, right: 0, height: 2, backgroundColor: "#463C30", opacity: 0.6 }} />
        {/* linen-draped table */}
        <View style={{ width: 110, height: 34, borderRadius: 6, backgroundColor: "#F7F0DC", borderWidth: 2, borderColor: "#D8C898", alignItems: "center", justifyContent: "center", flexDirection: "row" }}>
          {/* bread loaves */}
          <View style={{ width: 26, height: 16, borderRadius: 8, backgroundColor: "#D8A85C", borderWidth: 1, borderColor: "#A87838", marginHorizontal: 6 }} />
          {/* the cup */}
          <View style={{ alignItems: "center", marginHorizontal: 6 }}>
            <View style={{ width: 16, height: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: "#C8A84C", borderWidth: 1, borderColor: "#8B6A3A" }} />
            <View style={{ width: 4, height: 10, backgroundColor: "#C8A84C" }} />
            <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: "#C8A84C" }} />
          </View>
          <View style={{ width: 26, height: 16, borderRadius: 8, backgroundColor: "#D8A85C", borderWidth: 1, borderColor: "#A87838", marginHorizontal: 6 }} />
        </View>
      </View>
      {/* candles flank the table */}
      {level >= 2 && (
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          {[0, 1].map((s) => (
            <View key={s} style={{ alignItems: "center", marginHorizontal: 44 }}>
              <GlowPulse duration={1500}>
                <View style={{ width: 8, height: 12, borderRadius: 4, backgroundColor: "#FF9A3D" }} />
              </GlowPulse>
              <View style={{ width: 10, height: 22, borderRadius: 3, backgroundColor: "#F5EFE0", marginTop: -2, borderWidth: 1, borderColor: "#D8C898" }} />
            </View>
          ))}
        </View>
      )}
      {level >= 3 && (
        <GlowPulse duration={2200}>
          <View style={{ width: 170, height: 40, borderRadius: 20, backgroundColor: "#FFD97A", opacity: 0.12, marginTop: -46 }} />
        </GlowPulse>
      )}
    </View>
  );
}

// ---------- manna house: big bread oven with loaves ----------
function BreadOven({ level, kitchenTier }: { level: number; kitchenTier: number }) {
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      <View style={{ width: 140, height: 90, borderTopLeftRadius: 70, borderTopRightRadius: 70, backgroundColor: "#7A5A38", borderWidth: 4, borderColor: "#4E3822", alignItems: "center", justifyContent: "flex-end", paddingBottom: 14, overflow: "hidden" }}>
        {/* stone courses */}
        <View style={{ position: "absolute", top: 22, left: 10, right: 10, height: 2, backgroundColor: "#4E3822", opacity: 0.5 }} />
        <View style={{ position: "absolute", top: 44, left: 10, right: 10, height: 2, backgroundColor: "#4E3822", opacity: 0.5 }} />
        {/* warm fire */}
        <GlowPulse duration={1000}>
          <View style={{ width: 40, height: 28, borderRadius: 12, backgroundColor: "#FF9A3D", opacity: 0.85 }} />
        </GlowPulse>
        {/* loaves baking */}
        {kitchenTier >= 1 && (
          <View style={{ position: "absolute", bottom: 12, flexDirection: "row" }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: 20, height: 12, borderRadius: 6, backgroundColor: "#E8C86A", marginHorizontal: 4, borderWidth: 1, borderColor: "#A87838" }} />
            ))}
          </View>
        )}
      </View>
      <View style={{ width: 160, height: 10, borderRadius: 5, backgroundColor: "#4E3822", marginTop: 2 }} />
      {/* flour sacks */}
      {level >= 2 && (
        <View style={{ flexDirection: "row", marginTop: 4, alignItems: "flex-end" }}>
          {[0, 1].map((i) => (
            <View key={i} style={{ alignItems: "center", marginHorizontal: 8 }}>
              <View style={{ width: 30, height: 8, backgroundColor: "#C8B898", borderRadius: 4 }} />
              <View style={{ width: 36, height: 30, backgroundColor: "#D8C8A8", borderRadius: 8, marginTop: -2, borderWidth: 1, borderColor: "#A89878", alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 16, height: 10, borderRadius: 5, backgroundColor: "#E8C86A" }} />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------- feast hall: golden goblets + serving platters ----------
function GobletDisplay({ level }: { level: number }) {
  const goblet = (key: number) => (
    <View key={key} style={{ alignItems: "center", marginHorizontal: 10 }}>
      <GlowPulse duration={1600 + key * 300}>
        <View style={{ width: 22, height: 14, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: "#E0A63F", borderWidth: 2, borderColor: "#B8860B" }} />
      </GlowPulse>
      <View style={{ width: 5, height: 18, backgroundColor: "#E0A63F" }} />
      <View style={{ width: 18, height: 5, borderRadius: 2.5, backgroundColor: "#E0A63F" }} />
    </View>
  );
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      {/* sideboard */}
      <View style={{ width: 170, height: 14, borderRadius: 7, backgroundColor: "#5E3D22", borderWidth: 2, borderColor: "#3E2812" }} />
      <View style={{ flexDirection: "row", marginTop: -34, alignItems: "flex-end" }}>
        {goblet(0)}
        {/* grand serving platter */}
        <View style={{ alignItems: "center", marginHorizontal: 8 }}>
          <View style={{ width: 56, height: 10, borderRadius: 5, backgroundColor: "#C8C8D0", borderWidth: 2, borderColor: "#8A8A94" }} />
          <View style={{ flexDirection: "row", marginTop: -14 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: 12, height: 10, borderRadius: 5, backgroundColor: ["#C0392B", "#E8A84C", "#7A8B3A"][i], marginHorizontal: 2 }} />
            ))}
          </View>
          {level >= 3 && (
            <View style={{ width: 40, height: 16, borderRadius: 8, backgroundColor: "#B8860B", marginTop: -22, opacity: 0.35, borderWidth: 1, borderColor: "#E0A63F" }} />
          )}
        </View>
        {goblet(1)}
        {level >= 2 && goblet(2)}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", width: 150, marginTop: 2 }}>
        <View style={{ width: 10, height: 26, backgroundColor: "#3E2812" }} />
        <View style={{ width: 10, height: 26, backgroundColor: "#3E2812" }} />
      </View>
    </View>
  );
}

// ---------- marriage supper: floral garland (outdoor) ----------
function FloralGarland({ level }: { level: number }) {
  const flowers = ["#E86A92", "#F2A541", "#9C6FB5", "#F5F0DC", "#E4572E"];
  return (
    <View style={{ alignItems: "center", marginVertical: 8 }}>
      <View style={{ position: "absolute", top: 10, left: 24, right: 24, height: 3, backgroundColor: "#3E5A3E", borderRadius: 1.5 }} />
      <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap", width: "92%" }}>
        {Array.from({ length: level >= 3 ? 14 : level >= 2 ? 10 : 7 }).map((_, i) => (
          <View key={i} style={{ alignItems: "center", marginHorizontal: 5, marginTop: (i % 2) * 8 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: flowers[i % flowers.length], borderWidth: 1, borderColor: "rgba(0,0,0,0.15)" }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFF9D6", margin: 4 }} />
            </View>
            <View style={{ width: 3, height: 10, backgroundColor: "#3E5A3E" }} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ============================================================
// FLOOR — themed floor treatments per cuisine
// ============================================================
export function CuisineFloor({ cuisine, level }: { cuisine: string; level: number }) {
  switch (cuisine) {
    case "burger-joint":
      // bright white tile with a red accent every fifth — cold and clean
      return (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.55 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {Array.from({ length: 60 }).map((_, i) => {
              const col = i % 10;
              const red = col === 4;
              return <View key={i} style={{ width: "10%", height: 22, backgroundColor: red ? "#D22630" : "#FFFFFF", borderWidth: 0.5, borderColor: "#D8D2C8", opacity: red ? 0.75 : 1 }} />;
            })}
          </View>
        </View>
      );
    case "diner":
      // black-and-white checkerboard (L2+)
      if (level < 2) return null;
      return (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {Array.from({ length: 60 }).map((_, i) => {
              const row = Math.floor(i / 10);
              const col = i % 10;
              const dark = (row + col) % 2 === 0;
              return <View key={i} style={{ width: "10%", height: 22, backgroundColor: dark ? "#1E1E24" : "#E8E8E4" }} />;
            })}
          </View>
        </View>
      );
    case "pizza-place":
      // the wild party carpet: deep purple tiles strewn with confetti
      return (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <View key={i} style={{ width: "12.5%", height: 30, backgroundColor: i % 2 === 0 ? "#5B3480" : "#4A2A63", borderWidth: 0.5, borderColor: "#38204D", alignItems: "center", justifyContent: "center" }}>
                {i % 5 === 1 && <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#2EC4B6", opacity: 0.8 }} />}
                {i % 5 === 3 && <View style={{ width: 8, height: 4, borderRadius: 2, backgroundColor: "#FF5A7A", opacity: 0.8, transform: [{ rotate: "24deg" }] }} />}
                {i % 7 === 5 && <View style={{ width: 6, height: 6, backgroundColor: "#FFD23F", opacity: 0.8, transform: [{ rotate: "45deg" }] }} />}
              </View>
            ))}
          </View>
        </View>
      );
    case "taco-stand":
      // cantina tile underfoot: deep purple tiles with a teal or pink
      // accent tile scattered in, and the retro medallion inlay on top —
      // teal ring, pink ring, golden sun at the heart (a dotted outer
      // ring joins at L3).
      return (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {Array.from({ length: 70 }).map((_, i) => {
                const accentTile = i % 17 === 8 ? "#2EC4B6" : i % 23 === 11 ? "#FF7BAC" : null;
                return (
                  <View
                    key={i}
                    style={{
                      width: "10%",
                      height: 24,
                      backgroundColor: accentTile ?? (i % 2 === 0 ? "#463264" : "#3E2A5C"),
                      borderWidth: 0.5,
                      borderColor: "#2E1B47",
                    }}
                  />
                );
              })}
            </View>
          </View>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.45, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 8, borderColor: "#2EC4B6", opacity: 0.55 }} />
            <View style={{ position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: "#FF7BAC", opacity: 0.55 }} />
            <View style={{ position: "absolute", width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFD23F", opacity: 0.4 }} />
            {level >= 3 &&
              Array.from({ length: 10 }).map((_, i) => {
                const rad = (i * 36 * Math.PI) / 180;
                return (
                  <View
                    key={i}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      marginLeft: -3.5 + Math.cos(rad) * 70,
                      marginTop: -3.5 + Math.sin(rad) * 70,
                      width: 7,
                      height: 7,
                      borderRadius: 3.5,
                      backgroundColor: i % 2 === 0 ? "#FFD23F" : "#F6EEFC",
                      opacity: 0.65,
                    }}
                  />
                );
              })}
          </View>
        </View>
      );
    case "sushi-bar":
      // tatami mat accents
      return (
        <View style={{ position: "absolute", bottom: 10, left: 16, right: 16, flexDirection: "row", opacity: 0.5 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flex: 1, height: 44, backgroundColor: "#8A9B6A", borderWidth: 2, borderColor: "#5E6E3A", marginHorizontal: 4, borderRadius: 4 }}>
              <View style={{ height: 2, backgroundColor: "#5E6E3A", marginTop: 14 }} />
              <View style={{ height: 2, backgroundColor: "#5E6E3A", marginTop: 10 }} />
            </View>
          ))}
        </View>
      );
    case "upper-room":
      // Jerusalem stone tiles
      return (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {Array.from({ length: 32 }).map((_, i) => (
              <View key={i} style={{ width: "12.5%", height: 36, backgroundColor: i % 3 === 0 ? "#7A6E5A" : "#6B5E4A", borderWidth: 1, borderColor: "#52463A" }} />
            ))}
          </View>
        </View>
      );
    case "feast-hall":
      // red carpet runner at L2+
      if (level < 2) return null;
      return (
        <View style={{ position: "absolute", top: 0, bottom: 0, left: "30%", right: "30%", backgroundColor: "#7A2E2E", opacity: 0.55, borderLeftWidth: 3, borderRightWidth: 3, borderColor: "#E0A63F" }} />
      );
    case "banquet-table":
      // grass under open sky
      return (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.35 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <View key={i} style={{ width: "12.5%", height: 30, backgroundColor: i % 2 === 0 ? "#4E6E4A" : "#446040" }} />
            ))}
          </View>
        </View>
      );
    default:
      return null;
  }
}

// ============================================================
// CENTERPIECE — themed table centerpieces per cuisine
// ============================================================
export function CuisineCenterpiece({ cuisine, grand }: { cuisine: string; grand: boolean }) {
  if (!grand) return null;
  switch (cuisine) {
    case "pizza-place":
      // candle in wine bottle
      return (
        <View style={{ alignItems: "center" }}>
          <GlowPulse duration={1400}>
            <View style={{ width: 8, height: 12, borderRadius: 4, backgroundColor: "#FF9A3D" }} />
          </GlowPulse>
          <View style={{ width: 14, height: 30, borderRadius: 4, backgroundColor: "#2E4A2E", marginTop: -2, borderWidth: 1, borderColor: "#1E3220" }} />
        </View>
      );
    case "burger-joint":
    case "diner":
      // mini milkshake / ketchup-mustard
      return (
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <View style={{ width: 12, height: 22, borderRadius: 3, backgroundColor: "#C0392B", marginHorizontal: 2 }} />
          <View style={{ width: 12, height: 22, borderRadius: 3, backgroundColor: "#E8C86A", marginHorizontal: 2 }} />
        </View>
      );
    case "taco-stand":
      // small cactus in pot
      return (
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 14, height: 22, borderRadius: 7, backgroundColor: "#4E8B4A" }} />
          <View style={{ width: 8, height: 12, borderRadius: 4, backgroundColor: "#4E8B4A", marginTop: -18, marginLeft: -12, transform: [{ rotate: "-30deg" }] }} />
          <View style={{ width: 20, height: 12, borderRadius: 3, backgroundColor: "#A06838", marginTop: -2 }} />
        </View>
      );
    case "sushi-bar":
      // tiny bonsai
      return (
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 4, height: 18, backgroundColor: "#5E3D22" }} />
          <View style={{ width: 26, height: 14, borderRadius: 7, backgroundColor: "#4E8B4A", marginTop: -20 }} />
          <View style={{ width: 22, height: 10, borderRadius: 5, backgroundColor: "#2E2E34", marginTop: -2 }} />
        </View>
      );
    case "upper-room":
    case "manna-house":
      // olive sprig in clay vase
      return (
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 3, height: 22, backgroundColor: "#5E6E3A" }} />
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ position: "absolute", top: 2 + i * 6, left: i % 2 === 0 ? 8 : 16, width: 10, height: 6, borderRadius: 3, backgroundColor: "#6B8B4A" }} />
          ))}
          <View style={{ width: 16, height: 14, borderRadius: 4, backgroundColor: "#A06838", marginTop: -2 }} />
        </View>
      );
    case "feast-hall":
    case "banquet-table":
      // golden chalice with flowers
      return (
        <View style={{ alignItems: "center" }}>
          <View style={{ flexDirection: "row" }}>
            {["#E86A92", "#F2A541", "#9C6FB5"].map((c, i) => (
              <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c, marginHorizontal: 1 }} />
            ))}
          </View>
          <View style={{ width: 16, height: 12, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: "#E0A63F", marginTop: 1 }} />
          <View style={{ width: 4, height: 10, backgroundColor: "#E0A63F" }} />
          <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: "#E0A63F" }} />
        </View>
      );
    default:
      return null;
  }
}
