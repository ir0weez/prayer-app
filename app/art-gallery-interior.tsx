// Art Gallery interior: quiet white walls, framed paintings, and sculptures.
// Villagers wander the gallery — stopping before paintings, circling the
// sculpture, resting on the bench. The pawn takes in the collection with them.
// "View the Collection" grants coins + XP on a 1-hour cooldown.
// L1: two framed paintings on white walls, a rope barrier.
// L2: more frames, a sculpture pedestal, a rest bench.
// L3: grand gallery — tall arched windows, gold frames, a centerpiece
// sculpture, and warm skylight glow.
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

const BG = "#F7F5F0";
const STONE = "#D8D2C4";
const STONE_DARK = "#8A8070";
const TEXT_DIM = "#A09682";
const ACCENT = "#475569";
const GOLD = "#C9963C";
const WOOD_COLOR = "#8A5A2B";

const VIEW_COINS: Record<number, number> = { 1: 70, 2: 140, 3: 260 };
const VIEW_XP: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const VIEW_KEY = "prayercircle.interior.art-gallery.view.v1";

export default function ArtGalleryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastView, setLastView] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(VIEW_KEY).catch(() => null);
      setLastView(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastView + COOLDOWN_MS - Date.now());
  const gazers = pickPeople(people, `artgallery|${building?.id ?? "art-gallery"}|gaze`, 4);
  const docent = pickPeople(people, `artgallery|${building?.id ?? "art-gallery"}|docent`, 1)[0];

  const cast: PaperCastEntry[] = [
    ...gazers.map((person) => ({ person, pose: "stand" as const })),
    ...(docent ? [{ person: docent, pose: "stand" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand gallery — tall windows, canvases in gold frames, and warm pendant light."
      : level >= 2
        ? "A growing gallery — more canvases on easels, and room to linger."
        : "A humble gallery — two paintings on easels and quiet walls.";

  const handleView = async () => {
    if (remaining > 0) {
      Alert.alert("You have seen the collection", `The gallery needs a moment to change its lights.\n\nView the collection again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(VIEW_COINS[level] ?? 7);
    const xp = scaledXP(VIEW_XP[level] ?? 5);
    const t = Date.now();
    setLastView(t);
    await AsyncStorage.setItem(VIEW_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `artgallery-view-${t}`).catch(() => undefined);
    Alert.alert("Collection Viewed", `Slow rooms, bright canvases — beauty you can walk through.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="palette" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="image"
          iconColor={ACCENT}
          title="Art Gallery"
          blurb={`Paintings and sculptures on quiet gallery walls. ${levelBlurb}`}
          accent="#DDE3EC"
        />

        {/* art-gallery scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["art-gallery"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "View the Collection"}
          onPrimary={handleView}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand gallery — arched windows, gold frames, and a centerpiece sculpture." : "More frames, a stone sculpture, and a bench to rest on."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          View the collection once an hour. Take your time — beauty waits.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Hanging the paintings…</Text>}
      </ScrollView>
    </View>
  );
}
