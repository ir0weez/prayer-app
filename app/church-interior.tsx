import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  CHURCH_PRAYER_COINS_PER_HOUR,
  COINS_STORAGE_KEY,
  TOWN_STORAGE_KEY,
  churchNameFor,
  parseCoins,
  parseTown,
  prayedTodayPeople,
  type HometownCoins,
  type PlacedBuilding,
  type PrayedPerson,
} from "@/lib/hometown";
import { getActiveScheduleActivity, ministryActivityForTitle, type MinistryActivityKind } from "@/lib/schedule-sync";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { PawnPreview } from "@/components/pawn-preview";
import {
  GentleBob,
  KneelingFigure,
  SingingFigure,
  StudyCircles,
  WorkingFigure,
  pickPeople,
} from "@/components/activity-figures";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

// ---------- palette: warm community church ----------
// Bright morning light, honey wood, cream walls — a welcoming gathering place.
const BG = "#FFF9F0"; // warm cream walls
const BG_SOFT = "#FDEFD8"; // warm peach cream (cards)
const WOOD = "#C68B4E"; // honey wood
const WOOD_DARK = "#8B5E34"; // darker warm wood
const WOOD_PALE = "#E3C193"; // pale warm wood (chair seats)
const GOLD = "#C9963C";
const FLAME = "#FF9A3D";
const TEXT = "#4A3826"; // warm dark brown
const TEXT_DIM = "#8A7358"; // warm muted brown
const SKY_TOP = "#FFE9B8"; // morning light at top of window
const SKY_BOT = "#FFD18A"; // warm glow at bottom of window

type FullPerson = PrayedPerson & { prayed: boolean };

// ---------- animated candle flame ----------
function CandleFlame({ size = 14 }: { size?: number }) {
  const flick = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flick, { toValue: 1, duration: 700 + Math.random() * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flick, { toValue: 0, duration: 700 + Math.random() * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [flick]);
  const scale = flick.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] });
  const opacity = flick.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: size * 2.4, height: size * 2.4 }}>
      {/* halo */}
      <Animated.View
        style={{
          position: "absolute",
          width: size * 2.2,
          height: size * 2.2,
          borderRadius: size * 1.1,
          backgroundColor: FLAME,
          opacity: flick.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.38] }),
        }}
      />
      {/* flame */}
      <Animated.View
        style={{
          width: size * 0.7,
          height: size,
          borderRadius: size * 0.35,
          backgroundColor: FLAME,
          transform: [{ scale }],
          opacity,
        }}
      />
    </View>
  );
}

// ---------- single candle ----------
function Candle({ person, onPress }: { person: FullPerson; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width: 56, alignItems: "center", paddingVertical: 6 }}
      accessibilityLabel={person.prayed ? `${person.name}'s candle (lit)` : `${person.name}'s candle (unlit)`}
    >
      <View style={{ height: 30, justifyContent: "flex-end" }}>
        {person.prayed ? (
          <CandleFlame size={13} />
        ) : (
          <View
            style={{
              width: 5,
              height: 12,
              borderRadius: 2.5,
              backgroundColor: "#B09A7A",
            }}
          />
        )}
      </View>
      {/* wax body */}
      <View
        style={{
          width: 16,
          height: 30,
          borderRadius: 4,
          backgroundColor: person.prayed ? "#FFF6E3" : "#C9B18C",
          borderWidth: 1,
          borderColor: person.prayed ? GOLD : "#A98F68",
          shadowColor: person.prayed ? FLAME : "transparent",
          shadowOpacity: person.prayed ? 0.7 : 0,
          shadowRadius: 8,
          elevation: person.prayed ? 4 : 0,
        }}
      />
      <Text
        numberOfLines={1}
        style={{ marginTop: 4, fontSize: 9, color: person.prayed ? TEXT : TEXT_DIM, maxWidth: 52 }}
      >
        {person.name.split(" ")[0]}
      </Text>
    </Pressable>
  );
}

// ---------- tiny animated sparkle (crystal twinkle, sine easing, no bounce) ----------
function Sparkle({ size = 8, delay = 0 }: { size?: number; delay?: number }) {
  const tw = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const t = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(tw, { toValue: 1, duration: 800 + Math.random() * 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(tw, { toValue: 0, duration: 800 + Math.random() * 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(t);
      loop?.stop();
    };
  }, [tw, delay]);
  const scale = tw.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.3] });
  const opacity = tw.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#FFF9D6",
        borderWidth: 1,
        borderColor: "#F5D97A",
        transform: [{ scale }],
        opacity,
        shadowColor: "#FFD97A",
        shadowOpacity: 0.8,
        shadowRadius: 4,
      }}
    />
  );
}

// ---------- grand two-tier chandelier with animated flicker + crystals (L3) ----------
function GrandChandelier() {
  const flick = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flick, { toValue: 1, duration: 900 + Math.random() * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flick, { toValue: 0, duration: 900 + Math.random() * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [flick]);
  const glow = flick.interpolate({ inputRange: [0, 1], outputRange: [0.26, 0.48] });
  const flameScale = flick.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.1] });
  const candle = (key: number) => (
    <View key={key} style={{ alignItems: "center" }}>
      <Animated.View
        style={{ width: 8, height: 11, borderRadius: 5, backgroundColor: FLAME, transform: [{ scale: flameScale }] }}
      />
      <View
        style={{ width: 9, height: 14, borderRadius: 4, backgroundColor: "#FFF6E3", borderWidth: 1, borderColor: GOLD, marginTop: -2 }}
      />
    </View>
  );
  return (
    <View style={{ alignItems: "center", marginBottom: 6 }}>
      {/* gold chains */}
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-start" }}>
        <View style={{ width: 2, height: 34, backgroundColor: "#B8860B", transform: [{ rotate: "18deg" }], marginHorizontal: 8 }} />
        <View style={{ width: 2, height: 40, backgroundColor: "#B8860B" }} />
        <View style={{ width: 2, height: 34, backgroundColor: "#B8860B", transform: [{ rotate: "-18deg" }], marginHorizontal: 8 }} />
      </View>
      {/* upper tier */}
      <View
        style={{
          width: 92,
          height: 20,
          borderRadius: 10,
          backgroundColor: GOLD,
          borderWidth: 2,
          borderColor: "#B8860B",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-evenly",
          paddingHorizontal: 10,
          zIndex: 2,
        }}
      >
        {[0, 1, 2].map(candle)}
      </View>
      {/* hanging crystals */}
      <View style={{ flexDirection: "row", justifyContent: "center", zIndex: 1 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ marginHorizontal: 8, marginTop: -2 }}>
            <Sparkle size={7} delay={i * 240} />
          </View>
        ))}
      </View>
      {/* lower grand tier */}
      <View
        style={{
          width: 172,
          height: 26,
          borderRadius: 13,
          backgroundColor: GOLD,
          borderWidth: 2,
          borderColor: "#B8860B",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-evenly",
          paddingHorizontal: 12,
          marginTop: -4,
          zIndex: 2,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map(candle)}
      </View>
      {/* lower crystal fringe */}
      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <View key={i} style={{ marginHorizontal: 7, marginTop: -1 }}>
            <Sparkle size={6} delay={i * 180 + 120} />
          </View>
        ))}
      </View>
      {/* warm flickering glow */}
      <Animated.View
        style={{ width: 220, height: 64, borderRadius: 32, backgroundColor: FLAME, opacity: glow, marginTop: -78 }}
      />
    </View>
  );
}

// ---------- wall banners + chandelier, by church level ----------
// L1: bare walls. L2: simple fabric banners. L3: crimson gold-trimmed banners +
// a grand two-tier flickering crystal chandelier.
function ChurchBanners({ level }: { level: number }) {
  if (level < 2) return null;
  const bannerColor = level >= 3 ? "#7A2E2E" : "#8B5E34";
  const trimColor = level >= 3 ? GOLD : WOOD_PALE;
  const banner = (key: number) => (
    <View key={key} style={{ alignItems: "center", marginHorizontal: 26 }}>
      <View
        style={{
          width: 54,
          height: 120,
          backgroundColor: bannerColor,
          borderWidth: level >= 3 ? 3 : 2,
          borderColor: trimColor,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={level >= 3 ? "wb-sunny" : "favorite"} size={22} color={trimColor} />
        {level >= 3 && (
          <View style={{ marginTop: 6, width: 30, height: 2, backgroundColor: trimColor, borderRadius: 1 }} />
        )}
      </View>
      {/* pointed bottom */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 27,
          borderRightWidth: 27,
          borderTopWidth: 18,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: bannerColor,
        }}
      />
    </View>
  );
  return (
    <View style={{ alignItems: "center", marginBottom: 2 }}>
      {level >= 3 && <GrandChandelier />}
      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        {banner(0)}
        {banner(1)}
      </View>
    </View>
  );
}

// ---------- altar dressing by level ----------
// L1: plain wooden cross. L2: + white cloth + candles.
// L3: ornate gold frontal with fringe medallions + tall golden candlesticks + bouquets.
function AltarDressing({ level }: { level: number }) {
  if (level < 2) return null;
  const grand = level >= 3;
  const candle = (key: number) => (
    <View key={key} style={{ alignItems: "center", marginHorizontal: 44 }}>
      <View style={{ width: 8, height: 14, borderRadius: 4, backgroundColor: FLAME }} />
      <View style={{ width: 10, height: 30, borderRadius: 4, backgroundColor: "#FFF6E3", borderWidth: 1, borderColor: GOLD, marginTop: -2 }} />
      <View style={{ width: 22, height: 6, borderRadius: 3, backgroundColor: WOOD_DARK, marginTop: 2 }} />
    </View>
  );
  // tall golden candlestick with an animated flame (L3)
  const tallCandle = (key: number) => (
    <View key={key} style={{ alignItems: "center", marginHorizontal: 18 }}>
      <CandleFlame size={12} />
      <View
        style={{ width: 10, height: 36, borderRadius: 4, backgroundColor: "#FFF6E3", borderWidth: 1, borderColor: GOLD, marginTop: -4 }}
      />
      {/* gold stem + foot */}
      <View style={{ width: 8, height: 16, backgroundColor: GOLD, borderRadius: 3 }} />
      <View style={{ width: 26, height: 6, borderRadius: 3, backgroundColor: GOLD, borderWidth: 1, borderColor: "#B8860B", marginTop: 1 }} />
    </View>
  );
  const flowers = (key: number) => (
    <View key={key} style={{ alignItems: "center", marginHorizontal: grand ? 14 : 30 }}>
      <View style={{ flexDirection: "row" }}>
        {(grand ? ["#E86A92", "#F2A541", "#9C6FB5", "#E4572E", "#D63D5E"] : ["#E86A92", "#F2A541", "#9C6FB5"]).map((c, i) => (
          <View key={i} style={{ width: grand ? 13 : 14, height: grand ? 13 : 14, borderRadius: grand ? 6.5 : 7, backgroundColor: c, marginHorizontal: 1 }} />
        ))}
      </View>
      {/* gilded vase at L3 */}
      <View
        style={{
          width: grand ? 22 : 18,
          height: grand ? 26 : 22,
          borderRadius: 4,
          backgroundColor: grand ? GOLD : "#B0724A",
          borderWidth: grand ? 1 : 0,
          borderColor: "#B8860B",
          marginTop: -3,
        }}
      />
    </View>
  );
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      {/* altar frontal — ornate gold with fringe medallions at L3 */}
      <View
        style={{
          width: grand ? 244 : 210,
          height: grand ? 24 : 14,
          borderRadius: 6,
          backgroundColor: grand ? GOLD : "#FFF9F0",
          borderWidth: grand ? 2 : 1,
          borderColor: grand ? "#B8860B" : "#EAD9B8",
          marginBottom: 6,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {grand && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 5.5,
                  borderWidth: 1.5,
                  borderColor: "#7A2E2E",
                  backgroundColor: "#F5D97A",
                  marginHorizontal: 8,
                }}
              />
            ))}
          </View>
        )}
      </View>
      {grand && (
        <View style={{ flexDirection: "row", marginBottom: 2 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <View
              key={i}
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#B8860B", marginHorizontal: 11 }}
            />
          ))}
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {grand ? (
          <>
            {tallCandle(0)}
            {flowers(0)}
            {tallCandle(1)}
            {tallCandle(2)}
            {flowers(1)}
            {tallCandle(3)}
          </>
        ) : (
          <>
            {candle(0)}
            {candle(1)}
          </>
        )}
      </View>
    </View>
  );
}

// ---------- simple warm window ----------
// A plain arched window with morning light streaming in and a simple cross
// mullion — warm and unadorned, not ornate stained glass.
function WarmWindow({ wide = false }: { wide?: boolean }) {
  const w = wide ? 96 : 72;
  const h = wide ? 128 : 104;
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: w,
          height: h,
          borderTopLeftRadius: w / 2,
          borderTopRightRadius: w / 2,
          borderBottomLeftRadius: 6,
          borderBottomRightRadius: 6,
          backgroundColor: SKY_TOP,
          borderWidth: 4,
          borderColor: WOOD_DARK,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* warm glow at the bottom, like sunlight pooling */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: h * 0.45,
            backgroundColor: SKY_BOT,
            opacity: 0.75,
          }}
        />
        {/* simple cross mullion */}
        <View style={{ position: "absolute", top: 8, bottom: 8, width: 4, backgroundColor: WOOD_DARK, borderRadius: 2 }} />
        <View style={{ position: "absolute", left: 8, right: 8, top: h * 0.45, height: 4, backgroundColor: WOOD_DARK, borderRadius: 2 }} />
        {/* sun disc */}
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: "#FFF3D0",
            borderWidth: 2,
            borderColor: GOLD,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="wb-sunny" size={14} color={GOLD} />
        </View>
      </View>
      {/* sill */}
      <View style={{ width: w + 16, height: 8, borderRadius: 4, backgroundColor: WOOD, marginTop: -2 }} />
    </View>
  );
}

// ---------- stained-glass window (L3) ----------
// A radiant arched window: jewel-tone panes in gold leading, a golden cross
// mullion, and a glowing sun medallion at the crown.
function StainedGlassWindow({ wide = false }: { wide?: boolean }) {
  const w = wide ? 104 : 84;
  const h = wide ? 146 : 122;
  const panes = ["#C0392B", "#2E86AB", "#E0A63F", "#7D3C98", "#2E86AB", "#C0392B", "#2E9E5B", "#E0A63F", "#7D3C98"];
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: w,
          height: h,
          borderTopLeftRadius: w / 2,
          borderTopRightRadius: w / 2,
          borderBottomLeftRadius: 6,
          borderBottomRightRadius: 6,
          backgroundColor: "#FFF9D6",
          borderWidth: 5,
          borderColor: GOLD,
          overflow: "hidden",
          alignItems: "center",
        }}
      >
        {/* jewel panes in gold leading */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", width: w - 12, justifyContent: "center", paddingTop: 8 }}>
          {panes.map((c, i) => (
            <View
              key={i}
              style={{
                width: (w - 20) / 3,
                height: 24,
                backgroundColor: c,
                margin: 1.5,
                borderRadius: 3,
                borderWidth: 1,
                borderColor: "#8B6A2B",
                opacity: 0.92,
              }}
            />
          ))}
        </View>
        {/* radiant sun medallion at the crown */}
        <View
          style={{
            position: "absolute",
            top: 6,
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: "#FFF3D0",
            borderWidth: 2.5,
            borderColor: GOLD,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: FLAME,
            shadowOpacity: 0.8,
            shadowRadius: 8,
          }}
        >
          <MaterialIcons name="wb-sunny" size={15} color={GOLD} />
        </View>
        {/* golden cross mullion */}
        <View style={{ position: "absolute", top: 0, bottom: 0, width: 4, backgroundColor: GOLD, borderRadius: 2, opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 6, right: 6, top: h * 0.52, height: 4, backgroundColor: GOLD, borderRadius: 2, opacity: 0.9 }} />
      </View>
      {/* gilded sill */}
      <View style={{ width: w + 18, height: 9, borderRadius: 4, backgroundColor: GOLD, borderWidth: 1, borderColor: "#B8860B", marginTop: -2 }} />
    </View>
  );
}

// ---------- towering cathedral column (L3) ----------
// Fluted marble shaft with a gilded capital and base.
function CathedralColumn() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      {/* capital */}
      <View style={{ width: 48, height: 12, borderRadius: 3, backgroundColor: GOLD, borderWidth: 1, borderColor: "#B8860B" }} />
      <View style={{ width: 40, height: 8, backgroundColor: "#B8860B" }} />
      {/* fluted marble shaft */}
      <View
        style={{
          width: 32,
          height: 148,
          backgroundColor: "#F5EFE0",
          borderLeftWidth: 2,
          borderRightWidth: 2,
          borderColor: "#D9CDA8",
          flexDirection: "row",
          justifyContent: "space-evenly",
        }}
      >
        <View style={{ width: 3, backgroundColor: "#E2D5B4" }} />
        <View style={{ width: 3, backgroundColor: "#E2D5B4" }} />
        <View style={{ width: 3, backgroundColor: "#E2D5B4" }} />
      </View>
      {/* base */}
      <View style={{ width: 40, height: 8, backgroundColor: "#B8860B" }} />
      <View style={{ width: 50, height: 12, borderRadius: 3, backgroundColor: GOLD, borderWidth: 1, borderColor: "#B8860B" }} />
    </View>
  );
}

// ---------- golden floor candelabra (L3) ----------
// A three-arm standing candelabra with animated flames.
function CandleStand() {
  const arm = (key: number, tall: boolean) => (
    <View key={key} style={{ alignItems: "center", marginHorizontal: 6, marginBottom: tall ? 12 : 0 }}>
      <CandleFlame size={11} />
      <View
        style={{ width: 9, height: tall ? 34 : 24, borderRadius: 4, backgroundColor: "#FFF6E3", borderWidth: 1, borderColor: GOLD, marginTop: -4 }}
      />
      <View style={{ width: 14, height: 5, borderRadius: 2.5, backgroundColor: GOLD, marginTop: 1 }} />
    </View>
  );
  return (
    <View style={{ alignItems: "center", marginHorizontal: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {arm(0, false)}
        {arm(1, true)}
        {arm(2, false)}
      </View>
      {/* gold stem + tripod base */}
      <View style={{ width: 9, height: 64, backgroundColor: GOLD, borderRadius: 4, borderWidth: 1, borderColor: "#B8860B" }} />
      <View style={{ width: 38, height: 8, borderRadius: 4, backgroundColor: GOLD, borderWidth: 1, borderColor: "#B8860B" }} />
    </View>
  );
}

// ---------- simple chair with seated figure ----------
// Individual wooden chairs instead of formal pews — casual gathering.
// L3 adds plush cushions (obviously richer at a glance).
function ChairRow({ occupants, maxSeats = 6, plush = false }: { occupants: PrayedPerson[]; maxSeats?: number; plush?: boolean }) {
  const shown = occupants.slice(0, maxSeats);
  return (
    <View style={{ marginVertical: 10, alignItems: "center" }}>
      {shown.length === 0 ? (
        <Text style={{ color: TEXT_DIM, fontSize: 11, fontStyle: "italic" }}>empty chairs</Text>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center" }}>
          {shown.map((p) => (
            <View key={p.id} style={{ alignItems: "center", marginHorizontal: 6 }}>
              {/* warm glow */}
              <View
                style={{
                  position: "absolute",
                  top: -8,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: FLAME,
                  opacity: 0.22,
                }}
              />
              {/* head */}
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: p.accentColor || "#C9A87A",
                  borderWidth: 1.5,
                  borderColor: GOLD,
                }}
              />
              {/* shoulders */}
              <View
                style={{
                  width: 30,
                  height: 16,
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                  backgroundColor: "#A9713F",
                  marginTop: -4,
                }}
              />
              {/* chair back */}
              <View
                style={{
                  position: "absolute",
                  bottom: -2,
                  width: 36,
                  height: plush ? 30 : 26,
                  borderRadius: 6,
                  backgroundColor: plush ? "#7A2E2E" : WOOD_PALE,
                  borderWidth: 2,
                  borderColor: plush ? GOLD : WOOD_DARK,
                  zIndex: -1,
                }}
              />
            </View>
          ))}
        </View>
      )}
      {/* chair seats */}
      {shown.length > 0 && (
        <View style={{ flexDirection: "row", marginTop: 2 }}>
          {shown.map((p) => (
            <View
              key={p.id}
              style={{
                width: 34,
                height: plush ? 12 : 8,
                borderRadius: 4,
                backgroundColor: plush ? "#A63D3D" : WOOD,
                marginHorizontal: 6,
                borderWidth: 1,
                borderColor: plush ? GOLD : WOOD_DARK,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ---------- pawn kneeling at the altar ----------
function PawnKneeling({ pawn, size = 52 }: { pawn: CustomPawn | null; size?: number }) {
  if (!pawn) return null;
  return (
    <GentleBob delay={100} amount={1.8}>
      <View style={{ alignItems: "center", marginHorizontal: 8 }}>
        <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFE9C4", marginBottom: 2 }}>{pawn.name.split(" ")[0]}</Text>
        <View style={{ transform: [{ scaleY: 0.88 }] }}>
          <PawnPreview pawn={pawn} size={size} />
        </View>
        {/* kneeling hint: low shadow */}
        <View style={{ width: 40, height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.15)", marginTop: -4 }} />
      </View>
    </GentleBob>
  );
}

// ---------- AT THE ALTAR: pawn + villagers praying ----------
function AltarScene({ pawn, people }: { pawn: CustomPawn | null; people: PrayedPerson[] }) {
  const kneelers = pickPeople(people, "church-altar", 3);
  if (!pawn && kneelers.length === 0) return null;
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
      <Text style={{ color: GOLD, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginBottom: 4 }}>
        AT THE ALTAR
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", flexWrap: "wrap" }}>
        {kneelers.slice(0, 1).map((p) => <KneelingFigure key={p.id} person={p} delay={150} showLabel />)}
        <PawnKneeling pawn={pawn} />
        {kneelers.slice(1).map((p, i) => <KneelingFigure key={p.id} person={p} delay={300 + i * 150} showLabel />)}
      </View>
      <Text style={{ color: TEXT_DIM, fontSize: 11, fontStyle: "italic", textAlign: "center", marginTop: 4 }}>
        Bowed in prayer before the cross.
      </Text>
    </View>
  );
}

// ---------- PRAYER MEETING: the whole congregation kneeling ----------
function PrayerScene({ pawn, people }: { pawn: CustomPawn | null; people: PrayedPerson[] }) {
  const shown = people.slice(0, 18);
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      <Text style={{ color: GOLD, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginBottom: 4 }}>
        PRAYER MEETING
      </Text>
      <View style={{ alignItems: "center", marginBottom: 6 }}>
        <PawnKneeling pawn={pawn} size={56} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", flexWrap: "wrap" }}>
        {shown.map((p, i) => <KneelingFigure key={p.id} person={p} delay={i * 110} />)}
      </View>
      <Text style={{ color: TEXT_DIM, fontSize: 11, fontStyle: "italic", textAlign: "center", marginTop: 6 }}>
        Every head bowed, every heart lifted.
      </Text>
    </View>
  );
}

// ---------- WORSHIP: singing together ----------
function WorshipScene({ pawn, people }: { pawn: CustomPawn | null; people: PrayedPerson[] }) {
  const shown = people.slice(0, 15);
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      <Text style={{ color: GOLD, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginBottom: 4 }}>
        WORSHIP
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", flexWrap: "wrap" }}>
        {shown.slice(0, 4).map((p, i) => <SingingFigure key={p.id} person={p} delay={i * 130} />)}
        {pawn && (
          <GentleBob delay={200} amount={3}>
            <View style={{ alignItems: "center", marginHorizontal: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFE9C4", marginBottom: 2 }}>{pawn.name.split(" ")[0]}</Text>
              <MaterialIcons name="music-note" size={16} color="#E0A63F" style={{ marginBottom: 0 }} />
              <PawnPreview pawn={pawn} size={52} />
            </View>
          </GentleBob>
        )}
        {shown.slice(4).map((p, i) => <SingingFigure key={p.id} person={p} delay={(i + 4) * 130} />)}
      </View>
      <Text style={{ color: TEXT_DIM, fontSize: 11, fontStyle: "italic", textAlign: "center", marginTop: 6 }}>
        Voices raised as one.
      </Text>
    </View>
  );
}

// ---------- BIBLE STUDY / SMALL GROUP: discussion circles ----------
function BibleStudyScene({
  pawn,
  people,
  maxPerCircle,
  title,
  blurb,
}: {
  pawn: CustomPawn | null;
  people: PrayedPerson[];
  maxPerCircle: number;
  title: string;
  blurb: string;
}) {
  const shown = people.slice(0, 24);
  return (
    <View style={{ paddingHorizontal: 8, marginBottom: 8 }}>
      <Text style={{ color: GOLD, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginBottom: 4, paddingHorizontal: 8 }}>
        {title}
      </Text>
      {/* the pawn studies in the first circle */}
      {pawn && (
        <View style={{ alignItems: "center", marginBottom: -4 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <GentleBob delay={100}>
              <View style={{ alignItems: "center", marginHorizontal: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFE9C4", marginBottom: 2 }}>{pawn.name.split(" ")[0]}</Text>
                <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: GOLD, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(224,166,63,0.10)" }}>
                  <PawnPreview pawn={pawn} size={40} />
                </View>
                <MaterialIcons name="menu-book" size={14} color={GOLD} style={{ marginTop: 1 }} />
              </View>
            </GentleBob>
          </View>
        </View>
      )}
      <StudyCircles people={shown} maxPerCircle={maxPerCircle} />
      <Text style={{ color: TEXT_DIM, fontSize: 11, fontStyle: "italic", textAlign: "center", marginTop: 2 }}>
        {blurb}
      </Text>
    </View>
  );
}

// ---------- SERVE: working together ----------
function ServeScene({ people }: { people: PrayedPerson[] }) {
  const shown = people.slice(0, 12);
  const icons = ["handyman", "cleaning-services", "volunteer-activism", "inventory", "construction", "local-shipping"];
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      <Text style={{ color: GOLD, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginBottom: 4 }}>
        SERVE PROJECT
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", flexWrap: "wrap" }}>
        {shown.map((p, i) => (
          <WorkingFigure key={p.id} person={p} delay={i * 120} icon={icons[i % icons.length]} showLabel={i < 4} />
        ))}
      </View>
      <Text style={{ color: TEXT_DIM, fontSize: 11, fontStyle: "italic", textAlign: "center", marginTop: 6 }}>
        Hands and feet, working side by side.
      </Text>
    </View>
  );
}

const MINISTRY_TITLES: Record<MinistryActivityKind, string> = {
  "bible-study": "BIBLE STUDY",
  prayer: "PRAYER MEETING",
  worship: "WORSHIP",
  "small-group": "SMALL GROUP",
  serve: "SERVE PROJECT",
  general: "GATHERED TOGETHER",
};

// ---------- main screen ----------
export default function ChurchInteriorScreen() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [building, setBuilding] = useState<PlacedBuilding | null>(null);
  const [people, setPeople] = useState<FullPerson[]>([]);
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [ministry, setMinistry] = useState<{ kind: MinistryActivityKind; title: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [coinsRaw, townRaw, peopleRaw] = await Promise.all([
          AsyncStorage.getItem(COINS_STORAGE_KEY),
          AsyncStorage.getItem(TOWN_STORAGE_KEY),
          AsyncStorage.getItem("prayercircle.people.v1"),
        ]);
        setCoins(parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {}));
        // find building for level/name
        if (townRaw && buildingId) {
          const town = parseTown(JSON.parse(townRaw));
          outer: for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
            const found = town.maps[mapId].buildings.find((b) => b.id === buildingId);
            if (found) {
              setBuilding(found);
              break outer;
            }
          }
        }
        // all prayer contacts, marking prayed-today
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
          now.getDate()
        ).padStart(2, "0")}`;
        let all: FullPerson[] = [];
        try {
          const arr = peopleRaw ? JSON.parse(peopleRaw) : [];
          if (Array.isArray(arr)) {
            all = arr
              .filter((p: any) => p && typeof p.name === "string" && !p.isPersonal)
              .map((p: any) => ({
                id: String(p.id ?? p.name),
                name: String(p.name),
                accentColor: typeof p.accentColor === "string" ? p.accentColor : undefined,
                prayed: p.lastPrayerCompletedDate === today,
              }));
          }
        } catch {}
        // prayed first, then the rest
        all.sort((a, b) => (a.prayed === b.prayed ? 0 : a.prayed ? -1 : 1));
        setPeople(all);
        // the player's pawn, for the altar / ministry scenes
        loadCustomPawn().then((p) => p && setPawn(p)).catch(() => undefined);
        // is a ministry event happening right now? The scene adapts to it.
        getActiveScheduleActivity()
          .then((act) => {
            if (act && act.kind === "church") {
              setMinistry({ kind: ministryActivityForTitle(act.title), title: act.title });
            }
          })
          .catch(() => undefined);
      } catch {}
      setLoaded(true);
    })();
  }, [buildingId]);

  const level = building?.level || 1;
  const churchName = churchNameFor(level);
  const prayed = people.filter((p) => p.prayed);
  const candleBonusPerHour = prayed.length * CHURCH_PRAYER_COINS_PER_HOUR;

  // distribute prayed-for contacts across chair rows — four rows at L3 (a fuller cathedral)
  const rows: PrayedPerson[][] = Array.from({ length: level >= 3 ? 4 : 3 }, () => []);
  prayed.forEach((p, i) => rows[i % rows.length].push(p));

  const handleCandlePress = (person: FullPerson) => {
    if (person.prayed) {
      Alert.alert(
        `${person.name}'s candle`,
        `You prayed for ${person.name} today. Their candle burns bright — +${CHURCH_PRAYER_COINS_PER_HOUR} coins/hour.`
      );
    } else {
      Alert.alert(
        `${person.name}'s candle`,
        `Not yet prayed for today. Pray for ${person.name} in Pray Today to light their candle.`
      );
    }
  };

  const numWindows = level >= 2 ? 3 : 2;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 48,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={TEXT} />
        </Pressable>
        <MaterialIcons name="church" size={26} color={GOLD} style={{ marginLeft: 4 }} />
        <Text style={{ marginLeft: 8, fontSize: 20, fontWeight: "800", color: TEXT }}>{churchName}</Text>
        <View style={{ flex: 1 }} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: BG_SOFT,
            borderRadius: 16,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: "#EAD9B8",
          }}
        >
          <Text style={{ fontSize: 15 }}>🪙</Text>
          <Text style={{ marginLeft: 5, fontWeight: "700", color: TEXT }}>
            {coins.balance.toFixed(2)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* sanctuary — wrapped for holiday/season atmosphere */}
        <View style={{ position: "relative", overflow: "hidden", borderRadius: 18, marginHorizontal: 8, marginBottom: 8 }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="church" />
        {/* blessing banner */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 16,
            backgroundColor: "#FFF3DC",
            borderWidth: 1,
            borderColor: GOLD,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 26 }}>🕯️</Text>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: TEXT, fontWeight: "800", fontSize: 15 }}>
              {prayed.length} {prayed.length === 1 ? "candle" : "candles"} lit
            </Text>
            <Text style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>
              +{candleBonusPerHour} coins/hour flowing to your church. Pray for more people to light more candles.
            </Text>
          </View>
        </View>

        {/* windows — radiant stained glass at L3, warm morning light below */}
        <View style={{ flexDirection: "row", justifyContent: "space-evenly", marginBottom: 8, paddingHorizontal: 12 }}>
          {Array.from({ length: numWindows }).map((_, i) =>
            level >= 3 ? <StainedGlassWindow key={i} wide /> : <WarmWindow key={i} wide={level >= 3} />
          )}
        </View>

        {/* banners + chandelier by level */}
        <ChurchBanners level={level} />

        {/* towering cathedral columns rising behind the altar (L3) */}
        {level >= 3 && (
          <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: -34, marginTop: 4 }}>
            <CathedralColumn />
            <View style={{ width: 190 }} />
            <CathedralColumn />
          </View>
        )}

        {/* front: simple wooden stage with podium + cross */}
        <View style={{ alignItems: "center", marginVertical: 16 }}>
          <View style={{ alignItems: "center" }}>
            {/* cross — gilded at L3 */}
            <View style={{ alignItems: "center", marginBottom: -4, zIndex: 1 }}>
              <View style={{ width: 10, height: 48, backgroundColor: level >= 3 ? "#B8860B" : WOOD_DARK, borderRadius: 4 }} />
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  width: 30,
                  height: 10,
                  backgroundColor: level >= 3 ? "#B8860B" : WOOD_DARK,
                  borderRadius: 4,
                }}
              />
            </View>
            {/* stage platform */}
            <View
              style={{
                width: 190,
                height: 22,
                borderRadius: 8,
                backgroundColor: WOOD,
                borderWidth: 2,
                borderColor: level >= 3 ? GOLD : WOOD_DARK,
              }}
            />
            {/* altar dressing by level: cloth, candles, flowers */}
            <AltarDressing level={level} />
            {/* podium flanked by golden candelabras at L3 */}
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", marginTop: -2 }}>
              {level >= 3 && <CandleStand />}
              <View style={{ alignItems: "center" }}>
                <View
                  style={{
                    width: 56,
                    height: 40,
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    backgroundColor: WOOD_DARK,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="menu-book" size={20} color="#FFF3DC" />
                </View>
                <View style={{ width: 14, height: 26, backgroundColor: WOOD_DARK }} />
                <View style={{ width: 44, height: 8, borderRadius: 4, backgroundColor: WOOD_DARK }} />
              </View>
              {level >= 3 && <CandleStand />}
            </View>
            {/* small plants for warmth */}
            <View style={{ flexDirection: "row", marginTop: 6 }}>
              <View style={{ alignItems: "center", marginHorizontal: 34 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#7BA05B" }} />
                <View style={{ width: 14, height: 12, borderRadius: 3, backgroundColor: "#B0724A", marginTop: -3 }} />
              </View>
              <View style={{ alignItems: "center", marginHorizontal: 34 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#7BA05B" }} />
                <View style={{ width: 14, height: 12, borderRadius: 3, backgroundColor: "#B0724A", marginTop: -3 }} />
              </View>
            </View>
          </View>
          <Text style={{ color: TEXT_DIM, fontSize: 11, marginTop: 10, fontStyle: "italic" }}>
            "The prayer of a righteous person is powerful and effective."
          </Text>
        </View>
        </View>

        {/* ministry happening now? the room adapts to it */}
        {ministry && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              borderRadius: 16,
              backgroundColor: "#FFF3DC",
              borderWidth: 1,
              borderColor: GOLD,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <MaterialIcons name="event" size={22} color={GOLD} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ color: TEXT, fontWeight: "800", fontSize: 14 }}>{MINISTRY_TITLES[ministry.kind]} in session</Text>
              <Text style={{ color: TEXT_DIM, fontSize: 12, marginTop: 1 }}>"{ministry.title}" — the room is set for it.</Text>
            </View>
          </View>
        )}

        {ministry?.kind === "bible-study" ? (
          <BibleStudyScene
            pawn={pawn}
            people={prayed}
            maxPerCircle={6}
            title="BIBLE STUDY"
            blurb="Circles of open Bibles — everyone has a seat at the Word."
          />
        ) : ministry?.kind === "small-group" ? (
          <BibleStudyScene
            pawn={pawn}
            people={prayed}
            maxPerCircle={4}
            title="SMALL GROUP"
            blurb="Small circles, close friends, honest conversation."
          />
        ) : ministry?.kind === "prayer" ? (
          <PrayerScene pawn={pawn} people={prayed} />
        ) : ministry?.kind === "worship" ? (
          <WorshipScene pawn={pawn} people={prayed} />
        ) : ministry?.kind === "serve" ? (
          <ServeScene people={prayed} />
        ) : (
          <>
            {/* the pawn and villagers at prayer before the service */}
            <AltarScene pawn={pawn} people={prayed} />

            {/* gathering — red carpet aisle runs down the middle at L3 */}
            <View style={{ paddingHorizontal: 16, marginBottom: 8, position: "relative" }}>
              <Text style={{ color: GOLD, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginBottom: 4 }}>
                GATHERED TOGETHER
              </Text>
              {prayed.length === 0 ? (
                <Text style={{ color: TEXT_DIM, fontSize: 13, fontStyle: "italic", marginVertical: 12 }}>
                  The chairs are empty. Pray for someone today and they'll take a seat.
                </Text>
              ) : (
                <View>
                  {level >= 3 && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: -6,
                        bottom: -6,
                        left: "50%",
                        marginLeft: -36,
                        width: 72,
                        backgroundColor: "#7A2E2E",
                        borderLeftWidth: 3,
                        borderRightWidth: 3,
                        borderColor: GOLD,
                        borderRadius: 4,
                        opacity: 0.95,
                      }}
                    />
                  )}
                  {rows.map((occ, i) => <ChairRow key={i} occupants={occ} plush={level >= 3} />)}
                </View>
              )}
            </View>
          </>
        )}

        {/* candle wall */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Text style={{ color: GOLD, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginBottom: 4 }}>
            CANDLE WALL
          </Text>
          <Text style={{ color: TEXT_DIM, fontSize: 12, marginBottom: 10 }}>
            One candle for each person. Tap a lit candle to see whose it is.
          </Text>
          {people.length === 0 ? (
            <Text style={{ color: TEXT_DIM, fontSize: 13, fontStyle: "italic" }}>
              No prayer contacts yet. Add people on the People tab.
            </Text>
          ) : (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                backgroundColor: "#FFF3DC",
                borderRadius: 16,
                padding: 10,
                borderWidth: level >= 3 ? 3 : 1,
                borderColor: level >= 3 ? GOLD : "#EAD9B8",
              }}
            >
              {people.map((p) => (
                <Candle key={p.id} person={p} onPress={() => handleCandlePress(p)} />
              ))}
            </View>
          )}
        </View>

        {!loaded && (
          <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Lighting candles…</Text>
        )}
      </ScrollView>
    </View>
  );
}
