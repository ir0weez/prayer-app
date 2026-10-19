// Post Office interior: letters and parcels, sorted with care. The
// villager clerk stamps and sorts behind the counter, pigeonholes line
// the wall, and parcels stack by the door. The pawn helps sort the mail.
// "Sort the Mail" grants coins + XP on a 1-hour cooldown.
// L1: counter, pigeonholes, mailbag. L2: sorting table, parcel shelf.
// L3: grand post hall — brass grilles, tall pigeonhole wall, mail cart.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Rect, G } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { GentleBob, SoftPulse, StandingFigure, WorkingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#EFF3F8";
const WOOD = "#8A5A2B";
const WOOD_DARK = "#5E3D22";
const TEXT_DIM = "#8A99AD";
const ACCENT = "#1D4ED8";
const GOLD = "#C9963C";

const SORT_COINS: Record<number, number> = { 1: 4, 2: 8, 3: 16 };
const SORT_XP: Record<number, number> = { 1: 3, 2: 6, 3: 12 };
const COOLDOWN_MS = 60 * 60 * 1000;
const SORT_KEY = "prayercircle.interior.postoffice.sort.v1";

/** The clerk's counter with stamp, scale, and letter slots. */
function ClerkCounter({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={150} height={84} viewBox="0 0 150 84">
        <Rect x={8} y={40} width={134} height={38} rx={5} fill="#EDE9E3" stroke="#6B7280" strokeWidth={2.5} />
        {level >= 3 && <Rect x={6} y={36} width={138} height={7} rx={3.5} fill={GOLD} stroke="#8A6D1C" strokeWidth={1.5} />}
        <Line x1={8} y1={56} x2={142} y2={56} stroke="#9CA3AF" strokeWidth={1.5} />
        {/* brass grille */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Line key={i} x1={30 + i * 18} y1={6} x2={30 + i * 18} y2={36} stroke={level >= 3 ? GOLD : "#9CA3AF"} strokeWidth={2.5} />
        ))}
        <Rect x={22} y={30} width={106} height={8} rx={3} fill={level >= 3 ? GOLD : "#9CA3AF"} />
        {/* stamp */}
        <Rect x={20} y={60} width={10} height={14} rx={2} fill="#B91C1C" />
        <Rect x={17} y={56} width={16} height={6} rx={3} fill={WOOD_DARK} />
        {/* ink pad */}
        <Rect x={40} y={64} width={20} height={8} rx={3} fill="#1F2937" />
        {/* letter stack */}
        <Rect x={100} y={58} width={30} height={5} rx={1.5} fill="#F8FAFC" stroke="#9CA3AF" strokeWidth={1} />
        <Rect x={102} y={53} width={30} height={5} rx={1.5} fill="#F8FAFC" stroke="#9CA3AF" strokeWidth={1} transform="rotate(-4 117 55)" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Clerk's counter</Text>
    </View>
  );
}

/** The pigeonhole wall, stuffed with letters. */
function Pigeonholes({ level }: { level: number }) {
  const rows = level >= 3 ? 4 : 3;
  const cols = level >= 3 ? 6 : 5;
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={cols * 26 + 16} height={rows * 24 + 16} viewBox={`0 0 ${cols * 26 + 16} ${rows * 24 + 16}`}>
        <Rect x={2} y={2} width={cols * 26 + 12} height={rows * 24 + 12} rx={6} fill={WOOD} stroke={WOOD_DARK} strokeWidth={2.5} />
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const x = 8 + c * 26;
            const y = 8 + r * 24;
            const hasLetter = (r * cols + c + level) % 3 !== 0;
            return (
              <G key={`${r}-${c}`}>
                <Rect x={x} y={y} width={22} height={20} rx={2} fill="#3F3A32" />
                {hasLetter && (
                  <G>
                    <Rect x={x + 3} y={y + 5} width={16} height={11} rx={1.5} fill="#F8FAFC" stroke="#9CA3AF" strokeWidth={1} />
                    <Path d={`M${x + 4} ${y + 6} L${x + 11} ${y + 11} L${x + 18} ${y + 6}`} stroke="#9CA3AF" strokeWidth={1} fill="none" />
                  </G>
                )}
              </G>
            );
          })
        )}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Pigeonholes</Text>
    </View>
  );
}

/** Parcels stacked by the door. */
function ParcelStack({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={110} height={level >= 2 ? 110 : 84} viewBox="0 0 110 110">
        <Rect x={18} y={64} width={74} height={34} rx={4} fill="#C69A63" stroke="#8A5A2B" strokeWidth={2} />
        <Line x1={55} y1={64} x2={55} y2={98} stroke="#8A5A2B" strokeWidth={3} />
        <Line x1={18} y1={81} x2={92} y2={81} stroke="#8A5A2B" strokeWidth={3} />
        <Rect x={26} y={30} width={58} height={32} rx={4} fill="#D9B380" stroke="#8A5A2B" strokeWidth={2} />
        <Line x1={55} y1={30} x2={55} y2={62} stroke="#8A5A2B" strokeWidth={2.5} />
        {level >= 2 && (
          <>
            <Rect x={34} y={4} width={42} height={24} rx={4} fill="#C69A63" stroke="#8A5A2B" strokeWidth={2} />
            <Line x1={55} y1={4} x2={55} y2={28} stroke="#8A5A2B" strokeWidth={2.5} />
            <Circle cx={55} cy={16} r={6} fill="#B91C1C" />
            <Path d="M52 16 h6 M55 13 v6" stroke="#F8FAFC" strokeWidth={1.8} />
          </>
        )}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Parcels</Text>
    </View>
  );
}

/** A mailbag slumped by the counter. */
function Mailbag() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={70} height={84} viewBox="0 0 70 84">
        <Path d="M20 26 q5 -12 15 -12 q10 0 15 12 l6 44 q1 8 -8 8 h-26 q-9 0 -8 -8 Z" fill="#1D4ED8" stroke="#1E3A8A" strokeWidth={2.5} />
        <Rect x={26} y={10} width={18} height={8} rx={4} fill="#1E3A8A" />
        <Circle cx={35} cy={48} r={10} fill="#F8FAFC" opacity={0.9} />
        <Path d="M28 48 h14 M35 41 v14" stroke="#1D4ED8" strokeWidth={2} />
        <Rect x={24} y={62} width={22} height={4} rx={2} fill="#1E3A8A" opacity={0.6} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Mailbag</Text>
    </View>
  );
}

/** A mail cart with wheels (L3). */
function MailCart() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={120} height={84} viewBox="0 0 120 84">
        <Rect x={10} y={30} width={80} height={28} rx={6} fill="#3B82F6" stroke="#1E3A8A" strokeWidth={2.5} />
        <Rect x={16} y={36} width={22} height={14} rx={2} fill="#F8FAFC" stroke="#9CA3AF" strokeWidth={1} />
        <Rect x={42} y={34} width={22} height={16} rx={2} fill="#C69A63" stroke="#8A5A2B" strokeWidth={1.5} />
        <Line x1={90} y1={38} x2={108} y2={24} stroke="#6B7280" strokeWidth={4} strokeLinecap="round" />
        <Circle cx={30} cy={68} r={10} fill="#1F2937" />
        <Circle cx={30} cy={68} r={4} fill="#9CA3AF" />
        <Circle cx={78} cy={68} r={10} fill="#1F2937" />
        <Circle cx={78} cy={68} r={4} fill="#9CA3AF" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Mail cart</Text>
    </View>
  );
}

export default function PostOfficeInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
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

  const levelBlurb =
    level >= 3
      ? "A grand post hall — brass grilles, a towering pigeonhole wall, and the mail cart."
      : level >= 2
        ? "A busy office — a sorting table, tall pigeonholes, and parcels by the door."
        : "A humble office — a clerk's counter, pigeonholes, and a full mailbag.";

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
    Alert.alert("Mail Sorted", `You sort the morning delivery — not a letter out of place.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
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

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#D5E0F0",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#F4F7FC" : "#F1F5FA",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="post-office" />

          {/* clerk's counter */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <ClerkCounter level={level} />
            {clerk && (
              <GentleBob delay={250}>
                <WorkingFigure person={clerk} delay={250} icon="markunread-mailbox" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          {/* villagers sorting */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 84 }}>
            {sorting[0] && (
              <GentleBob delay={150}>
                <WorkingFigure person={sorting[0]} delay={150} icon="mail" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="drafts" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#1D4ED8" />
                </View>
              </GentleBob>
            )}
            {sorting[1] && (
              <GentleBob delay={650}>
                <WorkingFigure person={sorting[1]} delay={650} icon="mail-outline" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && sorting[2] && (
              <GentleBob delay={900}>
                <WorkingFigure person={sorting[2]} delay={900} icon="mail" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          {/* pigeonholes + parcels */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
            <Pigeonholes level={level} />
            <ParcelStack level={level} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <Mailbag />
            {level >= 3 && <MailCart />}
          </View>

          {/* stamped floor */}
          <View style={{ height: 26, backgroundColor: "#C9D4E2", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: "#A9B8CC" }} />
            <View style={{ flexDirection: "row", marginTop: 6, marginHorizontal: 60 }}>
              <View style={{ width: 22, height: 12, borderRadius: 2, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#9CA3AF", transform: [{ rotate: "8deg" }] }} />
              <View style={{ width: 22, height: 12, borderRadius: 2, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#9CA3AF", marginLeft: 24, transform: [{ rotate: "-6deg" }] }} />
            </View>
          </View>
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
