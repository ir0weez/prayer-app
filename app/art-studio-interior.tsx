// Art Studio interior (School Campus): easels under bright windows that
// multiply with level — L1 two easels, L2 three and a supply shelf, L3 four
// easels, a gallery wall, and a sculpture on a pedestal. "Open Studio Hour"
// grants coins + XP on a 1-hour cooldown. While the Art Studio stands,
// collections completion payouts grow +25% (lib/school-perks.ts).
// No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { scaledCoins, scaledXP,
  formatCoins,
} from "@/lib/hometown";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";


const BG = "#FDF4F5";
const WOOD = "#8B5E34";
const WOOD_DARK = "#5E3D22";
const ACCENT = "#BE3455";
const ACCENT_DARK = "#9F1239";
const TEXT_DIM = "#A8878F";

const STUDIO_KEY = "prayercircle.interior.artstudio.openhour.v1";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const ACTION_COINS: Record<1 | 2 | 3, number> = { 1: 12, 2: 22, 3: 38 };
const ACTION_XP: Record<1 | 2 | 3, number> = { 1: 10, 2: 18, 3: 30 };

export default function ArtStudioInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastAction, setLastAction] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STUDIO_KEY);
        setLastAction(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, lastAction + COOLDOWN_MS - Date.now());
  const actionCoins = scaledCoins(ACTION_COINS[level]);
  const actionXp = scaledXP(ACTION_XP[level]);
  const easelCount = level >= 3 ? 4 : level >= 2 ? 3 : 2;
  const artists = pickPeople(people, `artstudio|${building?.id ?? "art"}|artists`, easelCount);

  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const levelBlurb =
    level >= 3
      ? "A real studio — easels in a bright row, and color everywhere."
      : level >= 2
        ? "A third easel joins the row — the studio is filling with color."
        : "Two easels under the windows, and everything smelling faintly of paint.";

  const handleAction = async () => {
    if (remaining > 0) {
      Alert.alert("Paint Drying", `The studio is mid-piece.\n\nOpen the next studio hour in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastAction(t);
    await AsyncStorage.setItem(STUDIO_KEY, String(t)).catch(() => undefined);
    addCoins(actionCoins);
    await awardCustomXP(actionXp, `artstudio-openhour-${t}`).catch(() => undefined);
    Alert.alert("Studio Hour", `Brushes out, sleeves up — an hour of making things that didn't exist this morning.\n\n+${formatCoins(actionCoins)} coins, +${actionXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="palette" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="palette"
          iconColor={ACCENT}
          title="The Studio"
          blurb={`Open studio hour — worth +${formatCoins(actionCoins)} coins, +${actionXp} XP. ${levelBlurb}`}
          accent="#FBCFE8"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["art-studio"]} level={level} cast={artists.map((person) => ({ person, pose: "work" as const }))} pawn={pawn} pawnPose="work" width={sceneWidth} />
        </View>

                <InteriorActions
          primaryLabel={remaining > 0 ? `Studio hour in ${formatCooldown(remaining)}` : "Open Studio Hour"}
          onPrimary={handleAction}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "A gallery wall, a fourth easel, and a sculpture pedestal." : "A third easel and a shelf of paints.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          While the Art Studio stands, collections completion payouts grow +25%.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the paint jars…</Text>}
      </ScrollView>
    </View>
  );
}
