// Apartment Complex interior: a warm lobby. Villagers check their mail and
// chat in the lounge. "Visit Neighbors" grants XP + a few coins on a 1-hour
// cooldown. No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from "react-native-svg";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import {
  GentleBob,
  SeatedFigure,
  StandingFigure,
  pickPeople,
} from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#FBF3E8"; // warm cream
const CARD = "#FFFFFF";
const TERRA = "#B4593A"; // terracotta
const TERRA_DARK = "#8C3F28";
const WOOD = "#8B5E34";
const GREEN = "#5B8A5E";
const GREEN_LIGHT = "#6FA372";
const TEXT = "#3A2E26";
const TEXT_DIM = "#9A8874";
const COOLDOWN_MS = 60 * 60 * 1000;
const STORAGE_KEY = "prayercircle.interior.apartments.neighbors.v1";
const COINS_BY_LEVEL = [2, 4, 8];
const XP_BY_LEVEL = [8, 14, 22];

/** Wall of mailboxes — with a letter glowing at L2+. */
function Mailboxes({ level }: { level: number }) {
  const cols = 5;
  const rows = 3;
  const openIdx = level >= 2 ? (level >= 3 ? [2, 9] : [6]) : [];
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ padding: 6, borderRadius: 10, backgroundColor: WOOD, borderWidth: 2, borderColor: "#5E3D22" }}>
        {Array.from({ length: rows }).map((_, r) => (
          <View key={r} style={{ flexDirection: "row" }}>
            {Array.from({ length: cols }).map((_, c) => {
              const i = r * cols + c;
              const open = openIdx.includes(i);
              return (
                <View
                  key={c}
                  style={{
                    width: 30,
                    height: 22,
                    margin: 2,
                    borderRadius: 3,
                    backgroundColor: open ? "#3A2E26" : "#A9825A",
                    borderWidth: 1,
                    borderColor: "#5E3D22",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {open ? (
                    <View style={{ width: 18, height: 12, borderRadius: 2, backgroundColor: "#FDF6E3" }}>
                      <View style={{ height: 2, backgroundColor: "#C9BFA8", marginTop: 3, marginHorizontal: 3 }} />
                      <View style={{ height: 2, backgroundColor: "#C9BFA8", marginTop: 2, marginHorizontal: 3 }} />
                    </View>
                  ) : (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#5E3D22" }} />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Mail room</Text>
    </View>
  );
}

/** Community bulletin board with pinned notes (L2+). */
function BulletinBoard() {
  const notes = ["#FDE68A", "#BAE6FD", "#FBCFE8", "#A7F3D0", "#FED7AA"];
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 130, height: 96, borderRadius: 8, backgroundColor: "#C68B4E", borderWidth: 6, borderColor: WOOD, overflow: "hidden" }}>
        {notes.map((c, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: 12 + (i % 3) * 38,
              top: 10 + Math.floor(i / 3) * 36,
              width: 30,
              height: 30,
              borderRadius: 2,
              backgroundColor: c,
              transform: [{ rotate: i % 2 === 0 ? "6deg" : "-7deg" }],
              borderWidth: 1,
              borderColor: "#00000018",
            }}
          >
            <View style={{ height: 1.5, backgroundColor: "#00000022", marginTop: 8, marginHorizontal: 4 }} />
            <View style={{ height: 1.5, backgroundColor: "#00000022", marginTop: 3, marginHorizontal: 4 }} />
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#8C3F28", alignSelf: "center", marginTop: -24 }} />
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Bulletin board</Text>
    </View>
  );
}

/** Concierge desk (L3). */
function ConciergeDesk() {
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <View style={{ width: 150, alignItems: "center" }}>
        <View style={{ width: 150, height: 12, borderRadius: 6, backgroundColor: WOOD, borderWidth: 2, borderColor: "#5E3D22" }} />
        <View style={{ width: 134, height: 56, backgroundColor: TERRA, borderWidth: 2, borderColor: TERRA_DARK, borderTopWidth: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#FDF6E3", fontWeight: "800", fontSize: 11, letterSpacing: 2 }}>CONCIERGE</Text>
        </View>
        {/* desk bell + phone */}
        <View style={{ position: "absolute", top: -22, flexDirection: "row", alignItems: "flex-end" }}>
          <View style={{ alignItems: "center", marginRight: 16 }}>
            <View style={{ width: 20, height: 13, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: "#EAD58A", borderWidth: 1.5, borderColor: "#8A6F1C" }} />
            <View style={{ width: 28, height: 5, borderRadius: 2.5, backgroundColor: "#8A6F1C" }} />
          </View>
          <View style={{ width: 26, height: 18, borderRadius: 4, backgroundColor: "#3A2E26" }}>
            <View style={{ width: 18, height: 10, borderRadius: 2, backgroundColor: "#BAE6FD", margin: 4 }} />
          </View>
        </View>
      </View>
    </View>
  );
}

/** Small chandelier (L3). */
function Chandelier() {
  return (
    <View style={{ alignItems: "center", marginTop: 4 }}>
      <Svg width={130} height={64} viewBox="0 0 130 64">
        <Line x1={65} y1={0} x2={65} y2={18} stroke="#C9A227" strokeWidth={4} />
        <Ellipse cx={65} cy={32} rx={52} ry={13} fill="none" stroke="#C9A227" strokeWidth={4} />
        {Array.from({ length: 5 }).map((_, i) => {
          const x = 65 - 44 + (i * 88) / 4;
          return (
            <g key={i}>
              <Line x1={65} y1={16} x2={x} y2={32} stroke="#C9A227" strokeWidth={3} />
              <Rect x={x - 3} y={20} width={6} height={11} rx={2} fill="#EAD58A" />
              <Circle cx={x} cy={18} r={3.5} fill="#FFF3C4" />
            </g>
          );
        })}
      </Svg>
    </View>
  );
}

/** Garden view window (L3) — trees and flowers outside. */
function GardenWindow() {
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: 130,
          height: 96,
          borderRadius: 10,
          backgroundColor: "#BEE3C5",
          borderWidth: 6,
          borderColor: CARD,
          overflow: "hidden",
        }}
      >
        <Circle cx={104} cy={22} r={12} fill="#FFF7D6" />
        {/* trees */}
        <Circle cx={30} cy={58} r={18} fill={GREEN} />
        <Circle cx={52} cy={64} r={14} fill={GREEN_LIGHT} />
        <Rect x={28} y={70} width={5} height={18} fill="#7A5230" />
        {/* flower bed */}
        <Ellipse cx={90} cy={86} rx={40} ry={10} fill="#7FB069" />
        <Circle cx={74} cy={76} r={5} fill="#E07A5F" />
        <Circle cx={88} cy={74} r={5} fill="#E0A63F" />
        <Circle cx={102} cy={77} r={5} fill="#C9758A" />
        {/* path */}
        <Path d="M58 96 L66 96 L62 64 L56 64 Z" fill="#D9C9A8" />
        <View style={{ position: "absolute", left: "48%", top: 0, bottom: 0, width: 4, backgroundColor: CARD }} />
        <View style={{ position: "absolute", top: "48%", left: 0, right: 0, height: 4, backgroundColor: CARD }} />
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Garden view</Text>
    </View>
  );
}

/** Lounge chairs around a plant table (L2+). */
function LoungeCorner({ level }: { level: number }) {
  const chairColor = level >= 3 ? TERRA : "#C68B4E";
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <View style={{ width: 50, height: 38, borderRadius: 8, backgroundColor: chairColor, borderWidth: 2, borderColor: TERRA_DARK, marginHorizontal: 8 }} />
        {/* plant table */}
        <View style={{ alignItems: "center", marginHorizontal: 4 }}>
          <GentleBob amount={2}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: GREEN }} />
            <View style={{ width: 13, height: 15, borderRadius: 9, backgroundColor: GREEN_LIGHT, marginTop: -9 }} />
          </GentleBob>
          <View style={{ width: 14, height: 11, borderRadius: 3, backgroundColor: "#B0724A", marginTop: -2 }} />
          <View style={{ width: 52, height: 9, borderRadius: 4, backgroundColor: WOOD, marginTop: 1 }} />
          <View style={{ flexDirection: "row" }}>
            <View style={{ width: 5, height: 14, backgroundColor: WOOD, marginHorizontal: 10 }} />
            <View style={{ width: 5, height: 14, backgroundColor: WOOD, marginHorizontal: 10 }} />
          </View>
        </View>
        <View style={{ width: 50, height: 38, borderRadius: 8, backgroundColor: chairColor, borderWidth: 2, borderColor: TERRA_DARK, marginHorizontal: 8 }} />
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Neighbor lounge</Text>
    </View>
  );
}

/** Swaying potted fern. */
function Fern({ delay = 0 }: { delay?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <GentleBob delay={delay} amount={2.5}>
        <Svg width={56} height={62} viewBox="0 0 56 62">
          <Path d="M28 54 C28 40 26 30 28 18" stroke={GREEN} strokeWidth={4} fill="none" />
          <Path d="M28 26 C18 20 10 20 4 24 C12 28 20 30 28 30" fill={GREEN_LIGHT} />
          <Path d="M28 26 C38 20 46 20 52 24 C44 28 36 30 28 30" fill={GREEN_LIGHT} />
          <Path d="M28 38 C16 32 8 32 2 38 C10 42 20 44 28 44" fill={GREEN} />
          <Path d="M28 38 C40 32 48 32 54 38 C46 42 36 44 28 44" fill={GREEN} />
          <Path d="M28 48 C20 44 14 44 8 48 C16 52 24 52 28 52" fill={GREEN_LIGHT} />
          <Path d="M28 48 C36 44 42 44 48 48 C40 52 32 52 28 52" fill={GREEN_LIGHT} />
        </Svg>
      </GentleBob>
      <View style={{ width: 20, height: 15, borderRadius: 3, backgroundColor: "#B0724A", marginTop: -4 }} />
    </View>
  );
}

export default function ApartmentsInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastVisit, setLastVisit] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setLastVisit(Number(raw) || 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastVisit));
  const neighbors = pickPeople(people, `apartments|${building?.id ?? "apartments"}`, 3);
  const coinsGain = COINS_BY_LEVEL[level - 1];
  const xpGain = XP_BY_LEVEL[level - 1];

  const levelBlurb =
    level >= 3
      ? "A concierge desk, a garden view, and neighbors who linger."
      : level >= 2
        ? "Notes on the board, plants by the door, friendly faces."
        : "A simple lobby where neighbors wave hello.";

  const handleVisit = async () => {
    if (remaining > 0) {
      Alert.alert("Good neighbor", `You've made all your rounds.\n\nVisit again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastVisit(t);
    await AsyncStorage.setItem(STORAGE_KEY, String(t)).catch(() => undefined);
    addCoins(coinsGain);
    await awardCustomXP(xpGain, `apartments-visit-${t}`).catch(() => undefined);
    Alert.alert(
      "Visit Neighbors",
      `You knock on doors, share news, and lend a hand.\n\n+${xpGain} XP  ·  +${coinsGain} coins`
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="apartment" iconColor={TERRA} title={buildingName} coins={coins} bg={BG} textColor={TEXT} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="people"
          iconColor={TERRA}
          title="A neighborhood, not just a building"
          blurb={`Everyone knows everyone here. ${levelBlurb}`}
          accent="#EFDCC8"
        />

        {/* lobby scene — richer with level */}
        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#E8D8C0",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FDF8EE" : level >= 2 ? "#FBF5EA" : "#F8F1E4",
          }}
        >
          {level >= 3 && <Chandelier />}

          {/* upper room: mailboxes + board / garden window */}
          <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start", paddingHorizontal: 10, marginTop: 8 }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="apartments" />
            <Mailboxes level={level} />
            {level >= 2 ? <BulletinBoard /> : <Fern delay={200} />}
            {level >= 3 && <GardenWindow />}
          </View>

          {/* the pawn checking the board, a neighbor grabbing mail */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
            {neighbors[0] && <StandingFigure person={neighbors[0]} delay={200} icon="mail" iconColor={TERRA} />}
            {pawn && (
              <View style={{ alignItems: "center", marginHorizontal: 10 }}>
                <MaterialIcons name="waving-hand" size={15} color={TERRA} />
                <PawnPreview pawn={pawn} size={50} />
                <Text style={{ fontSize: 10, fontWeight: "700", color: TERRA, marginTop: 2 }}>{pawn.name.split(" ")[0]}</Text>
              </View>
            )}
            {level < 2 && neighbors[1] && <StandingFigure person={neighbors[1]} delay={450} icon="chat" iconColor={TERRA} />}
          </View>

          {/* concierge (L3) */}
          {level >= 3 && <ConciergeDesk />}

          {/* rug (L2+) + lounge with chatting neighbors */}
          {level >= 2 && (
            <View style={{ alignItems: "center", marginTop: 6 }}>
              <View style={{ width: "82%", height: 16, borderRadius: 8, backgroundColor: level >= 3 ? TERRA : "#D08A6A", borderWidth: 2, borderColor: "#8C3F28" }} />
              <View style={{ width: "68%", height: 8, borderRadius: 4, backgroundColor: "#E4A88C", marginTop: -12, opacity: 0.7 }} />
            </View>
          )}
          {level >= 2 && <LoungeCorner level={level} />}
          {level >= 2 && (neighbors[1] || neighbors[2]) && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: level >= 3 ? 4 : -2, paddingBottom: 6 }}>
              {/* little chat bubbles above the chatters */}
              <View style={{ alignItems: "center" }}>
                <MaterialIcons name="chat-bubble-outline" size={13} color={TERRA} style={{ marginBottom: -2 }} />
                {neighbors[1] && <SeatedFigure person={neighbors[1]} delay={350} chairColor="#C68B4E" chairBorder="#8C5A2B" />}
              </View>
              {neighbors[2] && <SeatedFigure person={neighbors[2]} delay={650} chairColor="#C68B4E" chairBorder="#8C5A2B" />}
            </View>
          )}

          {/* plants row (L2+) */}
          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 36, marginTop: 4 }}>
              <Fern delay={500} />
              <Fern delay={800} />
            </View>
          )}

          {/* floor */}
          <View style={{ height: 26, backgroundColor: "#EBDCC2", marginTop: 8 }}>
            <View style={{ height: 3, backgroundColor: "#DECBA6" }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `More visits in ${formatCooldown(remaining)}` : "Visit Neighbors"}
          onPrimary={handleVisit}
          primaryColor={TERRA}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "A concierge desk, a garden view, and a chandelier." : "A bulletin board, plants, and a cozy lounge.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          A visit brings the community closer — and earns XP. Refreshes in an hour.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Tidying the lobby…</Text>}
      </ScrollView>
    </View>
  );
}
