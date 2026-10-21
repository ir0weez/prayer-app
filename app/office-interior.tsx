// Office Tower interior: a modern office. Villagers type away at their
// desks, the pawn helps with the whiteboard. L1: two desks, plain. L2: four
// desks, a whiteboard, a plant. L3: executive suites — six sleek desks with
// frosted glass partitions, skyline windows, glowing ceiling panels, a meeting
// room, a corner office with an executive desk, a coffee station, and a wall
// of awards. "Help with Paperwork" grants coins + XP on a 1-hour cooldown.
// No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene, type PaperCastEntry } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";

const BG = "#F1F5F9"; // cool light slate
const CARD = "#FFFFFF";
const SLATE = "#334155";
const SLATE_DARK = "#1E293B";
const BLUE = "#2563EB";
const SKY = "#BAE6FD";
const TEXT = "#1E293B";
const TEXT_DIM = "#64748B";
const COOLDOWN_MS = 60 * 60 * 1000;
const STORAGE_KEY = "prayercircle.interior.office.paperwork.v1";
const COINS_BY_LEVEL = [6, 12, 20];
const XP_BY_LEVEL = [5, 10, 16];
const DESKS_BY_LEVEL = [2, 4, 6];

export default function OfficeInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastPaperwork, setLastPaperwork] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setLastPaperwork(Number(raw) || 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastPaperwork));
  const deskCount = DESKS_BY_LEVEL[level - 1];
  const workers = pickPeople(people, `office|${building?.id ?? "office"}`, deskCount);
  const coinsGain = COINS_BY_LEVEL[level - 1];
  const xpGain = XP_BY_LEVEL[level - 1];
  const cast: PaperCastEntry[] = workers.map((person) => ({ person, pose: "seated" as const }));

  const levelBlurb =
    level >= 3
      ? "Executive suites — rows of desks under tall windows."
      : level >= 2
        ? "More desks and growing plans."
        : "A quiet two-desk office getting off the ground.";

  const handlePaperwork = async () => {
    if (remaining > 0) {
      Alert.alert("Caught up", `The inbox is clear for now.\n\nMore paperwork arrives in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastPaperwork(t);
    await AsyncStorage.setItem(STORAGE_KEY, String(t)).catch(() => undefined);
    addCoins(coinsGain);
    await awardCustomXP(xpGain, `office-paperwork-${t}`).catch(() => undefined);
    Alert.alert(
      "Help with Paperwork",
      `You sort files, stamp forms, and keep the office humming.\n\n+${xpGain} XP  ·  +${coinsGain} coins`
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="business" iconColor={BLUE} title={buildingName} coins={coins} bg={BG} textColor={TEXT} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="work"
          iconColor={BLUE}
          title="Busy professionals"
          blurb={`Hard work, honest work. ${levelBlurb}`}
          accent="#BFDBFE"
        />

        {/* office scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["office"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `More forms in ${formatCooldown(remaining)}` : "Help with Paperwork"}
          onPrimary={handlePaperwork}
          primaryColor={BLUE}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "Six desks, skyline windows, and a meeting room." : "More desks, a whiteboard, and a plant.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Pitch in with the paperwork for coins and XP. Refreshes in an hour.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the office…</Text>}
      </ScrollView>
    </View>
  );
}
