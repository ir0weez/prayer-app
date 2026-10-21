// Shop interior: a cozy general store. Villagers browse wooden shelves,
// one villager waits at the counter, and the pawn helps stock.
// "Help Stock Shelves" grants coins + XP on a 1-hour cooldown.
// L1: sparse shelves, plain counter. L2: full shelves, rug, hanging lamp.
// L3: packed shelves, glass display case, chandelier, polished floor.
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

const BG = "#F7F1E3";
const TEXT_DIM = "#8A715A";
const ACCENT = "#B45309";

const STOCK_COINS: Record<number, number> = { 1: 40, 2: 80, 3: 140 };
const STOCK_XP: Record<number, number> = { 1: 3, 2: 6, 3: 10 };
const COOLDOWN_MS = 60 * 60 * 1000;
const STOCK_KEY = "prayercircle.interior.shop.stock.v1";











export default function ShopInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastStock, setLastStock] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STOCK_KEY).catch(() => null);
      setLastStock(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastStock + COOLDOWN_MS - Date.now());
  const browsing = pickPeople(people, `shop|${building?.id ?? "shop"}|browse`, 3);
  const atCounter = pickPeople(people, `shop|${building?.id ?? "shop"}|counter`, 1)[0];
  const cast = [
    ...browsing.map((person) => ({ person, pose: "stand" as const })),
    ...(atCounter ? [{ person: atCounter, pose: "work" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "An elegant boutique — brimming shelves, a long counter, and warm pendant light."
      : level >= 2
        ? "A friendly neighborhood shop — full shelves and a warm lamp."
        : "A humble little shop — shelves are sparse but the door is open.";

  const handleStock = async () => {
    if (remaining > 0) {
      Alert.alert("Shelves are full", `The villagers are restocking.\n\nCome back in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(STOCK_COINS[level] ?? 4);
    const xp = scaledXP(STOCK_XP[level] ?? 3);
    const t = Date.now();
    setLastStock(t);
    await AsyncStorage.setItem(STOCK_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `shop-stock-${t}`).catch(() => undefined);
    Alert.alert("Shelves Stocked", `You line the shelves with goods. The villagers smile.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="storefront" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="inventory"
          iconColor={ACCENT}
          title="General Store"
          blurb={`Villagers browse the aisles for daily needs. ${levelBlurb}`}
          accent="#EAD9BE"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["shop"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Help Stock Shelves"}
          onPrimary={handleStock}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Brimming shelves and a long, well-stocked counter." : "Fuller shelves, a warm lamp, and a shop rug."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Stock the shelves once an hour. Rarer goods appear as the store grows.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the shop…</Text>}
      </ScrollView>
    </View>
  );
}
