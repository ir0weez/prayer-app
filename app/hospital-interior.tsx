// Hospital interior: a bright, clean exam room. The pawn lies on the exam
// table getting a checkup; the doctor stands by, a nurse villager assists.
// "Get Checkup" grants the Doctor's Blessing (Dark Forest buff) on a daily
// cooldown. No emojis — SVG art and MaterialIcons only.

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  BUILDINGS,
  COINS_STORAGE_KEY,
  TOWN_STORAGE_KEY,
  hospitalBlessingForLevel,
  parseCoins,
  applyCoinsDelta,
  parseTown,
  prayedTodayPeople,
  saveHospitalBuff,
  beginConstruction,
  constructionTimeLabel,
  upgradeCostFor,
  type HometownCoins,
  type PlacedBuilding,
  type PrayedPerson,
  formatCoins,
} from "@/lib/hometown";
import {
  checkupMsRemaining,
  formatCooldown,
  loadLastCheckup,
  saveLastCheckup,
} from "@/lib/gathering-places";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { loadHouseState } from "@/lib/pawn-house";
import { boonFor, combineBoons, loadHeroNeeds, poolBoonFor } from "@/lib/hero-needs";
import {
  HOSPITAL_HEALS_PER_DAY,
  hospitalHeal,
  loadHeroHealthRaw,
  restPctForBedTier,
  saveHeroHealth,
  settleHealth,
  type HeroHealthState,
} from "@/lib/hero-health";
import { combatStats, loadEquipped, refreshGearBoostCache } from "@/lib/gear";
import { refreshBadgeCache } from "@/lib/badges";
import { refreshStatBoostCache } from "@/lib/character-stats";
import { pickPeople } from "@/components/activity-figures";
import { PaperHospitalScene } from "@/components/paper-room";
import { RoundsGame } from "@/components/rounds-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

const BG = "#F2F7FA"; // clean clinical light
const CARD = "#FFFFFF";
const TEAL = "#0E7C86";
const TEXT = "#1E3A40";
const TEXT_DIM = "#6B8A90";
const RED = "#EF4444";

export default function HospitalInteriorScreen() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [building, setBuilding] = useState<PlacedBuilding | null>(null);
  const [people, setPeople] = useState<PrayedPerson[]>([]);
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [lastCheckup, setLastCheckup] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // Hero care (lib/hero-health): the hero's persistent Dark Forest HP.
  const [heroHealth, setHeroHealth] = useState<HeroHealthState | null>(null);
  const [effMax, setEffMax] = useState(0);

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
        // Hero care: effective max HP exactly as the Dark Forest sees
        // it — gear caches refreshed first (combatStats reads them),
        // then the Morning Care boon from needs + house.
        try {
          try { await refreshGearBoostCache(); } catch {}
          try { await refreshBadgeCache(); } catch {}
          try { await refreshStatBoostCache(); } catch {}
          const [house, needs, equipped] = await Promise.all([
            loadHouseState(),
            loadHeroNeeds(),
            loadEquipped(),
          ]);
          // Morning boon + the still pool's blessing stack (v170),
          // so this max is the same one the Dark Forest fights with.
          const boon = combineBoons(boonFor(needs, house), poolBoonFor(needs));
          const base = combatStats(equipped);
          const max = boon.active ? Math.round(base.maxHp * (1 + boon.hpPct)) : base.maxHp;
          setEffMax(max);
          const bedTier = house.rooms.bedroom?.furniture["bed"] || 0;
          const raw = await loadHeroHealthRaw();
          const rawState: HeroHealthState =
            raw ?? { hp: null, updatedAt: Date.now(), day: "", hospitalHealsUsed: 0 };
          const { state: settled, changed } = settleHealth(
            rawState,
            Date.now(),
            max,
            restPctForBedTier(bedTier)
          );
          setHeroHealth(settled);
          if (changed) await saveHeroHealth(settled).catch(() => undefined);
        } catch {}
      } catch {}
      setLoaded(true);
    })();
  }, [buildingId]);

  const coinsRef = useRef(coins);
  useEffect(() => { coinsRef.current = coins; }, [coins]);

  // Canonical ledger (v167): delta applied to the freshest stored
  // record via lib applyCoinsDelta — never this screen's snapshot.
  const addCoins = useCallback((delta: number) => {
    void applyCoinsDelta(delta, "cent").then((next) => setCoins(next));
  }, []);

  const rounds = useMiniGameHost("rounds", addCoins);
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);

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

  const healsLeft = heroHealth
    ? Math.max(0, HOSPITAL_HEALS_PER_DAY - heroHealth.hospitalHealsUsed)
    : HOSPITAL_HEALS_PER_DAY;
  const heroHp = heroHealth ? heroHealth.hp ?? effMax : effMax;
  const heroFull = effMax > 0 && heroHp >= effMax;

  const handleReceiveHealing = async () => {
    if (!heroHealth || effMax <= 0) return;
    const { state: next, ok } = hospitalHeal(heroHealth, effMax, Date.now());
    setHeroHealth(next);
    if (ok) await saveHeroHealth(next).catch(() => undefined);
  };

  const handleUpgrade = () => {
    if (level >= 3 || !buildingId) return;
    const nextLevel = (level + 1) as 2 | 3;
    const cost = upgradeCostFor(building?.type as any, nextLevel);
    if (coinsRef.current.balance < cost) {
      Alert.alert("Not enough coins", `You need ${formatCoins(cost)} coins. You have ${formatCoins(coinsRef.current.balance)}.`);
      return;
    }
    // Construction timers: the time is named before he commits; the
    // hospital then closes under scaffolding and reopens at the new level.
    Alert.alert(
      `Upgrade to level ${nextLevel}?`,
      `${formatCoins(cost)} coins. ${constructionTimeLabel(nextLevel, false)} — the hospital closes while it builds and reopens at level ${nextLevel}.\n\n${nextLevel >= 3 ? "A full healing center — the blessing grows stronger." : "More beds, brighter halls."}`,
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
          <Text style={{ marginLeft: 5, fontWeight: "700", color: TEXT }}>{formatCoins(coins.balance)}</Text>
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

        <View style={{ marginHorizontal: 16 }}>
          <PaperHospitalScene
            level={level}
            cast={nurse ? [{ person: nurse, pose: "stand" as const }] : []}
            pawn={pawn}
            width={sceneWidth}
          />
        </View>
        {!nurse && !pawn && (
          <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: 8 }}>
            The exam room is quiet.
          </Text>
        )}

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

        {/* hero care: persistent Dark Forest HP, healed free */}
        {heroHealth && effMax > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 16, backgroundColor: CARD, borderWidth: 1, borderColor: "#BFE3E8", padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialIcons name="favorite" size={24} color={RED} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: TEXT, fontWeight: "800", fontSize: 15 }}>Hero Care</Text>
                <Text style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>
                  HP {heroHp}/{effMax} · {HOSPITAL_HEALS_PER_DAY} free healings a day — always free. {healsLeft} left today.
                </Text>
              </View>
            </View>
            {heroFull ? (
              <Text style={{ color: TEAL, fontWeight: "700", fontSize: 13, marginTop: 10 }}>
                You're at full strength.
              </Text>
            ) : healsLeft > 0 ? (
              <Pressable
                onPress={handleReceiveHealing}
                style={{ backgroundColor: TEAL, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 12 }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>Receive healing</Text>
              </Pressable>
            ) : (
              <Text style={{ color: TEXT_DIM, fontSize: 12.5, marginTop: 10, lineHeight: 18 }}>
                Both healings used — rest and time still mend, and tomorrow brings two more.
              </Text>
            )}
          </View>
        )}

        <PlayCard
          icon="healing"
          title="Play: Gentle Rounds"
          blurb="Water, medicine, a blanket, a prayer — bring each patient what they're asking for."
          playsLeft={rounds.playsLeft}
          cap={rounds.cap}
          accent={TEAL}
          onPlay={() => rounds.setPlaying(true)}
        />
        {rounds.playing && <RoundsGame accent={TEAL} onComplete={rounds.handleComplete} onExit={() => rounds.setPlaying(false)} />}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Preparing the exam room…</Text>}
      </ScrollView>
    </View>
  );
}
