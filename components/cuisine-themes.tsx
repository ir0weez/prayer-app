// ---------- cuisine themes for restaurant interiors ----------
// Each restaurant type gets themed SVG decor: wall art, overhead lighting,
// a signature back-wall piece, and a color palette. Real SVG art, no emojis.
// Animations: sine-ease only, no bounce.

import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

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
    bg: "#2A1A12", wall: "#4A2E1E", floor: "#8A5A3A", floorLine: "#6E4429",
    card: "#3D2617", cardBorder: "#6B4A2E", accent: "#E07840",
    text: "#F7E8D5", textDim: "#C49A72",
    cloth: ["", "#F5EFE0", "#C0392B", "#7A1F1F"], // red-checkered trattoria
    wood: "#C0C6CE", woodDark: "#7A828C",
  },
  "burger-joint": {
    bg: "#1A1A22", wall: "#2E2E3A", floor: "#3A3A44", floorLine: "#2A2A32",
    card: "#26262E", cardBorder: "#4A4A58", accent: "#FF5A7A",
    text: "#F5F0E8", textDim: "#A8A8B8",
    cloth: ["", "#F0F0F0", "#FF5A7A", "#2E2E3A"], // chrome diner
    wood: "#8B5E34", woodDark: "#5E3D22",
  },
  "taco-stand": {
    bg: "#2E1E12", wall: "#5E3A24", floor: "#A06838", floorLine: "#7E4E28",
    card: "#422A18", cardBorder: "#7A5230", accent: "#F2A541",
    text: "#FBEED8", textDim: "#D4A878",
    cloth: ["", "#F7EED8", "#E4572E", "#9C4A1A"], // warm fiesta
    wood: "#4A3A2A", woodDark: "#2E2419",
  },
  "sushi-bar": {
    bg: "#14161C", wall: "#23262E", floor: "#3E3226", floorLine: "#2E2419",
    card: "#1E2128", cardBorder: "#3E4250", accent: "#C0392B",
    text: "#EDE8DC", textDim: "#9A94A0",
    cloth: ["", "#2E3138", "#C0392B", "#1A1C22"], // dark + vermillion
    wood: "#B8BEC6", woodDark: "#7A828C",
  },
  diner: {
    bg: "#1E2228", wall: "#343A44", floor: "#4A5058", floorLine: "#383E46",
    card: "#2A2F36", cardBorder: "#4E565E", accent: "#5AB9EA",
    text: "#F2F4F6", textDim: "#A8B0B8",
    cloth: ["", "#F5F5F0", "#5AB9EA", "#2E343C"], // chrome + sky blue
    wood: "#8B6A48", woodDark: "#5E4A30",
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
      // retro burger poster + license plate
      art = (
        <>
          {frame(0, (
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 34, height: 8, borderRadius: 4, backgroundColor: "#E8A84C" }} />
              <View style={{ width: 38, height: 6, backgroundColor: "#7A8B3A", marginTop: 1 }} />
              <View style={{ width: 36, height: 7, borderRadius: 3, backgroundColor: "#8B4A2A", marginTop: 1 }} />
              <View style={{ width: 34, height: 8, borderRadius: 4, backgroundColor: "#E8A84C", marginTop: 1 }} />
            </View>
          ))}
          {frame(1, (
            <View style={{ width: 48, height: 24, borderRadius: 4, backgroundColor: "#3A6EA5", borderWidth: 2, borderColor: "#F0F0F0", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 30, height: 6, borderRadius: 3, backgroundColor: "#F0F0F0", opacity: 0.8 }} />
            </View>
          ))}
        </>
      );
      break;
    case "taco-stand":
      // Talavera tile + chili ristra
      art = (
        <>
          {frame(0, (
            <View style={{ flexDirection: "row", flexWrap: "wrap", width: 52, height: 40, justifyContent: "center" }}>
              {["#2E86AB", "#E4572E", "#F2A541", "#2E86AB"].map((c, i) => (
                <View key={i} style={{ width: 22, height: 18, backgroundColor: c, margin: 1, borderRadius: 2, alignItems: "center", justifyContent: "center" }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F7EED8", opacity: 0.7 }} />
                </View>
              ))}
            </View>
          ))}
          {frame(1, (
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 2, height: 16, backgroundColor: "#6B8B3A" }} />
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: 8, height: 12, borderRadius: 4, backgroundColor: "#C0392B", marginTop: -1, borderWidth: 1, borderColor: "#8B2A1E" }} />
              ))}
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
      // neon tube
      return <NeonTube color="#FF5A7A" label="burgers" />;
    case "taco-stand":
      // papel picado banners
      return <PapelPicado rich={level >= 3} />;
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

function NeonTube({ color, label }: { color: string; label: string }) {
  return (
    <GlowPulse duration={1200}>
      <View style={{ alignItems: "center", marginVertical: 10 }}>
        <View style={{ borderWidth: 3, borderColor: color, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 8, backgroundColor: "rgba(255,90,122,0.08)" }}>
          <View style={{ flexDirection: "row" }}>
            {label.split("").map((ch, i) => (
              <View key={i} style={{ width: ch === " " ? 8 : 10, height: 18, marginHorizontal: 1, backgroundColor: ch === " " ? "transparent" : color, opacity: 0.9, borderRadius: 2 }} />
            ))}
          </View>
        </View>
        <View style={{ width: 120, height: 20, borderRadius: 10, backgroundColor: color, opacity: 0.15, marginTop: -24 }} />
      </View>
    </GlowPulse>
  );
}

function PapelPicado({ rich }: { rich: boolean }) {
  const colors = ["#E4572E", "#F2A541", "#2E86AB", "#9C6FB5", "#E86A92"];
  const rows = rich ? 2 : 1;
  return (
    <View style={{ alignItems: "center", marginVertical: 6 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={{ marginBottom: r === 0 && rows > 1 ? 4 : 0 }}>
          <View style={{ position: "absolute", top: 0, left: 20, right: 20, height: 2, backgroundColor: "#5E3D22" }} />
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 2 }}>
            {Array.from({ length: rich ? 8 : 6 }).map((_, i) => (
              <View key={i} style={{ width: 26, height: 20, backgroundColor: colors[(i + r * 2) % colors.length], marginHorizontal: 2, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 10, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.35)" }} />
              </View>
            ))}
          </View>
        </View>
      ))}
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
      return <Jukebox level={level} />;
    case "taco-stand":
      return <TaqueriaGrill level={level} kitchenTier={kitchenTier} />;
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

// ---------- burger: chrome jukebox ----------
function Jukebox({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      <View style={{ width: 84, height: 110, borderTopLeftRadius: 42, borderTopRightRadius: 42, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: "#3A3A46", borderWidth: 4, borderColor: "#9AA2AC", alignItems: "center", paddingTop: 10, overflow: "hidden" }}>
        {/* glowing arch tubes */}
        <GlowPulse duration={1100}>
          <View style={{ width: 64, height: 30, borderRadius: 15, borderWidth: 3, borderColor: "#FF5A7A", backgroundColor: "rgba(255,90,122,0.12)" }} />
        </GlowPulse>
        {/* song buttons */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 8, width: 64 }}>
          {["#5AB9EA", "#FFD97A", "#7AE08B", "#FF5A7A", "#9C6FB5", "#F2A541"].map((c, i) => (
            <View key={i} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c, margin: 3, borderWidth: 1, borderColor: "#1A1A22" }} />
          ))}
        </View>
        {/* speaker grille */}
        {level >= 2 && (
          <View style={{ marginTop: 6, alignItems: "center" }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: 52, height: 3, borderRadius: 1.5, backgroundColor: "#5A5A66", marginVertical: 1.5 }} />
            ))}
          </View>
        )}
        {level >= 3 && (
          <GlowPulse duration={800}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#5AB9EA", marginTop: 4, opacity: 0.9 }} />
          </GlowPulse>
        )}
      </View>
      <View style={{ width: 96, height: 8, borderRadius: 4, backgroundColor: "#5A5A66", marginTop: 2 }} />
    </View>
  );
}

// ---------- taco: taqueria grill with Talavera tile front ----------
function TaqueriaGrill({ level, kitchenTier }: { level: number; kitchenTier: number }) {
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      {/* grill top with heat shimmer */}
      <View style={{ width: 150, height: 16, borderRadius: 8, backgroundColor: "#2E2E34", borderWidth: 2, borderColor: "#5A5A64" }}>
        <GlowPulse duration={1000}>
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 2 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ width: 18, height: 6, borderRadius: 3, backgroundColor: "#FF9A3D", marginHorizontal: 6, opacity: 0.8 }} />
            ))}
          </View>
        </GlowPulse>
      </View>
      {/* Talavera tile front */}
      <View style={{ width: 150, marginTop: 2, borderRadius: 8, overflow: "hidden", borderWidth: 2, borderColor: "#5E3D22" }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {Array.from({ length: level >= 3 ? 12 : level >= 2 ? 8 : 4 }).map((_, i) => (
            <View key={i} style={{ width: 37.5 - 1, height: 22, backgroundColor: ["#2E86AB", "#E4572E", "#F2A541", "#F7EED8"][i % 4], borderWidth: 0.5, borderColor: "#5E3D22", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.3)" }} />
            </View>
          ))}
        </View>
      </View>
      {/* hanging chili ristras */}
      {level >= 2 && (
        <View style={{ position: "absolute", top: -6, flexDirection: "row" }}>
          {[0, 1].map((s) => (
            <View key={s} style={{ alignItems: "center", marginHorizontal: 52 }}>
              <View style={{ width: 2, height: 14, backgroundColor: "#6B8B3A" }} />
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: 9, height: 13, borderRadius: 5, backgroundColor: i % 2 === 0 ? "#C0392B" : "#E4572E", marginTop: -2 }} />
              ))}
            </View>
          ))}
        </View>
      )}
      {kitchenTier >= 3 && (
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: 22, height: 14, borderRadius: 7, backgroundColor: "#E8C86A", marginHorizontal: 5, borderWidth: 1, borderColor: "#A87838" }} />
          ))}
        </View>
      )}
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
    case "diner":
      // black-and-white checkerboard (diner gets it at L2+)
      if (cuisine === "diner" && level < 2) return null;
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
      // terracotta tiles
      return (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.35 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <View key={i} style={{ width: "12.5%", height: 30, backgroundColor: i % 2 === 0 ? "#A06838" : "#8A5630", borderWidth: 0.5, borderColor: "#6E4429" }} />
            ))}
          </View>
        </View>
      );
    case "taco-stand":
      // terracotta with colorful center inlay
      return (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.4, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 8, borderColor: "#2E86AB", opacity: 0.5 }} />
          <View style={{ position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: "#E4572E", opacity: 0.5 }} />
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
