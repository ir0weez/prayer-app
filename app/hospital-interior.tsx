// Hospital interior: a bright, clean exam room. The pawn lies on the exam
// table getting a checkup; the doctor stands by, a nurse villager assists.
// "Get Checkup" grants the Doctor's Blessing (Dark Forest buff) on a daily
// cooldown. No emojis — SVG art and MaterialIcons only.

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Rect } from "react-native-svg";
import {
  BUILDINGS,
  COINS_STORAGE_KEY,
  TOWN_STORAGE_KEY,
  hospitalBlessingForLevel,
  parseCoins,
  parseTown,
  prayedTodayPeople,
  saveHospitalBuff,
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

const BG = "#F2F7FA"; // clean clinical light
const CARD = "#FFFFFF";
const TEAL = "#0E7C86";
const TEAL_DARK = "#0A5A62";
const TEXT = "#1E3A40";
const TEXT_DIM = "#6B8A90";
const RED = "#EF4444";

/** Exam table with the pawn lying on it. */
function ExamTable({ pawn }: { pawn: CustomPawn | null }) {
  return (
    <View style={{ alignItems: "center", marginVertical: 8 }}>
      <View style={{ width: 230, alignItems: "center" }}>
        {/* paper roll headrest */}
        <Svg width={230} height={120} viewBox="0 0 230 120">
          {/* table base */}
          <Rect x={20} y={86} width={190} height={10} rx={4} fill="#94A3B8" />
          <Rect x={40} y={96} width={12} height={20} fill="#64748B" />
          <Rect x={178} y={96} width={12} height={20} fill="#64748B" />
          {/* mattress */}
          <Rect x={16} y={64} width={198} height={24} rx={10} fill="#E0F2FE" stroke="#BAE6FD" strokeWidth={2} />
          {/* paper sheet */}
          <Rect x={24} y={66} width={182} height={6} rx={3} fill="#FFFFFF" opacity={0.9} />
          {/* pillow */}
          <Ellipse cx={52} cy={62} rx={24} ry={10} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1.5} />
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

/** Wall cabinet with supplies + a bright window. */
function RoomBackdrop() {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 10 }}>
      {/* supply cabinet */}
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 74, height: 60, borderRadius: 8, backgroundColor: CARD, borderWidth: 2, borderColor: "#CBD5E1" }}>
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8 }}>
            <View style={{ width: 12, height: 18, borderRadius: 3, backgroundColor: "#BAE6FD", marginHorizontal: 3 }} />
            <View style={{ width: 12, height: 18, borderRadius: 3, backgroundColor: "#FDE68A", marginHorizontal: 3 }} />
            <View style={{ width: 12, height: 18, borderRadius: 3, backgroundColor: "#FBCFE8", marginHorizontal: 3 }} />
          </View>
          <View style={{ height: 2, backgroundColor: "#E2E8F0", marginTop: 8, marginHorizontal: 6 }} />
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 6 }}>
            <View style={{ width: 16, height: 10, borderRadius: 2, backgroundColor: "#E2E8F0", marginHorizontal: 2 }} />
            <View style={{ width: 16, height: 10, borderRadius: 2, backgroundColor: "#E2E8F0", marginHorizontal: 2 }} />
          </View>
        </View>
        <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Supplies</Text>
      </View>
      {/* window with daylight */}
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 84, height: 70, borderRadius: 8, backgroundColor: "#BAE6FD", borderWidth: 5, borderColor: CARD, overflow: "hidden" }}>
          <Circle cx={62} cy={18} r={12} fill="#FFF7D6" />
          <View style={{ position: "absolute", left: "48%", top: 0, bottom: 0, width: 3, backgroundColor: CARD }} />
          <View style={{ position: "absolute", top: "48%", left: 0, right: 0, height: 3, backgroundColor: CARD }} />
        </View>
        <View style={{ width: 96, height: 6, borderRadius: 3, backgroundColor: CARD, marginTop: -2, borderWidth: 1, borderColor: "#E2E8F0" }} />
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
    const cost = upgradeCostFor(building?.type as any, (level + 1) as 2 | 3);
    if (coinsRef.current.balance < cost) {
      Alert.alert("Not enough coins", `You need ${cost.toFixed(2)} coins. You have ${coinsRef.current.balance.toFixed(2)}.`);
      return;
    }
    addCoins(-cost);
    (async () => {
      try {
        const townRaw = await AsyncStorage.getItem(TOWN_STORAGE_KEY);
        if (!townRaw) return;
        const town = parseTown(JSON.parse(townRaw));
        for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
          const b = town.maps[mapId].buildings.find((x) => x.id === buildingId);
          if (b) { b.level = (level + 1) as 2 | 3; break; }
        }
        await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(town));
        setBuilding((prev) => (prev ? { ...prev, level: (level + 1) as 2 | 3 } : prev));
        Alert.alert(name, `Upgraded to level ${level + 1}! ${level + 1 >= 3 ? "A full healing center — the blessing grows stronger." : "More beds, brighter halls."}`);
      } catch {}
    })();
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

        {/* exam room scene */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#D7E6EA", overflow: "hidden", backgroundColor: "#EAF3F6" }}>
          <RoomBackdrop />
          <ExamTable pawn={pawn} />
          {/* staff around the table */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", paddingBottom: 16, marginTop: -6 }}>
            <DoctorFigure delay={200} />
            {nurse && <NurseFigure person={nurse} delay={500} />}
            {!nurse && !pawn && (
              <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic" }}>The exam room is quiet.</Text>
            )}
          </View>
          {/* floor */}
          <View style={{ height: 26, backgroundColor: "#DCE9ED" }}>
            <View style={{ height: 3, backgroundColor: "#C4D8DE" }} />
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
