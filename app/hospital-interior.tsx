// Hospital interior: a bright, clean exam room. The pawn lies on the exam
// table getting a checkup; the doctor stands by, a nurse villager assists.
// "Get Checkup" grants the Doctor's Blessing (Dark Forest buff) on a daily
// cooldown. No emojis — SVG art and MaterialIcons only.

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import {
  BUILDINGS,
  COINS_STORAGE_KEY,
  TOWN_STORAGE_KEY,
  hospitalBlessingForLevel,
  parseCoins,
  parseTown,
  prayedTodayPeople,
  saveHospitalBuff,
  beginConstruction,
  constructionTimeLabel,
  upgradeCostFor,
  type HometownCoins,
  type PlacedBuilding,
  type PrayedPerson,
} from "@/lib/hometown";
import {
  checkupMsRemaining,
  formatCooldown,
  loadLastCheckup,
  saveLastCheckup,
} from "@/lib/gathering-places";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { PawnPreview } from "@/components/pawn-preview";
import { DoctorFigure, GentleBob, NurseFigure, SoftPulse, pickPeople } from "@/components/activity-figures";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";

const BG = "#F2F7FA"; // clean clinical light
const CARD = "#FFFFFF";
const TEAL = "#0E7C86";
const TEAL_DARK = "#0A5A62";
const TEXT = "#1E3A40";
const TEXT_DIM = "#6B8A90";
const RED = "#EF4444";
const GOLD = "#C9963C"; // gilded accents at the state-of-the-art level

/** Exam table with the pawn lying on it. Grand (L3): gold-trimmed gleaming steel. */
function ExamTable({ pawn, grand = false }: { pawn: CustomPawn | null; grand?: boolean }) {
  const steel = grand ? GOLD : "#94A3B8";
  return (
    <View style={{ alignItems: "center", marginVertical: 8 }}>
      <View style={{ width: 230, alignItems: "center" }}>
        {/* paper roll headrest */}
        <Svg width={230} height={120} viewBox="0 0 230 120">
          {/* table base */}
          <Rect x={20} y={86} width={190} height={10} rx={4} fill={steel} />
          <Rect x={40} y={96} width={12} height={20} fill="#64748B" />
          <Rect x={178} y={96} width={12} height={20} fill="#64748B" />
          {/* mattress */}
          <Rect x={16} y={64} width={198} height={24} rx={10} fill="#E0F2FE" stroke={grand ? GOLD : "#BAE6FD"} strokeWidth={grand ? 3 : 2} />
          {/* paper sheet */}
          <Rect x={24} y={66} width={182} height={6} rx={3} fill="#FFFFFF" opacity={0.9} />
          {/* pillow */}
          <Ellipse cx={52} cy={62} rx={24} ry={10} fill="#FFFFFF" stroke={grand ? GOLD : "#CBD5E1"} strokeWidth={grand ? 2 : 1.5} />
        </Svg>
        {/* the pawn, lying back on the table */}
        {pawn && (
          <View style={{ position: "absolute", top: 8, alignItems: "center" }}>
            <SoftPulse duration={2400}>
              <MaterialIcons name="favorite" size={14} color={RED} style={{ marginBottom: 2 }} />
            </SoftPulse>
            <View style={{ transform: [{ rotate: "-90deg" }], opacity: 0.98 }}>
              <PawnPreview pawn={pawn} size={52} />
            </View>
            <Text style={{ fontSize: 10, fontWeight: "700", color: TEAL_DARK, marginTop: -6 }}>{pawn.name.split(" ")[0]}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** Overhead surgical light (L3): a gleaming multi-bulb dome on an arm. */
function SurgicalLight() {
  return (
    <View style={{ alignItems: "center", marginTop: 2 }}>
      <View style={{ width: 6, height: 24, backgroundColor: "#94A3B8" }} />
      <View
        style={{
          width: 124,
          height: 28,
          borderRadius: 14,
          backgroundColor: "#EAF2F6",
          borderWidth: 2,
          borderColor: GOLD,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-evenly",
          paddingHorizontal: 10,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              width: 13,
              height: 13,
              borderRadius: 6.5,
              backgroundColor: "#FFF7D6",
              borderWidth: 1.5,
              borderColor: GOLD,
              shadowColor: "#FFF7D6",
              shadowOpacity: 0.9,
              shadowRadius: 5,
            }}
          />
        ))}
      </View>
      {/* cone of light falling on the table */}
      <View style={{ width: 170, height: 46, borderRadius: 23, backgroundColor: "#FFF7D6", opacity: 0.22, marginTop: -56 }} />
    </View>
  );
}

/** Advanced vitals wall (L3): a large gilded display with three live traces. */
function VitalsWall() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const label = (text: string, color: string, left: number, top: number) => (
    <Text style={{ position: "absolute", left, top, fontSize: 8, fontWeight: "800", color }}>{text}</Text>
  );
  return (
    <View style={{ alignItems: "center", marginTop: 10 }}>
      <View
        style={{
          width: 220,
          height: 92,
          borderRadius: 10,
          backgroundColor: "#0F2A30",
          borderWidth: 3,
          borderColor: GOLD,
          overflow: "hidden",
          justifyContent: "center",
        }}
      >
        <Animated.View style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) }}>
          <Svg width={220} height={92} viewBox="0 0 220 92">
            {/* heart trace */}
            <Path d="M6 20 L50 20 L58 8 L66 32 L74 14 L82 20 L214 20" stroke="#4ADE80" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* respiratory wave */}
            <Path d="M6 48 Q30 38 54 48 T102 48 T150 48 T198 48" stroke="#7DD3FC" strokeWidth={2.5} fill="none" strokeLinecap="round" />
            {/* steady line */}
            <Path d="M6 70 L90 70 L214 70" stroke="#FBBF24" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          </Svg>
        </Animated.View>
        {label("HR 72", "#4ADE80", 10, 6)}
        {label("O2 99", "#7DD3FC", 10, 34)}
        {label("BP 120/80", "#FBBF24", 10, 58)}
      </View>
      <View style={{ width: 10, height: 16, backgroundColor: GOLD }} />
      <View style={{ width: 48, height: 6, borderRadius: 3, backgroundColor: GOLD }} />
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Advanced vitals</Text>
    </View>
  );
}

/** Wall cabinet with supplies + a bright window. Richer with level. */
function RoomBackdrop({ level }: { level: number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 10 }}>
      {/* supply cabinet — gilded at the state-of-the-art level */}
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 74, height: 60, borderRadius: 8, backgroundColor: CARD, borderWidth: level >= 3 ? 3 : 2, borderColor: level >= 3 ? GOLD : "#CBD5E1" }}>
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8 }}>
            <View style={{ width: 12, height: 18, borderRadius: 3, backgroundColor: "#BAE6FD", marginHorizontal: 3 }} />
            <View style={{ width: 12, height: 18, borderRadius: 3, backgroundColor: "#FDE68A", marginHorizontal: 3 }} />
            <View style={{ width: 12, height: 18, borderRadius: 3, backgroundColor: "#FBCFE8", marginHorizontal: 3 }} />
            {level >= 2 && (
              <View style={{ width: 12, height: 18, borderRadius: 3, backgroundColor: "#A7F3D0", marginHorizontal: 3 }} />
            )}
          </View>
          <View style={{ height: 2, backgroundColor: "#E2E8F0", marginTop: 8, marginHorizontal: 6 }} />
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 6 }}>
            <View style={{ width: 16, height: 10, borderRadius: 2, backgroundColor: "#E2E8F0", marginHorizontal: 2 }} />
            <View style={{ width: 16, height: 10, borderRadius: 2, backgroundColor: "#E2E8F0", marginHorizontal: 2 }} />
            {level >= 3 && (
              <View style={{ width: 16, height: 10, borderRadius: 2, backgroundColor: "#E2E8F0", marginHorizontal: 2 }} />
            )}
          </View>
        </View>
        <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Supplies</Text>
      </View>
      {/* window with daylight — bigger and brighter at higher levels */}
      <View style={{ alignItems: "center" }}>
        <View style={{
          width: level >= 3 ? 104 : 84,
          height: level >= 3 ? 84 : 70,
          borderRadius: 8,
          backgroundColor: level >= 2 ? "#A8DCF0" : "#BAE6FD",
          borderWidth: 5,
          borderColor: CARD,
          overflow: "hidden",
        }}>
          <Circle cx={level >= 3 ? 76 : 62} cy={18} r={12} fill="#FFF7D6" />
          <View style={{ position: "absolute", left: "48%", top: 0, bottom: 0, width: 3, backgroundColor: CARD }} />
          <View style={{ position: "absolute", top: "48%", left: 0, right: 0, height: 3, backgroundColor: CARD }} />
        </View>
        <View style={{ width: level >= 3 ? 116 : 96, height: 6, borderRadius: 3, backgroundColor: CARD, marginTop: -2, borderWidth: 1, borderColor: "#E2E8F0" }} />
      </View>
      {/* IV stand */}
      <View style={{ alignItems: "center", marginRight: 6 }}>
        <View style={{ width: 4, height: 64, backgroundColor: "#94A3B8" }} />
        <View style={{ width: 30, height: 4, backgroundColor: "#94A3B8", marginTop: -64 }} />
        <View style={{ width: 18, height: 26, borderRadius: 6, backgroundColor: "#E0F2FE", borderWidth: 1.5, borderColor: "#7DD3FC", marginTop: -62, marginLeft: 14 }} />
        <View style={{ width: 44, height: 6, borderRadius: 3, backgroundColor: "#94A3B8", marginTop: 58 }} />
      </View>
    </View>
  );
}

/** Rolling supply cart (L2+) and potted plant (L2+) / wall art (L3). */
function RoomExtras({ level }: { level: number }) {
  if (level < 2) return null;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 24, marginTop: 6 }}>
      {/* rolling cart — gold-trimmed at L3 */}
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 54, height: 44, borderRadius: 6, backgroundColor: CARD, borderWidth: 2, borderColor: level >= 3 ? GOLD : "#94A3B8" }}>
          <View style={{ height: 2, backgroundColor: "#E2E8F0", marginTop: 14, marginHorizontal: 4 }} />
          <View style={{ height: 2, backgroundColor: "#E2E8F0", marginTop: 10, marginHorizontal: 4 }} />
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
            <View style={{ width: 10, height: 8, borderRadius: 2, backgroundColor: "#BAE6FD", marginHorizontal: 2 }} />
            <View style={{ width: 10, height: 8, borderRadius: 2, backgroundColor: "#FDE68A", marginHorizontal: 2 }} />
          </View>
        </View>
        <View style={{ flexDirection: "row", marginTop: 2 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#64748B", marginHorizontal: 8 }} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#64748B", marginHorizontal: 8 }} />
        </View>
        <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Cart</Text>
      </View>
      {/* calming wall art at L3 */}
      {level >= 3 && (
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 70, height: 54, borderRadius: 6, backgroundColor: "#D6EBF5", borderWidth: 4, borderColor: "#0E7C86", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
            <Circle cx={35} cy={18} r={10} fill="#FFF7D6" />
            <Ellipse cx={35} cy={48} rx={28} ry={10} fill="#7FB069" />
          </View>
          <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Healing art</Text>
        </View>
      )}
      {/* potted plants — a lush pair at L3 */}
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#5B8A5E" }} />
        <View style={{ width: 18, height: 20, borderRadius: 12, backgroundColor: "#6FA372", marginTop: -14 }} />
        <View style={{ width: 20, height: 16, borderRadius: 3, backgroundColor: "#B0724A", marginTop: -4 }} />
        <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Plant</Text>
      </View>
      {level >= 3 && (
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#4E7A52" }} />
          <View style={{ width: 22, height: 26, borderRadius: 14, backgroundColor: "#7FB069", marginTop: -16 }} />
          <View style={{ width: 14, height: 10, borderRadius: 5, backgroundColor: "#5B8A5E", marginTop: -8 }} />
          <View style={{ width: 22, height: 18, borderRadius: 3, backgroundColor: "#B0724A", marginTop: -4 }} />
          <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Plant</Text>
        </View>
      )}
    </View>
  );
}

/** Heart monitor with a gently pulsing trace (L3 only). */
function HeartMonitor() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <View style={{ width: 120, height: 64, borderRadius: 10, backgroundColor: "#0F2A30", borderWidth: 3, borderColor: "#64748B", overflow: "hidden", justifyContent: "center" }}>
        <Animated.View style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }}>
          <Svg width={120} height={40} viewBox="0 0 120 40">
            <Path d="M4 20 L34 20 L44 20 L50 8 L56 30 L62 14 L68 20 L116 20" stroke="#4ADE80" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </View>
      <View style={{ width: 10, height: 18, backgroundColor: "#64748B" }} />
      <View style={{ width: 44, height: 6, borderRadius: 3, backgroundColor: "#64748B" }} />
    </View>
  );
}

/** A simple recovery bed (no pawn) for L2/L3. Grand (L3): gold rails + gilded trim. */
function RecoveryBed({ grand = false }: { grand?: boolean }) {
  const trim = grand ? GOLD : "#BAE6FD";
  return (
    <View style={{ alignItems: "center", marginVertical: 6 }}>
      <Svg width={190} height={grand ? 92 : 80} viewBox={`0 0 190 ${grand ? 92 : 80}`}>
        <Rect x={14} y={52} width={162} height={8} rx={4} fill={grand ? GOLD : "#94A3B8"} />
        <Rect x={28} y={60} width={10} height={16} fill="#64748B" />
        <Rect x={152} y={60} width={10} height={16} fill="#64748B" />
        <Rect x={10} y={36} width={170} height={18} rx={8} fill="#D6EBF5" stroke={trim} strokeWidth={grand ? 3 : 2} />
        <Rect x={16} y={38} width={158} height={5} rx={2.5} fill="#FFFFFF" opacity={0.9} />
        <Ellipse cx={40} cy={34} rx={20} ry={8} fill="#FFFFFF" stroke={trim} strokeWidth={grand ? 2 : 1.5} />
        {/* folded blanket */}
        <Rect x={110} y={36} width={60} height={18} rx={6} fill="#A7C4D6" />
        {grand && (
          <>
            {/* gleaming gold side rails */}
            <Rect x={18} y={24} width={64} height={6} rx={3} fill={GOLD} />
            <Rect x={24} y={30} width={6} height={8} fill={GOLD} />
            <Rect x={70} y={30} width={6} height={8} fill={GOLD} />
            <Rect x={108} y={24} width={64} height={6} rx={3} fill={GOLD} />
            <Rect x={114} y={30} width={6} height={8} fill={GOLD} />
            <Rect x={160} y={30} width={6} height={8} fill={GOLD} />
          </>
        )}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Recovery bed</Text>
    </View>
  );
}

export default function HospitalInteriorScreen() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [building, setBuilding] = useState<PlacedBuilding | null>(null);
  const [people, setPeople] = useState<PrayedPerson[]>([]);
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [lastCheckup, setLastCheckup] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [coinsRaw, townRaw] = await Promise.all([
          AsyncStorage.getItem(COINS_STORAGE_KEY),
          AsyncStorage.getItem(TOWN_STORAGE_KEY),
        ]);
        setCoins(parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {}));
        if (townRaw && buildingId) {
          const town = parseTown(JSON.parse(townRaw));
          outer: for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
            const found = town.maps[mapId].buildings.find((b) => b.id === buildingId);
            if (found) { setBuilding(found); break outer; }
          }
        }
        setPeople(await prayedTodayPeople());
        const p = await loadCustomPawn().catch(() => null);
        if (p) setPawn(p);
        setLastCheckup(await loadLastCheckup());
      } catch {}
      setLoaded(true);
    })();
  }, [buildingId]);

  const coinsRef = useRef(coins);
  useEffect(() => { coinsRef.current = coins; }, [coins]);

  const addCoins = useCallback((delta: number) => {
    setCoins((prev) => {
      const next = {
        balance: Math.round((prev.balance + delta) * 100) / 100,
        lifetimeEarned: delta > 0 ? Math.round((prev.lifetimeEarned + delta) * 100) / 100 : prev.lifetimeEarned,
      };
      AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const level = Math.min(Math.max(building?.level || 1, 1), 3);
  const def = building ? BUILDINGS[building.type as keyof typeof BUILDINGS] : null;
  const name = def?.name ?? "Hospital";
  const blessing = hospitalBlessingForLevel(level);
  const remaining = checkupMsRemaining(lastCheckup);
  const nurse = pickPeople(people, `hospital|${buildingId ?? "hosp"}`, 1)[0];

  const levelBlurb = level >= 3
    ? "A full healing center — bright halls, gentle hands."
    : level >= 2
      ? "A growing clinic — clean beds, kind nurses."
      : "A small clinic — simple, clean, welcoming.";

  const handleCheckup = async () => {
    if (remaining > 0) {
      Alert.alert("All clear", `The doctor says you're doing well.\n\nCome back for a checkup in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastCheckup(t);
    await saveLastCheckup(t).catch(() => undefined);
    await saveHospitalBuff({ hpMult: blessing.hpMult, attackMult: blessing.attackMult, grantedAt: new Date(t).toISOString(), level });
    Alert.alert("Doctor's Blessing", `The doctor smiles. "You're in fine shape."\n\n${blessing.label}.`);
  };

  const handleUpgrade = () => {
    if (level >= 3 || !buildingId) return;
    const nextLevel = (level + 1) as 2 | 3;
    const cost = upgradeCostFor(building?.type as any, nextLevel);
    if (coinsRef.current.balance < cost) {
      Alert.alert("Not enough coins", `You need ${cost.toFixed(2)} coins. You have ${coinsRef.current.balance.toFixed(2)}.`);
      return;
    }
    // Construction timers: the time is named before he commits; the
    // hospital then closes under scaffolding and reopens at the new level.
    Alert.alert(
      `Upgrade to level ${nextLevel}?`,
      `${cost.toFixed(2)} coins. ${constructionTimeLabel(nextLevel, false)} — the hospital closes while it builds and reopens at level ${nextLevel}.\n\n${nextLevel >= 3 ? "A full healing center — the blessing grows stronger." : "More beds, brighter halls."}`,
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "Start upgrade",
          onPress: () => {
            addCoins(-cost);
            (async () => {
              try {
                const townRaw = await AsyncStorage.getItem(TOWN_STORAGE_KEY);
                if (!townRaw) return;
                const town = parseTown(JSON.parse(townRaw));
                for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
                  const idx = town.maps[mapId].buildings.findIndex((x) => x.id === buildingId);
                  if (idx >= 0) {
                    town.maps[mapId].buildings[idx] = beginConstruction(town.maps[mapId].buildings[idx], nextLevel, Date.now());
                    break;
                  }
                }
                await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(town));
                setBuilding((prev) => (prev ? beginConstruction(prev, nextLevel, Date.now()) : prev));
                Alert.alert(name, `Upgrade underway! The builders move in — the hospital reopens at level ${nextLevel} in ${nextLevel === 2 ? "30 minutes" : "1 hour"}.`, [{ text: "Back to the map", onPress: () => router.back() }]);
              } catch {}
            })();
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={TEXT} />
        </Pressable>
        <MaterialIcons name="local-hospital" size={26} color={RED} style={{ marginLeft: 4 }} />
        <Text style={{ marginLeft: 8, fontSize: 20, fontWeight: "800", color: TEXT }}>{name}</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: CARD, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#D7E6EA" }}>
          <MaterialIcons name="monetization-on" size={15} color={TEAL} />
          <Text style={{ marginLeft: 5, fontWeight: "700", color: TEXT }}>{coins.balance.toFixed(2)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* blessing banner */}
        <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 16, backgroundColor: CARD, borderWidth: 1, borderColor: "#BFE3E8", padding: 14, flexDirection: "row", alignItems: "center" }}>
          <MaterialIcons name="health-and-safety" size={26} color={TEAL} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: TEXT, fontWeight: "800", fontSize: 15 }}>Doctor's Blessing</Text>
            <Text style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>
              A checkup grants {blessing.label}. {levelBlurb}
            </Text>
          </View>
        </View>

        {/* exam room scene — richer with level: more beds, more equipment */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#D7E6EA", overflow: "hidden", backgroundColor: level >= 3 ? "#F2F9FB" : "#EAF3F6" }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="hospital" />
          {/* gilded crown molding at the state-of-the-art level */}
          {level >= 3 && (
            <View style={{ alignItems: "center", paddingTop: 8 }}>
              <View style={{ width: "92%", height: 8, borderRadius: 4, backgroundColor: GOLD }} />
              <View style={{ flexDirection: "row", marginTop: 2 }}>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD, marginHorizontal: 14, opacity: 0.7 }} />
                ))}
              </View>
            </View>
          )}
          <RoomBackdrop level={level} />
          <RoomExtras level={level} />
          {level >= 3 && <SurgicalLight />}
          <ExamTable pawn={pawn} grand={level >= 3} />
          {/* more beds as the hospital grows — gleaming gold rails at L3 */}
          {level >= 2 && <RecoveryBed grand={level >= 3} />}
          {level >= 3 && <RecoveryBed grand />}
          {level >= 3 && <RecoveryBed grand />}
          {level >= 3 && <HeartMonitor />}
          {level >= 3 && <VitalsWall />}
          {/* staff around the table */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", paddingBottom: 16, marginTop: -6 }}>
            <DoctorFigure delay={200} />
            {nurse && <NurseFigure person={nurse} delay={500} />}
            {!nurse && !pawn && (
              <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic" }}>The exam room is quiet.</Text>
            )}
          </View>
          {/* polished floor — mirror shine + gold border at L3 */}
          <View style={{ height: level >= 3 ? 32 : 26, backgroundColor: "#DCE9ED", overflow: "hidden" }}>
            <View style={{ height: level >= 3 ? 4 : 3, backgroundColor: level >= 3 ? GOLD : "#C4D8DE" }} />
            {level >= 3 && (
              <View
                style={{
                  position: "absolute",
                  left: 50,
                  top: 6,
                  width: 110,
                  height: 24,
                  backgroundColor: "#FFFFFF",
                  opacity: 0.55,
                  transform: [{ rotate: "16deg" }],
                  borderRadius: 6,
                }}
              />
            )}
            {level >= 3 && (
              <View
                style={{
                  position: "absolute",
                  right: 60,
                  top: 8,
                  width: 70,
                  height: 18,
                  backgroundColor: "#FFFFFF",
                  opacity: 0.4,
                  transform: [{ rotate: "16deg" }],
                  borderRadius: 6,
                }}
              />
            )}
          </View>
        </View>

        {/* actions */}
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 16 }}>
          <Pressable onPress={handleCheckup} style={{ flex: 1, backgroundColor: TEAL, borderRadius: 14, paddingVertical: 13, alignItems: "center", marginRight: 8 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>
              {remaining > 0 ? `Next checkup in ${formatCooldown(remaining)}` : "Get Checkup"}
            </Text>
          </Pressable>
          {level < 3 && (
            <Pressable onPress={handleUpgrade} style={{ backgroundColor: CARD, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, alignItems: "center", borderWidth: 1, borderColor: TEAL }}>
              <Text style={{ color: TEAL, fontWeight: "800", fontSize: 14 }}>Upgrade</Text>
            </Pressable>
          )}
        </View>
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          The blessing is consumed when your next Dark Forest battle begins.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Preparing the exam room…</Text>}
      </ScrollView>
    </View>
  );
}
