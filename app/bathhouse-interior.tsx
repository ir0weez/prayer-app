// Bathhouse interior: steam and warm pools for the weary. Villagers soak
// in tiled pools, rest on stone benches, and breathe the warm mist. The
// pawn rests in the waters too.
// "Rest in the Waters" grants a few coins + XP on a 1-hour cooldown.
// L1: one pool, bench. L2: two pools, columns, ferns.
// L3: grand bathhouse — three pools, waterfall, mosaics, skylight.
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
import { PaperRoomScene, type PaperCastEntry } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP,
  formatCoins,
} from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";

const BG = "#EDF6FA";
const TILE = "#7DD3FC";
const TILE_DARK = "#0369A1";
const TEXT_DIM = "#7FA3B8";
const ACCENT = "#0284C7";

const REST_COINS: Record<number, number> = { 1: 30, 2: 60, 3: 120 };
const REST_XP: Record<number, number> = { 1: 4, 2: 8, 3: 16 };
const COOLDOWN_MS = 60 * 60 * 1000;
const REST_KEY = "prayercircle.interior.bathhouse.rest.v1";

export default function BathhouseInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastRest, setLastRest] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(REST_KEY).catch(() => null);
      setLastRest(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastRest + COOLDOWN_MS - Date.now());
  const soaking = pickPeople(people, `bathhouse|${building?.id ?? "bathhouse"}|soak`, 3);
  const resting = pickPeople(people, `bathhouse|${building?.id ?? "bathhouse"}|bench`, 1)[0];

  const cast: PaperCastEntry[] = [
    ...soaking.map((person) => ({ person, pose: "swim" as const })),
    ...(resting ? [{ person: resting, pose: "seated" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand bathhouse — three mosaic pools and steam in the lantern light."
      : level >= 2
        ? "A fine bathhouse — two warm pools and potted ferns."
        : "A humble bathhouse — one warm pool, a stone bench, and rising steam.";

  const handleRest = async () => {
    if (remaining > 0) {
      Alert.alert("The waters settle", `You are already refreshed.\n\nRest again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(REST_COINS[level] ?? 3);
    const xp = scaledXP(REST_XP[level] ?? 4);
    const t = Date.now();
    setLastRest(t);
    await AsyncStorage.setItem(REST_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `bathhouse-rest-${t}`).catch(() => undefined);
    Alert.alert("Refreshed", `You sink into the warm water and let the weariness go.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="waves" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="spa"
          iconColor={ACCENT}
          title="Bathhouse"
          blurb={`Steam and warm pools for the weary. ${levelBlurb}`}
          accent="#CDEBF7"
        />

        {/* bathhouse scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["bathhouse"]} level={level} cast={cast} pawn={pawn} pawnPose="swim" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Rest in the Waters"}
          onPrimary={handleRest}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Three mosaic pools, a waterfall, and steam rising to a skylight." : "A second pool, stone columns, and potted ferns."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Rest in the waters once an hour. Come out new.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Heating the pools…</Text>}
      </ScrollView>
    </View>
  );
}
