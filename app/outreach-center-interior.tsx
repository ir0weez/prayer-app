// Outreach Center interior: a food pantry and serving counter for the
// neighborhood. Shelves of cans and boxes, donation boxes by the door,
// and a counter where villagers serve whoever walks in. Outreach and
// food-drive schedule events gather here (the church hosts until the
// center is built). "Serve & Pack" grants coins + XP on a 1-hour
// cooldown.
// L1: one pantry shelf, a donation box, the counter.
// L2: a second shelf, stacked crates, more hands serving.
// L3: a full pantry wall and a serving line with trays.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP,
  formatCoins,
} from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { PackingGame } from "@/components/packing-game";
import { PlayCard, type MiniGameReward } from "@/components/mini-game-scene";
import { MINI_GAME_CAPS, playsLeftToday, recordPlay, scaleMiniGamePayout } from "@/lib/mini-games";

const BG = "#FBF4E8";
const TEXT_DIM = "#A08B62";
const ACCENT = "#2E7D74";

const SERVE_COINS: Record<number, number> = { 1: 30, 2: 60, 3: 120 };
const SERVE_XP: Record<number, number> = { 1: 8, 2: 16, 3: 28 };
const COOLDOWN_MS = 60 * 60 * 1000;
const SERVE_KEY = "prayercircle.interior.outreach.serve.v1";

export default function OutreachCenterInteriorScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastServe, setLastServe] = useState(0);
  const [packingPlaysLeft, setPackingPlaysLeft] = useState<number | null>(null);
  const [playingPacking, setPlayingPacking] = useState(false);

  useEffect(() => {
    playsLeftToday("packing").then(setPackingPlaysLeft).catch(() => setPackingPlaysLeft(0));
  }, []);

  const handlePackingComplete = (raw: MiniGameReward): MiniGameReward => {
    const _pay = scaleMiniGamePayout(scaledCoins(raw.coins), scaledXP(raw.xp));
    const c = _pay.coins;
    const xp = _pay.xp;
    if (c > 0) addCoins(c);
    if (xp > 0) awardCustomXP(xp, `minigame-packing-${Date.now()}`).catch(() => undefined);
    recordPlay("packing").then(setPackingPlaysLeft).catch(() => undefined);
    return { coins: c, xp };
  };

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(SERVE_KEY).catch(() => null);
      setLastServe(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastServe + COOLDOWN_MS - Date.now());
  const helpers = pickPeople(people, `outreach|${building?.id ?? "center"}|help`, level >= 3 ? 4 : 3);

  const levelBlurb =
    level >= 3
      ? "A full pantry wall, and room for everyone who comes."
      : level >= 2
        ? "A growing pantry — two stocked shelves, crates of supplies, and more hands to serve."
        : "A small pantry — one shelf, a donation box, and a counter that stays open.";

  const handleServe = async () => {
    if (remaining > 0) {
      Alert.alert("The line has thinned", `The shelves need restocking.\n\nServe again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(SERVE_COINS[level] ?? 30);
    const xp = scaledXP(SERVE_XP[level] ?? 8);
    const t = Date.now();
    setLastServe(t);
    await AsyncStorage.setItem(SERVE_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `outreach-serve-${t}`).catch(() => undefined);
    Alert.alert("Served with a smile", `You pack boxes, fill trays, and learn a few names. Nobody leaves here hungry — or unnoticed.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="volunteer-activism" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="food-bank"
          iconColor={ACCENT}
          title="Outreach Center"
          blurb={`Pantry shelves, donation boxes, and a counter for the neighborhood. ${levelBlurb}`}
          accent="#D8EAE6"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene
            config={PAPER_ROOMS["outreach-center"]}
            level={level}
            cast={helpers.map((person) => ({ person, pose: "work" as const }))}
            pawn={pawn}
            pawnPose="work"
            width={sceneWidth}
          />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Serve & Pack"}
          onPrimary={handleServe}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A full pantry wall and a serving line with trays." : "A second pantry shelf and stacked crates of supplies."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Serve once an hour. The counter stays open to everyone.
        </Text>

        <PlayCard
          icon="inventory"
          title="Play: Pack the Boxes"
          blurb="The pantry rush is on — sort each item into its box before the clock runs out. Forty-five seconds."
          playsLeft={packingPlaysLeft}
          cap={MINI_GAME_CAPS.packing}
          accent={ACCENT}
          onPlay={() => setPlayingPacking(true)}
        />
        {playingPacking && (
          <PackingGame accent={ACCENT} onComplete={handlePackingComplete} onExit={() => setPlayingPacking(false)} />
        )}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Stocking the shelves…</Text>}
      </ScrollView>
    </View>
  );
}
