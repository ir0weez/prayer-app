// Science Lab interior (School Campus): benches and glass that grow with
// level — L1 one bench with flasks, L2 a jar shelf and a microscope, L3 a
// greenhouse window full of growing things. "Run an Experiment" grants
// coins + XP on a 1-hour cooldown. While the Science Lab stands, Garden
// Tending records an extra flower per completed session (lib/school-perks.ts).
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
import { PaperRoomScene } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";

const BG = "#EFFAF6";
const WOOD = "#8B5E34";
const ACCENT = "#0F766E";
const ACCENT_DARK = "#115E59";
const TEXT_DIM = "#6B8F88";

const EXPERIMENT_KEY = "prayercircle.interior.sciencelab.experiment.v1";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const ACTION_COINS: Record<1 | 2 | 3, number> = { 1: 14, 2: 26, 3: 44 };
const ACTION_XP: Record<1 | 2 | 3, number> = { 1: 12, 2: 20, 3: 34 };

export default function ScienceLabInteriorScreen() {
  const { coins, building, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastAction, setLastAction] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(EXPERIMENT_KEY);
        setLastAction(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  void building;
  const remaining = Math.max(0, lastAction + COOLDOWN_MS - Date.now());
  const actionCoins = scaledCoins(ACTION_COINS[level]);
  const actionXp = scaledXP(ACTION_XP[level]);

  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const levelBlurb =
    level >= 3
      ? "A living lab — benches of flasks and burners, and tall windows letting the light in."
      : level >= 2
        ? "More benches and brighter flasks — real science happens here now."
        : "Benches, a few flasks, and big questions.";

  const handleAction = async () => {
    if (remaining > 0) {
      Alert.alert("Still Bubbling", `The last experiment is still settling.\n\nRun the next one in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastAction(t);
    await AsyncStorage.setItem(EXPERIMENT_KEY, String(t)).catch(() => undefined);
    addCoins(actionCoins);
    await awardCustomXP(actionXp, `sciencelab-experiment-${t}`).catch(() => undefined);
    Alert.alert("It Worked!", `The solution turns the exact color the book promised. Creation, carefully watched, teaches.\n\n+${formatCoins(actionCoins)} coins, +${actionXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="science" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="science"
          iconColor={ACCENT}
          title="The Lab"
          blurb={`Run an experiment — worth +${formatCoins(actionCoins)} coins, +${actionXp} XP. ${levelBlurb}`}
          accent="#99F6E4"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["science-lab"]} level={level} pawn={pawn} pawnPose="work" width={sceneWidth} />
        </View>

                <InteriorActions
          primaryLabel={remaining > 0 ? `Next experiment in ${formatCooldown(remaining)}` : "Run an Experiment"}
          onPrimary={handleAction}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "A second bench and a greenhouse window." : "A specimen shelf, an element chart, and a microscope.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          While the Science Lab stands, Garden Tending records an extra flower in every completed session.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Washing the beakers…</Text>}
      </ScrollView>
    </View>
  );
}
