// Farm interior: Sunny Acres. A red barn, crop rows, a fence, and the sun —
// richer at every level (bigger barn, more rows, windmill, silo, tractor).
// Villagers work the fields; "Help Harvest" grants coins + XP on a 1-hour
// cooldown. No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { awardCustomXP } from "@/lib/xp-engine";
import { scaledCoins, scaledXP,
  formatCoins,
} from "@/lib/hometown";
import { formatCooldown } from "@/lib/gathering-places";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import { HarvestGame } from "@/components/harvest-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";

const BG = "#EAF6FB";
const TEXT_DIM = "#7A6A52";
const GREEN = "#5B8A5E";
const HARVEST_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const HARVEST_KEY = "prayercircle.interior.farm.harvest.v1";
const HARVEST_COINS: Record<number, number> = { 1: 50, 2: 100, 3: 200 };
const HARVEST_XP: Record<number, number> = { 1: 4, 2: 8, 3: 12 };


















export default function FarmInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const harvest = useMiniGameHost("harvest", addCoins);
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastHarvest, setLastHarvest] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(HARVEST_KEY)
      .then((raw) => setLastHarvest(raw ? parseInt(raw, 10) || 0 : 0))
      .catch(() => undefined);
  }, []);

  const remaining = Math.max(0, lastHarvest + HARVEST_COOLDOWN_MS - Date.now());
  const workers = pickPeople(people, `farm|${building?.id ?? "farm"}`, 4);
  const cast = workers.map((person) => ({ person, pose: "work" as const }));

  const levelBlurb =
    level >= 3
      ? "A grand estate farm — market stalls under the sun, full fields, and room for every hand."
      : level >= 2
        ? "A thriving farm — more stalls, fuller fields, and hands at work."
        : "A humble homestead — two stalls and quiet fields.";

  const handleHarvest = async () => {
    if (remaining > 0) {
      Alert.alert("Crops are growing", `The next harvest will be ready in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastHarvest(t);
    await AsyncStorage.setItem(HARVEST_KEY, String(t)).catch(() => undefined);
    const c = scaledCoins(HARVEST_COINS[level] ?? 5);
    const xp = scaledXP(HARVEST_XP[level] ?? 4);
    addCoins(c);
    awardCustomXP(xp, `farm-harvest-${t}`).catch(() => undefined);
    Alert.alert("Harvest gathered", `You lend a hand and bring in the harvest.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="farm" />
      <InteriorHeader icon="agriculture" iconColor={GREEN} title={buildingName} coins={coins} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner icon="eco" iconColor={GREEN} title={buildingName} blurb={levelBlurb} accent="#C9A86A" />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["farm"]} level={level} cast={cast} pawn={pawn} pawnPose="work" width={sceneWidth} />
          {workers.length === 0 && !pawn && (
            <Text style={{ color: "#2F5A2E", fontSize: 12, fontStyle: "italic" }}>The fields are quiet today.</Text>
          )}
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Help Harvest"}
          onPrimary={handleHarvest}
          primaryColor={GREEN}
          level={level}
          onUpgrade={() =>
            handleUpgrade(level >= 2 ? "Fuller stalls, richer fields, and room for every hand." : "More stalls and fuller fields.")
          }
        />
        <PlayCard
          icon="agriculture"
          title="Play: Harvest Rows"
          blurb="Rows ripen one by one — gather them in their golden moment."
          playsLeft={harvest.playsLeft}
          cap={harvest.cap}
          accent={GREEN}
          onPlay={() => harvest.setPlaying(true)}
        />
        {harvest.playing && <HarvestGame accent={GREEN} onComplete={harvest.handleComplete} onExit={() => harvest.setPlaying(false)} />}
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Lend a hand in the fields once an hour for fresh coins and XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Walking out to the farm…</Text>}
      </ScrollView>
    </View>
  );
}
