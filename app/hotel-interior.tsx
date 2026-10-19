// Grand Hotel interior: an elegant lobby. The pawn greets travelers at the
// check-in desk, villagers check in and relax in the lounge.
// "Welcome Guests" grants coins + XP on a 1-hour cooldown.
// No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from "react-native-svg";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import {
  GentleBob,
  SeatedFigure,
  StandingFigure,
  pickPeople,
} from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";

const BG = "#F6F1E7"; // warm cream walls
const CARD = "#FFFFFF";
const NAVY = "#2B3A55"; // deep navy accents
const NAVY_DARK = "#1E2A40";
const GOLD = "#C9A227"; // brass / gold
const GOLD_LIGHT = "#EAD58A";
const WOOD = "#8B5E34";
const TEXT = "#2E2A24";
const TEXT_DIM = "#8A7E6D";
const COOLDOWN_MS = 60 * 60 * 1000;
const STORAGE_KEY = "prayercircle.interior.hotel.welcome.v1";
const COINS_BY_LEVEL = [8, 15, 28];
const XP_BY_LEVEL = [5, 10, 18];

/** Chandelier — grows grander with level (L2 single, L3 double tier). */
function Chandelier({ grand }: { grand: boolean }) {
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      <Line x1={0} y1={-26} x2={0} y2={-10} stroke={GOLD} strokeWidth={3} />
      <Svg width={grand ? 190 : 130} height={grand ? 96 : 70} viewBox={`0 0 ${grand ? 190 : 130} ${grand ? 96 : 70}`}>
        {/* frame */}
        <Line x1={grand ? 95 : 65} y1={0} x2={grand ? 95 : 65} y2={grand ? 26 : 20} stroke={GOLD} strokeWidth={4} />
        <Ellipse cx={grand ? 95 : 65} cy={grand ? 34 : 28} rx={grand ? 78 : 52} ry={grand ? 18 : 13} fill="none" stroke={GOLD} strokeWidth={4} />
        {/* arms */}
        {Array.from({ length: grand ? 7 : 5 }).map((_, i) => {
          const cx = grand ? 95 : 65;
          const spread = grand ? 68 : 44;
          const x = cx - spread + (i * spread * 2) / (grand ? 6 : 4);
          return <Line key={i} x1={cx} y1={grand ? 20 : 16} x2={x} y2={grand ? 34 : 28} stroke={GOLD} strokeWidth={3} />;
        })}
        {/* candle bulbs */}
        {Array.from({ length: grand ? 7 : 5 }).map((_, i) => {
          const cx = grand ? 95 : 65;
          const spread = grand ? 68 : 44;
          const x = cx - spread + (i * spread * 2) / (grand ? 6 : 4);
          return (
            <g key={i}>
              <Rect x={x - 3} y={grand ? 20 : 16} width={6} height={12} rx={2} fill={GOLD_LIGHT} />
              <Circle cx={x} cy={grand ? 18 : 14} r={3.5} fill="#FFF3C4" />
            </g>
          );
        })}
        {/* second tier for the grand chandelier */}
        {grand && (
          <g>
            <Line x1={95} y1={48} x2={95} y2={62} stroke={GOLD} strokeWidth={4} />
            <Ellipse cx={95} cy={72} rx={48} ry={11} fill="none" stroke={GOLD} strokeWidth={3} />
            {Array.from({ length: 5 }).map((_, i) => {
              const x = 95 - 40 + (i * 80) / 4;
              return (
                <g key={i}>
                  <Rect x={x - 2.5} y={58} width={5} height={11} rx={2} fill={GOLD_LIGHT} />
                  <Circle cx={x} cy={56} r={3} fill="#FFF3C4" />
                </g>
              );
            })}
          </g>
        )}
      </Svg>
    </View>
  );
}

/** Potted palm — gentle sway via GentleBob. */
function Palm({ delay = 0 }: { delay?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <GentleBob delay={delay} amount={2.5}>
        <Svg width={64} height={78} viewBox="0 0 64 78">
          <Path d="M32 60 C32 44 30 32 32 18" stroke="#5B8A5E" strokeWidth={4} fill="none" />
          <Path d="M32 22 C22 16 14 14 6 16 C14 20 22 24 32 26" fill="#6FA372" />
          <Path d="M32 22 C42 16 50 14 58 16 C50 20 42 24 32 26" fill="#6FA372" />
          <Path d="M32 34 C20 28 12 28 4 32 C12 36 22 38 32 38" fill="#5B8A5E" />
          <Path d="M32 34 C44 28 52 28 60 32 C52 36 42 38 32 38" fill="#5B8A5E" />
          <Path d="M32 46 C22 42 16 42 10 46 C18 50 26 50 32 50" fill="#6FA372" />
          <Path d="M32 46 C42 42 48 42 54 46 C46 50 38 50 32 50" fill="#6FA372" />
        </Svg>
      </GentleBob>
      <Rect x={24} y={60} width={16} height={16} rx={3} fill={WOOD} />
    </View>
  );
}

/** Check-in desk — richer materials as the level rises. */
function CheckInDesk({ level }: { level: number }) {
  const front = level >= 3 ? "#E8E2D6" : level >= 2 ? "#7A5A38" : WOOD; // marble / grand wood / simple wood
  const trim = level >= 1 ? GOLD : GOLD;
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 168, alignItems: "center" }}>
        {/* desktop */}
        <View style={{ width: 168, height: 14, borderRadius: 7, backgroundColor: level >= 3 ? "#F4EFE3" : WOOD, borderWidth: 2, borderColor: trim }} />
        {/* front panel */}
        <View style={{ width: 150, height: 62, backgroundColor: front, borderWidth: 2, borderColor: trim, borderTopWidth: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, alignItems: "center", justifyContent: "center" }}>
          {level >= 3 ? (
            // marble veining
            <Svg width={120} height={40} viewBox="0 0 120 40">
              <Path d="M8 30 C30 18 50 34 70 22 C85 14 100 26 114 18" stroke="#CFC7B8" strokeWidth={2.5} fill="none" />
              <Path d="M10 12 C40 20 70 6 110 14" stroke="#D8D2C4" strokeWidth={2} fill="none" />
            </Svg>
          ) : (
            <Text style={{ color: GOLD, fontWeight: "800", fontSize: 11, letterSpacing: 2 }}>GRAND HOTEL</Text>
          )}
        </View>
        {/* items on the desk */}
        <View style={{ position: "absolute", top: -26, flexDirection: "row", alignItems: "flex-end" }}>
          {/* brass bell */}
          <View style={{ alignItems: "center", marginRight: 18 }}>
            <View style={{ width: 22, height: 15, borderTopLeftRadius: 11, borderTopRightRadius: 11, backgroundColor: GOLD, borderWidth: 1.5, borderColor: "#8A6F1C" }} />
            <View style={{ width: 30, height: 5, borderRadius: 2.5, backgroundColor: "#8A6F1C" }} />
            <View style={{ width: 5, height: 6, backgroundColor: "#8A6F1C" }} />
          </View>
          {/* guest ledger (L2+) */}
          {level >= 2 && (
            <View style={{ width: 40, height: 26, borderRadius: 3, backgroundColor: "#FDF6E3", borderWidth: 2, borderColor: "#A31621", transform: [{ rotate: "-6deg" }] }}>
              <View style={{ height: 1.5, backgroundColor: "#C9BFA8", marginTop: 6, marginHorizontal: 4 }} />
              <View style={{ height: 1.5, backgroundColor: "#C9BFA8", marginTop: 3, marginHorizontal: 4 }} />
            </View>
          )}
          {/* table lamp (L3) */}
          {level >= 3 && (
            <View style={{ alignItems: "center", marginLeft: 18 }}>
              <View style={{ width: 22, height: 12, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: GOLD_LIGHT, borderWidth: 1.5, borderColor: GOLD }} />
              <View style={{ width: 4, height: 10, backgroundColor: GOLD }} />
              <View style={{ width: 16, height: 4, borderRadius: 2, backgroundColor: GOLD }} />
            </View>
          )}
        </View>
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Check-in desk</Text>
    </View>
  );
}

/** Sweeping staircase (L3 only), drawn on the side of the lobby. */
function Staircase() {
  const steps = 8;
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={110} height={120} viewBox="0 0 110 120">
        {/* steps */}
        {Array.from({ length: steps }).map((_, i) => {
          const w = 14;
          const h = 12;
          const x = 96 - (i + 1) * w;
          const y = 108 - (i + 1) * h;
          return <Rect key={i} x={x} y={y} width={w} height={h} fill={i % 2 === 0 ? "#D9C9A8" : "#CBB98F"} stroke={GOLD} strokeWidth={1} />;
        })}
        {/* banister */}
        <Path d={`M${96 - steps * 14} 12 L96 108`} stroke={WOOD} strokeWidth={5} fill="none" />
        {Array.from({ length: 5 }).map((_, i) => {
          const t = i / 4;
          const x = 96 - steps * 14 + t * steps * 14;
          const y = 12 + t * 96;
          return <Line key={i} x1={x} y1={y} x2={x} y2={y + 14} stroke={GOLD} strokeWidth={2} />;
        })}
        {/* landing */}
        <Rect x={96} y={96} width={10} height={12} fill="#D9C9A8" stroke={GOLD} strokeWidth={1} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Grand stairs</Text>
    </View>
  );
}

/** Lounge chairs + coffee table (L3). */
function LoungeSet() {
  const chair = (x: number, flip: boolean) => (
    <View key={x} style={{ alignItems: "center", marginHorizontal: 10, transform: [{ scaleX: flip ? -1 : 1 }] }}>
      <View style={{ width: 52, height: 40, borderRadius: 8, backgroundColor: NAVY, borderWidth: 2, borderColor: GOLD }}>
        <View style={{ width: 44, height: 10, borderRadius: 5, backgroundColor: "#3D4E6E", marginTop: 6, alignSelf: "center" }} />
      </View>
      <View style={{ width: 60, height: 14, borderRadius: 7, backgroundColor: NAVY_DARK }} />
    </View>
  );
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {chair(0, false)}
        {/* coffee table with a tiny vase */}
        <View style={{ alignItems: "center", marginHorizontal: 4 }}>
          <View style={{ width: 14, height: 12, borderRadius: 4, backgroundColor: GOLD }} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#E07A5F", marginTop: -4 }} />
          <View style={{ width: 64, height: 10, borderRadius: 5, backgroundColor: WOOD, marginTop: 2 }} />
          <View style={{ flexDirection: "row" }}>
            <View style={{ width: 6, height: 16, backgroundColor: WOOD, marginHorizontal: 14 }} />
            <View style={{ width: 6, height: 16, backgroundColor: WOOD, marginHorizontal: 14 }} />
          </View>
        </View>
        {chair(1, true)}
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Reading lounge</Text>
    </View>
  );
}

/** Framed wall art (L3). */
function WallArt() {
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <View style={{ width: 92, height: 66, borderRadius: 6, backgroundColor: NAVY, borderWidth: 5, borderColor: GOLD, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        <Circle cx={66} cy={18} r={11} fill={GOLD_LIGHT} />
        <Polygon points="20,52 46,26 66,52" fill={WOOD} />
        <Polygon points="46,26 62,44 74,30 84,52 20,52" fill={NAVY_DARK} />
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Lobby art</Text>
    </View>
  );
}

export default function HotelInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastWelcome, setLastWelcome] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setLastWelcome(Number(raw) || 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastWelcome));
  const guests = pickPeople(people, `hotel|${building?.id ?? "hotel"}`, 3);
  const coinsGain = COINS_BY_LEVEL[level - 1];
  const xpGain = XP_BY_LEVEL[level - 1];

  const levelBlurb =
    level >= 3
      ? "Marble, chandeliers, and a sweeping staircase."
      : level >= 2
        ? "Warm light, soft rugs, and smiling faces."
        : "A simple, tidy lobby ready to grow.";

  const handleWelcome = async () => {
    if (remaining > 0) {
      Alert.alert("All welcomed", `Every guest is settled in.\n\nWelcome the next group in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastWelcome(t);
    await AsyncStorage.setItem(STORAGE_KEY, String(t)).catch(() => undefined);
    addCoins(coinsGain);
    await awardCustomXP(xpGain, `hotel-welcome-${t}`).catch(() => undefined);
    Alert.alert(
      "Welcome Guests",
      `You greet each traveler by name and show them to their room.\n\n+${xpGain} XP  ·  +${coinsGain} coins`
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="hotel" iconColor={GOLD} title={buildingName} coins={coins} bg={BG} textColor={TEXT} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="room-service"
          iconColor={GOLD}
          title="A warm welcome"
          blurb={`Every traveler finds rest here. ${levelBlurb}`}
          accent="#E7DCC3"
        />

        {/* lobby scene — richer with level */}
        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#E0D5BC",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FBF7EC" : level >= 2 ? "#F8F4E9" : "#F4F0E6",
          }}
        >
          {/* chandelier glow */}
          {level >= 2 && <Chandelier grand={level >= 3} />}

          {/* upper room: staircase (L3) / art (L3) / window */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 20, marginTop: 6 }}>
            <View style={{ alignItems: "center" }}>
              {/* tall lobby window */}
              <View
                style={{
                  width: level >= 3 ? 96 : 78,
                  height: 100,
                  borderRadius: 10,
                  backgroundColor: "#BFDCEF",
                  borderWidth: 5,
                  borderColor: CARD,
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                <Circle cx={level >= 3 ? 70 : 56} cy={22} r={13} fill="#FFF7D6" />
                <Polygon points="0,100 34,58 62,100" fill={WOOD} />
                <Polygon points="34,58 52,78 70,60 92,100 20,100" fill="#5B8A5E" />
              </View>
              <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>City view</Text>
            </View>
            {level >= 3 && <WallArt />}
            {level >= 3 ? <Staircase /> : <Palm delay={300} />}
          </View>

          {/* check-in: the pawn greets an arriving villager */}
          <View style={{ marginTop: 10, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end" }}>
              {guests[0] && <StandingFigure person={guests[0]} delay={200} icon="luggage" iconColor={GOLD} />}
              {pawn && (
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <MaterialIcons name="waving-hand" size={15} color={GOLD} />
                  <PawnPreview pawn={pawn} size={50} />
                  <Text style={{ fontSize: 10, fontWeight: "700", color: NAVY, marginTop: 2 }}>{pawn.name.split(" ")[0]}</Text>
                </View>
              )}
            </View>
            <CheckInDesk level={level} />
          </View>

          {/* rug (L2+) and lounge (L3) */}
          {level >= 2 && (
            <View style={{ alignItems: "center", marginTop: 6 }}>
              <View
                style={{
                  width: "82%",
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: level >= 3 ? "#A31621" : "#B85450",
                  borderWidth: 2,
                  borderColor: GOLD,
                }}
              />
              <View style={{ width: "70%", height: 8, borderRadius: 4, backgroundColor: "#C67B5C", marginTop: -12, opacity: 0.6 }} />
            </View>
          )}
          {level >= 3 && <LoungeSet />}

          {/* lounge villagers: reading and resting */}
          {(guests[1] || guests[2]) && level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: level >= 3 ? -6 : 8, paddingBottom: 10 }}>
              {guests[1] && <SeatedFigure person={guests[1]} delay={400} chairColor={NAVY} chairBorder={GOLD} />}
              {guests[2] && <SeatedFigure person={guests[2]} delay={700} chairColor={NAVY} chairBorder={GOLD} />}
            </View>
          )}

          {/* waiting villagers at L1 */}
          {level < 2 && guests[1] && (
            <View style={{ flexDirection: "row", justifyContent: "center", paddingBottom: 12, marginTop: 4 }}>
              <StandingFigure person={guests[1]} delay={500} icon="meeting-room" iconColor={GOLD} />
            </View>
          )}

          {/* plants row (L2+) */}
          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 36, marginTop: 4 }}>
              <Palm delay={600} />
              <Palm delay={900} />
            </View>
          )}

          {/* floor */}
          <View style={{ height: 26, backgroundColor: "#E4D9C2", marginTop: 8 }}>
            <View style={{ height: 3, backgroundColor: "#D4C6A6" }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Next welcome in ${formatCooldown(remaining)}` : "Welcome Guests"}
          onPrimary={handleWelcome}
          primaryColor={NAVY}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "Marble, a grand chandelier, and the sweeping stairs." : "A grander desk, chandelier, and soft rugs.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Hospitality pays: each welcome brings coins and XP. Refreshes in an hour.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Preparing the lobby…</Text>}
      </ScrollView>
    </View>
  );
}
