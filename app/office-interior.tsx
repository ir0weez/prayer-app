// Office Tower interior: a modern office. Villagers type away at their
// desks, the pawn helps with the whiteboard. "Help with Paperwork" grants
// coins + XP on a 1-hour cooldown.
// No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Polygon, Rect } from "react-native-svg";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import {
  GentleBob,
  WorkingFigure,
  pickPeople,
} from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

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

/** Skyline outside the windows — richer at L3. */
function Skyline({ tall }: { tall: boolean }) {
  return (
    <Svg width={tall ? 300 : 210} height={tall ? 92 : 64} viewBox={`0 0 ${tall ? 300 : 210} ${tall ? 92 : 64}`}>
      <Circle cx={tall ? 258 : 180} cy={16} r={11} fill="#FFF7D6" />
      <Polygon points="0,64 0,36 18,36 18,20 34,20 34,64" fill="#94A3B8" />
      <Polygon points="30,64 30,44 52,44 52,28 70,28 70,64" fill="#7C93AC" />
      <Polygon points="66,64 66,24 88,24 88,64" fill="#94A3B8" />
      {tall && (
        <g>
          <Polygon points="84,92 84,52 112,52 112,30 132,30 132,92" fill="#7C93AC" />
          <Polygon points="126,92 126,44 150,44 150,64 168,64 168,92" fill="#94A3B8" />
          <Polygon points="160,92 160,58 184,58 184,40 204,40 204,92" fill="#7C93AC" />
          <Polygon points="196,92 196,48 224,48 224,92" fill="#94A3B8" />
          <Polygon points="218,92 218,62 244,62 244,92" fill="#7C93AC" />
          <Path d="M0 92 L300 92" stroke="#64748B" strokeWidth={3} />
        </g>
      )}
      {!tall && <Path d="M0 64 L210 64" stroke="#64748B" strokeWidth={3} />}
    </Svg>
  );
}

/** Windows band — wider and brighter with level. */
function WindowBand({ level }: { level: number }) {
  const count = level >= 3 ? 3 : level >= 2 ? 2 : 1;
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", paddingTop: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ alignItems: "center", marginHorizontal: 4 }}>
          <View
            style={{
              width: level >= 3 ? 104 : 90,
              height: level >= 3 ? 108 : 78,
              borderRadius: 8,
              backgroundColor: SKY,
              borderWidth: 6,
              borderColor: CARD,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingBottom: 4,
            }}
          >
            <Skyline tall={level >= 3} />
            <View style={{ position: "absolute", left: "48%", top: 0, bottom: 0, width: 4, backgroundColor: CARD }} />
          </View>
          <View style={{ width: level >= 3 ? 116 : 100, height: 6, borderRadius: 3, backgroundColor: CARD, marginTop: -2, borderWidth: 1, borderColor: "#E2E8F0" }} />
        </View>
      ))}
    </View>
  );
}

/** Whiteboard with project notes (L2+) and the pawn beside it. */
function Whiteboard({ pawn }: { pawn: React.ReactNode }) {
  return (
    <View style={{ alignItems: "center", marginTop: 10 }}>
      <View style={{ width: 190, height: 96, borderRadius: 8, backgroundColor: "#FFFFFF", borderWidth: 6, borderColor: "#94A3B8", overflow: "hidden" }}>
        <Text style={{ fontSize: 10, fontWeight: "800", color: BLUE, marginTop: 4, marginLeft: 8 }}>THIS WEEK</Text>
        <View style={{ height: 2, backgroundColor: "#DBEAFE", marginTop: 2, marginHorizontal: 8 }} />
        {["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"].map((c, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", marginTop: 5, marginHorizontal: 8 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: c }} />
            <View style={{ height: 5, borderRadius: 2.5, backgroundColor: "#E2E8F0", marginLeft: 6, flex: 1, marginRight: 20 - i * 4 }} />
          </View>
        ))}
        <View style={{ position: "absolute", right: 8, bottom: 6 }}>
          <MaterialIcons name="push-pin" size={13} color="#EF4444" />
        </View>
      </View>
      <View style={{ width: 8, height: 26, backgroundColor: "#94A3B8" }} />
      <View style={{ width: 60, height: 6, borderRadius: 3, backgroundColor: "#94A3B8" }} />
      <View style={{ marginTop: -14 }}>{pawn}</View>
    </View>
  );
}

/** A single workstation: desk + monitor + papers, with a working villager. */
function Workstation({
  person,
  delay,
  deskColor,
}: {
  person?: { accentColor?: string; name: string } | null;
  delay: number;
  deskColor: string;
}) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8, marginVertical: 8 }}>
      {person ? (
        <WorkingFigure person={person as any} delay={delay} icon="laptop" iconColor={BLUE} />
      ) : (
        <View style={{ height: 62 }} />
      )}
      {/* monitor */}
      <View style={{ alignItems: "center", marginTop: -4 }}>
        <View style={{ width: 52, height: 34, borderRadius: 5, backgroundColor: SLATE, borderWidth: 2, borderColor: SLATE_DARK, overflow: "hidden", justifyContent: "center" }}>
          <View style={{ height: 4, backgroundColor: BLUE, opacity: 0.7, marginHorizontal: 5, borderRadius: 2 }} />
          <View style={{ height: 4, backgroundColor: "#60A5FA", opacity: 0.6, marginHorizontal: 5, borderRadius: 2, marginTop: 3, marginRight: 12 }} />
          <View style={{ height: 4, backgroundColor: "#93C5FD", opacity: 0.5, marginHorizontal: 5, borderRadius: 2, marginTop: 3, marginRight: 20 }} />
        </View>
        <View style={{ width: 6, height: 8, backgroundColor: SLATE_DARK }} />
      </View>
      {/* papers */}
      <View style={{ width: 26, height: 18, borderRadius: 2, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CBD5E1", position: "absolute", bottom: 40, right: 6, transform: [{ rotate: "8deg" }] }} />
      {/* desk surface + legs */}
      <View style={{ width: 108, height: 12, borderRadius: 6, backgroundColor: deskColor, borderWidth: 1.5, borderColor: SLATE_DARK, marginTop: -2 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", width: 92 }}>
        <View style={{ width: 8, height: 22, backgroundColor: SLATE }} />
        <View style={{ width: 8, height: 22, backgroundColor: SLATE }} />
      </View>
    </View>
  );
}

/** Conference table with chairs (L3). */
function ConferenceTable() {
  return (
    <View style={{ alignItems: "center", marginTop: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <View style={{ width: 42, height: 34, borderRadius: 6, backgroundColor: "#64748B", marginRight: 6 }} />
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 170, height: 16, borderRadius: 8, backgroundColor: "#475569", borderWidth: 2, borderColor: SLATE_DARK }} />
          <View style={{ width: 12, height: 26, backgroundColor: SLATE_DARK }} />
          <View style={{ width: 60, height: 8, borderRadius: 4, backgroundColor: SLATE_DARK }} />
          {/* documents on the table */}
          <View style={{ position: "absolute", top: 2, left: 20, width: 22, height: 14, borderRadius: 2, backgroundColor: "#FFFFFF", opacity: 0.95 }} />
          <View style={{ position: "absolute", top: 2, right: 24, width: 22, height: 14, borderRadius: 2, backgroundColor: "#FDE68A", opacity: 0.95 }} />
        </View>
        <View style={{ width: 42, height: 34, borderRadius: 6, backgroundColor: "#64748B", marginLeft: 6 }} />
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Meeting room table</Text>
    </View>
  );
}

/** Wall art (L3). */
function WallArt() {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 76, height: 58, borderRadius: 6, backgroundColor: "#EFF6FF", borderWidth: 4, borderColor: SLATE, overflow: "hidden" }}>
        <Svg width={68} height={50} viewBox="0 0 68 50">
          <Path d="M6 40 C18 24 28 40 38 26 C46 16 54 28 62 18" stroke={BLUE} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Circle cx={56} cy={10} r={5} fill="#F59E0B" />
        </Svg>
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Team art</Text>
    </View>
  );
}

/** Small desk plant with a gentle sway. */
function DeskPlant({ delay = 0 }: { delay?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <GentleBob delay={delay} amount={2}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#5B8A5E" }} />
        <View style={{ width: 15, height: 17, borderRadius: 10, backgroundColor: "#6FA372", marginTop: -11 }} />
      </GentleBob>
      <View style={{ width: 16, height: 13, borderRadius: 3, backgroundColor: "#C68B4E", marginTop: -3 }} />
    </View>
  );
}

export default function OfficeInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
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
  const deskColor = level >= 3 ? "#334155" : level >= 2 ? "#64748B" : "#94A3B8";

  const levelBlurb =
    level >= 3
      ? "Six desks, skyline windows, and a real meeting room."
      : level >= 2
        ? "More desks, a whiteboard, and growing plans."
        : "A quiet two-desk office getting off the ground.";

  const pawnChip = pawn ? (
    <View style={{ alignItems: "center" }}>
      <PawnPreview pawn={pawn} size={46} />
      <Text style={{ fontSize: 10, fontWeight: "700", color: BLUE, marginTop: 1 }}>{pawn.name.split(" ")[0]}</Text>
    </View>
  ) : null;

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

        {/* office floor — richer with level */}
        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#CBD5E1",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#E8F0FA" : level >= 2 ? "#EDF2F7" : "#F2F5F8",
          }}
        >
          <WindowBand level={level} />
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} />

          {/* side row: whiteboard (L2+) with the pawn, art (L3), plant */}
          <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start", paddingHorizontal: 12 }}>
            {level >= 2 ? (
              <Whiteboard pawn={pawnChip} />
            ) : (
              <View style={{ alignItems: "center", marginTop: 14 }}>{pawnChip}</View>
            )}
            {level >= 3 && (
              <View style={{ marginTop: 12 }}>
                <WallArt />
              </View>
            )}
            {level >= 2 && (
              <View style={{ marginTop: 22 }}>
                <DeskPlant delay={400} />
                <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Plant</Text>
              </View>
            )}
          </View>

          {/* workstations — 2 / 4 / 6 by level */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 6,
              paddingHorizontal: 8,
            }}
          >
            {Array.from({ length: deskCount }).map((_, i) => (
              <Workstation key={i} person={workers[i] ?? null} delay={i * 220} deskColor={deskColor} />
            ))}
          </View>

          {level >= 3 && <ConferenceTable />}

          {/* floor */}
          <View style={{ height: 26, backgroundColor: "#D8E2EC", marginTop: 8 }}>
            <View style={{ height: 3, backgroundColor: "#C2D0DE" }} />
          </View>
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
