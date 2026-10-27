// ─────────────────────────────────────────────────────────────────────────────
// v287 — The Café Is a Place: the café street scene route.
//
// Entered by tapping the diner on the town map (the diner's tap used
// to open the shared restaurant interior; the scene is its front —
// the interior, its furniture and its coffee live on one step inside,
// via the scene's own door). The scene is a place in the interior
// family: same shell, same header, settled from stored state on open.
//
// Everything it shows is derived by lib/cafe-street.ts from the app's
// own records — today's prayer list IS the order board, and prayer
// (in Pray Today, nowhere else) is what serves an order. This route
// writes nothing: the week-lot settle rides loadCafeStreetData's
// existing persistence under the café's own key, and the coin ledger
// (lib/hometown.ts) is never touched here.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { InteriorHeader, useInteriorData } from "@/components/interior-shell";
import { CafeScene } from "@/components/cafe-scene";
import {
  buildCafeBoard,
  loadCafeStreetData,
  ovenStateFor,
  type CafeStreetData,
} from "@/lib/cafe-street";
import { getTimeOfDay } from "@/lib/daynight";
import { phaseForTimeOfDay } from "@/lib/welcoming-town";

const BG = "#EFE6D4";
const HEADER_BG = "#F7F1E8";
const INK = "#4A3220";

export default function CafeStreetSceneScreen() {
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const { coins, building, pawn, loaded } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [cafe, setCafe] = useState<CafeStreetData | null>(null);

  useEffect(() => {
    let live = true;
    loadCafeStreetData()
      .then((data) => {
        if (live) setCafe(data);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const board = useMemo(
    () => (cafe ? buildCafeBoard(cafe.people, cafe.today) : null),
    [cafe],
  );
  const oven = cafe ? ovenStateFor(cafe.fast, cafe.today) : "none";
  const phase = phaseForTimeOfDay(getTimeOfDay());
  // Coins are whole in this app — the pile shows whole coins waiting.
  const earnings = Math.max(0, Math.floor(building?.accumulated ?? 0));

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader
        icon="restaurant"
        iconColor="#B4503C"
        title="The Café"
        coins={coins}
        bg={HEADER_BG}
        textColor={INK}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {loaded && cafe && board ? (
          <CafeScene
            width={sceneWidth}
            phase={phase}
            oven={oven}
            board={board}
            people={cafe.people}
            today={cafe.today}
            pawn={pawn}
            weekLots={cafe.weekLots}
            earnings={earnings}
            buildingId={buildingId}
          />
        ) : (
          <Text style={{ fontSize: 15, color: "#8A7360", textAlign: "center", marginTop: 48 }}>
            Setting the tables…
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
