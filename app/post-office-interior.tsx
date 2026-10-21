// Post Office interior: letters and parcels, sorted with care. The
// villager clerk stamps and sorts behind the counter, pigeonholes line
// the wall, and parcels stack by the door. The pawn helps sort the mail.
// "Sort the Mail" grants coins + XP on a 1-hour cooldown.
// L1: counter, pigeonholes, mailbag. L2: sorting table, parcel shelf.
// L3: grand post hall — brass grilles, tall pigeonhole wall, mail cart.
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

const BG = "#EFF3F8";
const WOOD = "#8A5A2B";
const WOOD_DARK = "#5E3D22";
const TEXT_DIM = "#8A99AD";
const ACCENT = "#1D4ED8";
const GOLD = "#C9963C";

const SORT_COINS: Record<number, number> = { 1: 40, 2: 80, 3: 160 };
const SORT_XP: Record<number, number> = { 1: 3, 2: 6, 3: 12 };
const COOLDOWN_MS = 60 * 60 * 1000;
const SORT_KEY = "prayercircle.interior.postoffice.sort.v1";

export default function PostOfficeInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastSort, setLastSort] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(SORT_KEY).catch(() => null);
      setLastSort(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastSort + COOLDOWN_MS - Date.now());
  const sorting = pickPeople(people, `postoffice|${building?.id ?? "postoffice"}|sort`, 3);
  const clerk = pickPeople(people, `postoffice|${building?.id ?? "postoffice"}|clerk`, 1)[0];

  const cast: PaperCastEntry[] = [
    ...sorting.map((person) => ({ person, pose: "work" as const })),
    ...(clerk ? [{ person: clerk, pose: "work" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand post hall — a towering pigeonhole wall and letters stacked high."
      : level >= 2
        ? "A busy office — tall pigeonholes, a clerk's counter, and parcels by the door."
        : "A humble office — a clerk's counter and pigeonholes full of letters.";

  const handleSort = async () => {
    if (remaining > 0) {
      Alert.alert("The mail is sorted", `Every letter is in its pigeonhole.\n\nSort the next delivery in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(SORT_COINS[level] ?? 4);
    const xp = scaledXP(SORT_XP[level] ?? 3);
    const t = Date.now();
    setLastSort(t);
    await AsyncStorage.setItem(SORT_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `postoffice-sort-${t}`).catch(() => undefined);
    Alert.alert("Mail Sorted", `You sort the morning delivery — not a letter out of place.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="mail" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="markunread-mailbox"
          iconColor={ACCENT}
          title="Post Office"
          blurb={`Letters and parcels, sorted with care. ${levelBlurb}`}
          accent="#D5E0F0"
        />

        {/* post-office scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["post-office"]} level={level} cast={cast} pawn={pawn} pawnPose="work" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Sort the Mail"}
          onPrimary={handleSort}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand post hall — brass grilles, a towering pigeonhole wall, and the mail cart." : "A sorting table, taller pigeonholes, and more parcels."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Sort the mail once an hour. Neither rain nor snow…
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the mailbag…</Text>}
      </ScrollView>
    </View>
  );
}
