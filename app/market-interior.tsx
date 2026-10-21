// Market interior: an open-air market plaza with striped stalls and fresh
// produce. Serves both "market" and "city-market" — the City Market Hall gets
// a grander stone entrance arch. L1: two stalls. L2: four stalls and a
// fountain. L3: six stalls, fountain, bunting banners, and string lights.
// Villagers shop the stalls; "Browse the Stalls" grants coins + XP on a
// 1-hour cooldown. No emojis — SVG art and MaterialIcons only.

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
import { ShelfGame } from "@/components/shelf-game";
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

const BG = "#FBF7EF";
const BRONZE = "#B45309";
const TEXT_DIM = "#8A7A5F";
const BROWSE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const BROWSE_KEY = "prayercircle.interior.market.browse.v1";
const BROWSE_COINS: Record<number, number> = { 1: 40, 2: 80, 3: 150 };
const BROWSE_XP: Record<number, number> = { 1: 3, 2: 6, 3: 10 };










export default function MarketInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const shelf = useMiniGameHost("shelf", addCoins);
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastBrowse, setLastBrowse] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(BROWSE_KEY)
      .then((raw) => setLastBrowse(raw ? parseInt(raw, 10) || 0 : 0))
      .catch(() => undefined);
  }, []);

  const remaining = Math.max(0, lastBrowse + BROWSE_COOLDOWN_MS - Date.now());
  const shoppers = pickPeople(people, `market|${building?.id ?? "market"}`, 5);
  const cast = shoppers.map((person) => ({ person, pose: "stand" as const }));

  const levelBlurb =
    level >= 3
      ? "A grand bazaar — eight stalls with lanterns, banners, and lights."
      : level >= 2
        ? "A lively market — four stalls gathered around the plaza."
        : "A humble market — two stalls under the morning sun.";

  const handleBrowse = async () => {
    if (remaining > 0) {
      Alert.alert("Stalls are restocking", `New deals will arrive in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastBrowse(t);
    await AsyncStorage.setItem(BROWSE_KEY, String(t)).catch(() => undefined);
    const c = scaledCoins(BROWSE_COINS[level] ?? 4);
    const xp = scaledXP(BROWSE_XP[level] ?? 3);
    addCoins(c);
    awardCustomXP(xp, `market-browse-${t}`).catch(() => undefined);
    Alert.alert("A good browse", `You wander the stalls and find a few treasures.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="market" />
      <InteriorHeader icon="storefront" iconColor={BRONZE} title={buildingName} coins={coins} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner icon="shopping-basket" iconColor={BRONZE} title={buildingName} blurb={levelBlurb} accent="#D9C4A5" />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["market"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} />
          {shoppers.length === 0 && !pawn && (
            <Text style={{ color: "#6B4A2B", fontSize: 12, fontStyle: "italic" }}>The plaza is quiet today.</Text>
          )}
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Browse the Stalls"}
          onPrimary={handleBrowse}
          primaryColor={BRONZE}
          level={level}
          onUpgrade={() =>
            handleUpgrade(level >= 2 ? "Eight stalls, lanterns, banners, and lights." : "Four stalls around the plaza.")
          }
        />
        <PlayCard
          icon="storefront"
          title="Play: Shelf It Right"
          blurb="Groceries arrive one by one — every one has a shelf it belongs on."
          playsLeft={shelf.playsLeft}
          cap={shelf.cap}
          accent={BRONZE}
          onPlay={() => shelf.setPlaying(true)}
        />
        {shelf.playing && <ShelfGame accent={BRONZE} onComplete={shelf.handleComplete} onExit={() => shelf.setPlaying(false)} />}
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Browse the stalls once an hour for fresh coins and XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the market…</Text>}
      </ScrollView>
    </View>
  );
}
