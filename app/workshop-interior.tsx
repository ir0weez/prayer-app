// Workshop interior (School Campus): the campus's steady earner — a
// woodworking shop that grows with level: L1 one bench and a few tools, L2
// a pegboard tool wall and a second bench, L3 a lumber rack, a finished-
// furniture shelf, and a big window. "Finish a Project" grants coins + XP
// on a 1-hour cooldown, in the ministry-building pattern.
// No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, G, Line, Rect } from "react-native-svg";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { PawnPreview } from "@/components/pawn-preview";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import {
  SoftPulse,
  WorkingFigure,
  pickPeople,
  FigureName,
} from "@/components/activity-figures";

const BG = "#FAF6F0";
const WOOD = "#A9743F";
const WOOD_DARK = "#6B4A2F";
const ACCENT = "#92600F";
const ACCENT_DARK = "#713F12";
const TEXT_DIM = "#A08B6D";

const PROJECT_KEY = "prayercircle.interior.workshop.project.v1";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const ACTION_COINS: Record<1 | 2 | 3, number> = { 1: 16, 2: 30, 3: 52 };
const ACTION_XP: Record<1 | 2 | 3, number> = { 1: 8, 2: 14, 3: 22 };

/** A workbench with a project in progress. */
function Workbench({ seed = 0 }: { seed?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={150} height={80} viewBox="0 0 150 80">
        {/* the piece being built: a little chair taking shape */}
        <Rect x={58 + seed * 6} y={22} width={30} height={6} rx={2} fill="#D9A96B" />
        <Rect x={60 + seed * 6} y={28} width={5} height={16} fill={WOOD_DARK} />
        <Rect x={81 + seed * 6} y={28} width={5} height={16} fill={WOOD_DARK} />
        <Rect x={58 + seed * 6} y={10} width={5} height={14} fill={WOOD_DARK} />
        {/* a plank and a handsaw on the bench */}
        <Rect x={12} y={38} width={44} height={6} rx={2} fill="#D9A96B" />
        <Rect x={104} y={34} width={26} height={7} rx={2} fill="#CBD5E1" transform="rotate(-8 117 37)" />
        <Rect x={126} y={28} width={10} height={8} rx={2} fill={WOOD_DARK} transform="rotate(-8 131 32)" />
        {/* bench */}
        <Rect x={4} y={44} width={142} height={8} rx={3} fill={WOOD} />
        <Rect x={12} y={52} width={7} height={24} fill={WOOD_DARK} />
        <Rect x={131} y={52} width={7} height={24} fill={WOOD_DARK} />
        {/* a hammer resting below */}
        <Rect x={64} y={58} width={4.4} height={14} rx={2} fill={WOOD_DARK} transform="rotate(24 66 65)" />
        <Rect x={56} y={54} width={13} height={6} rx={2} fill="#78716C" transform="rotate(24 62 57)" />
      </Svg>
    </View>
  );
}

/** A pegboard tool wall (L2+). */
function ToolWall() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={128} height={72} viewBox="0 0 128 72">
        <Rect x={0} y={0} width={128} height={72} rx={5} fill="#C89B6A" />
        <Rect x={5} y={5} width={118} height={62} fill="#B98A54" />
        {/* peg dots */}
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
            <Circle key={`${r}-${c}`} cx={13 + c * 15} cy={12 + r * 16} r={1.3} fill="#8A673F" />
          ))
        )}
        {/* hanging tools: hammer, wrench, saw, square */}
        <G>
          <Rect x={16} y={14} width={4} height={20} rx={2} fill={WOOD_DARK} />
          <Rect x={10} y={10} width={15} height={7} rx={2} fill="#78716C" />
        </G>
        <G>
          <Rect x={46} y={12} width={4.6} height={22} rx={2.3} fill="#94A3B8" />
          <Circle cx={48.3} cy={11} r={5} fill="none" stroke="#94A3B8" strokeWidth={3} />
        </G>
        <G>
          <Rect x={70} y={14} width={30} height={8} rx={2} fill="#CBD5E1" />
          <Rect x={98} y={11} width={10} height={9} rx={2} fill={WOOD_DARK} />
        </G>
        <G>
          <Rect x={18} y={42} width={26} height={5} fill="#78716C" />
          <Rect x={18} y={42} width={5} height={18} fill="#78716C" />
        </G>
        <G>
          <Circle cx={84} cy={50} r={9} fill="none" stroke="#78716C" strokeWidth={3.4} />
          <Circle cx={84} cy={50} r={2.4} fill="#78716C" />
        </G>
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Every tool in its place</Text>
    </View>
  );
}

/** A lumber rack (L3). */
function LumberRack() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={96} height={66} viewBox="0 0 96 66">
        <Rect x={4} y={4} width={6} height={58} fill={WOOD_DARK} />
        <Rect x={86} y={4} width={6} height={58} fill={WOOD_DARK} />
        {[0, 1, 2].map((r) => (
          <G key={r}>
            <Rect x={4} y={16 + r * 18} width={88} height={5} fill={WOOD_DARK} />
            {[0, 1, 2, 3].map((i) => (
              <Rect key={i} x={12 + i * 20} y={6 + r * 18} width={16} height={9} rx={2} fill={["#D9A96B", "#C89B6A", "#E3B878", "#B98A54"][(r + i) % 4]} />
            ))}
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Lumber rack</Text>
    </View>
  );
}

/** Finished pieces on a shelf (L3): a stool, a birdhouse, a crate. */
function FinishedShelf() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={118} height={58} viewBox="0 0 118 58">
        {/* stool */}
        <Rect x={8} y={22} width={22} height={5} rx={2} fill={WOOD} />
        <Rect x={11} y={27} width={4} height={12} fill={WOOD_DARK} />
        <Rect x={23} y={27} width={4} height={12} fill={WOOD_DARK} />
        {/* birdhouse */}
        <Rect x={48} y={16} width={20} height={18} rx={2} fill="#B45309" />
        <Rect x={45} y={10} width={26} height={7} rx={2} fill={WOOD_DARK} />
        <Circle cx={58} cy={24} r={4} fill="#451A03" />
        {/* crate */}
        <Rect x={82} y={18} width={26} height={20} rx={2} fill="#C89B6A" />
        <Line x1={82} y1={25} x2={108} y2={25} stroke={WOOD_DARK} strokeWidth={2} />
        <Line x1={82} y1={32} x2={108} y2={32} stroke={WOOD_DARK} strokeWidth={2} />
        {/* shelf */}
        <Rect x={2} y={39} width={114} height={5} rx={2} fill={WOOD_DARK} />
        <Rect x={8} y={44} width={5} height={10} fill={WOOD_DARK} />
        <Rect x={105} y={44} width={5} height={10} fill={WOOD_DARK} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Finished work, ready to sell</Text>
    </View>
  );
}

export default function WorkshopInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastAction, setLastAction] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROJECT_KEY);
        setLastAction(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, lastAction + COOLDOWN_MS - Date.now());
  const actionCoins = scaledCoins(ACTION_COINS[level]);
  const actionXp = scaledXP(ACTION_XP[level]);
  const workers = pickPeople(people, `workshop|${building?.id ?? "shop"}|workers`, level >= 3 ? 3 : 2);

  const levelBlurb =
    level >= 3
      ? "A master's shop — two benches, a lumber rack, and finished pieces selling as fast as they're made."
      : level >= 2
        ? "A pegboard tool wall and a second bench — orders are picking up."
        : "One bench, a handsaw, and honest work.";

  const handleAction = async () => {
    if (remaining > 0) {
      Alert.alert("Glue Drying", `The current project needs to set.\n\nFinish the next one in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastAction(t);
    await AsyncStorage.setItem(PROJECT_KEY, String(t)).catch(() => undefined);
    addCoins(actionCoins);
    await awardCustomXP(actionXp, `workshop-project-${t}`).catch(() => undefined);
    Alert.alert("Project Finished", `Last screw in, edges sanded smooth — a piece built to be handed down.\n\n+${actionCoins.toFixed(2)} coins, +${actionXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="handyman" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="handyman"
          iconColor={ACCENT}
          title="The Workshop"
          blurb={`Finish a project — worth +${actionCoins.toFixed(2)} coins, +${actionXp} XP. ${levelBlurb}`}
          accent="#E7D8BE"
        />

        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#E7D8BE", overflow: "hidden", backgroundColor: "#FFFDF8" }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="school-workshop" />

          {level >= 2 && (
            <View style={{ alignItems: "center", marginTop: 12 }}>
              <ToolWall />
            </View>
          )}

          {/* benches with workers */}
          <View style={{ alignItems: "center", marginTop: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 12 }}>
              {workers[0] && <WorkingFigure person={workers[0]} delay={150} icon="handyman" iconColor={ACCENT} />}
              <Workbench seed={0} />
            </View>
            {level >= 2 && (
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 12, marginTop: 2 }}>
                <Workbench seed={1} />
                {workers[1] && <WorkingFigure person={workers[1]} delay={500} icon="build" iconColor={ACCENT} />}
              </View>
            )}
          </View>

          {level >= 3 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 20, marginTop: 8 }}>
              <LumberRack />
              <FinishedShelf />
            </View>
          )}

          {/* the hero at his bench */}
          {pawn && (
            <View style={{ alignItems: "center", marginTop: 6 }}>
              <SoftPulse duration={2250}>
                <FigureName name={pawn.name} color={ACCENT_DARK} />
              </SoftPulse>
              <PawnPreview pawn={pawn} size={48} />
            </View>
          )}

          {/* sawdust floor */}
          <View style={{ height: 22, backgroundColor: "#EFE3CC", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: WOOD }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Next project in ${formatCooldown(remaining)}` : "Finish a Project"}
          onPrimary={handleAction}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "A lumber rack and a shelf of finished pieces." : "A pegboard tool wall and a second bench.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          The Workshop is the campus's steady earner — no frills, just honest daily coins.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Sweeping up the sawdust…</Text>}
      </ScrollView>
    </View>
  );
}
