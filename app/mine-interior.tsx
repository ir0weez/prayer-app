// The Mine — the Dig Wall (v168; warmth pass v169).
//
// Through the cave mouth under the Great Peak — in out of the wild,
// lantern light on warm stone (the entrance shaft glows, v169: the
// cave should FEEL safe, a refuge, never a dungeon — and it has no
// name beyond "The Mine"): four strata of rock
// faces (Stone / Iron / Gold / The Deep), each a tap. Faces crack as
// you work them, break into ore for the satchel, and settle back over
// a few hours — by timestamp, never by timer (lib/mountain settles on
// open). The pickaxe ladder climbs Wood → Stone → Iron → Gold with
// coins, then Diamond behind prestige and the Crown Pick behind a
// Crown — bought at the Tool Shop in town (v170); the strip here only
// shows what the hero carries. Prayer stays the town's engine; the
// mine is a supplement.
//
// The haul (v172): the cave SELLS NOTHING — ore converts to coins
// only at the Mouth, up the shaft, where the satchel also banks its
// HAUL MULTIPLIER (the deepest band broken since the last sell:
// ×1 / ×1.5 / ×2 / ×3). The satchel has a bag's capacity now, too:
// full means the digging stops until it's hauled up and sold. A
// cave-in spends the multiplier along with the buried ore.
// No emojis — SVG paper art and MaterialIcons only.
//
// Danger and reward (v170): the Gold band and the Deep are unstable —
// a cracked face there groans (dust, amber cracks) and can come down
// on the next hit: face lost, unsold satchel partly buried, and the
// hero takes a real HP hit through lib/hero-health (a fall that would
// drop him to zero wakes him at home at the defeat floor instead).
// Any face can hide a rich vein, revealed gold at the first crack and
// paying double; breaking Deep rock can bare the still pool — one
// drink, a full heal or a forest blessing till midnight.

import { useCallback, useEffect, useRef, useState } from "react";
import { useSkin } from "@/hooks/use-skin";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Path, Polygon, Rect } from "react-native-svg";
import { InteriorHeader } from "@/components/interior-shell";
import { PaperGlowDisc, PaperPulse } from "@/components/paper-interior";
import { pickPeople } from "@/components/activity-figures";
import {
  formatCoins,
  loadCoinsRecord,
  prayedTodayPeople,
  type HometownCoins,
  type PrayedPerson,
} from "@/lib/hometown";
import { loadPrestigeLevel, loadPrestigeState } from "@/lib/prestige";
import { formatCooldown } from "@/lib/gathering-places";
import { paperDinerLookFor } from "@/lib/paper-interior";
import { loadHouseState } from "@/lib/pawn-house";
import {
  boonFor,
  combineBoons,
  grantPoolBoon,
  loadHeroNeeds,
  poolBoonFor,
  saveHeroNeeds,
  type HeroNeedsState,
} from "@/lib/hero-needs";
import {
  applyCaveInDamage,
  healToFull,
  loadHeroHealthRaw,
  restPctForBedTier,
  saveHeroHealth,
  settleHealth,
  type HeroHealthState,
} from "@/lib/hero-health";
import { combatStats, loadEquipped, refreshGearBoostCache } from "@/lib/gear";
import { refreshBadgeCache } from "@/lib/badges";
import { refreshStatBoostCache } from "@/lib/character-stats";
import {
  DAILY_FACE_CAP,
  FACES_PER_BAND,
  MINE_BANDS,
  MINE_TITLE,
  ORE_KINDS,
  ORE_PRICES,
  PICKAXES,
  bagFor,
  bandIndexForFace,
  bandMultiplier,
  canPickBand,
  effectiveHits,
  faceRumbles,
  faceStatus,
  formatHaulMultiplier,
  haulValue,
  isRichFace,
  loadMineState,
  mineTap,
  pickGateMet,
  pickaxeFor,
  satchelCapacity,
  satchelCount,
  saveMineState,
  spendPool,
  type MineGates,
  type MineState,
  type OreKind,
} from "@/lib/mountain";

const BG = "#20142E";
const PANEL = "#2E2140";
const CREAM = "#F7F0DE";
const DIM = "#B8A9CC";
const GOLD = "#C9963C";

/* ------------------------------------------------------------------ */
/* Small paper glyphs                                                  */
/* ------------------------------------------------------------------ */

/** A pickaxe in a 24-box, head in the tier's color. */
function PickIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5 6.5 C 8 2.8, 16 2.8, 20.5 6.5 C 15 5, 9 5, 3.5 6.5 Z" fill={color} />
      <Path d="M11.2 5.2 L14.8 18.6" stroke="#8A5A2B" strokeWidth={2.1} strokeLinecap="round" />
    </Svg>
  );
}

/** An ore nugget / gem in the satchel's colors. */
function OreGlyph({ kind, size = 16 }: { kind: OreKind; size?: number }) {
  if (kind === "diamond") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 3 L19 10 L12 21 L5 10 Z" fill="#9BE8F5" />
        <Path d="M5 10 H19 M12 21 L8.5 10 L12 3 L15.5 10 L12 21" fill="none" stroke="#CFF7FF" strokeWidth={1.1} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="7,5 15,3.4 20,8.6 18.4,16.6 10,20 4.4,14.6" fill={kind === "gold" ? "#F2B33D" : "#C96F3F"} />
      <Polygon points="7,5 12,9 10,20 4.4,14.6" fill={kind === "gold" ? "#FBBF24" : "#D97E4A"} opacity={0.75} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* One rock face                                                       */
/* ------------------------------------------------------------------ */

/** Deterministic fleck spots per band, in a 62x46 face box (the
 *  mockup's own layouts, nudged per slot so no two faces match). */
const FLECKS: Record<number, Array<[number, number]>> = {
  0: [[18, 20], [42, 32]],
  1: [[16, 12], [38, 30], [48, 14], [10, 34]],
  2: [[18, 14], [40, 28], [50, 12]],
  3: [[20, 12], [44, 30], [30, 36]],
};

function FaceArt({ bandIndex, slot, status, hitsLeft, hitsMax, rich = false, rumbling = false }: {
  bandIndex: number;
  slot: number;
  status: "ready" | "cracked" | "resting";
  hitsLeft: number | null;
  hitsMax: number;
  /** A rich vein, revealed at the first crack: gold shimmer (v170). */
  rich?: boolean;
  /** A cracked face in an unstable band: dust and amber cracks (v170). */
  rumbling?: boolean;
}) {
  const band = MINE_BANDS[bandIndex];
  const fleckColor = bandIndex === 1 ? "#C96F3F" : bandIndex === 2 ? "#FBBF24" : bandIndex === 3 ? "#9BE8F5" : "#8D8D99";
  const flecks = (FLECKS[bandIndex] ?? []).map(([x, y], i) => [
    Math.min(56, Math.max(5, x + ((slot * 7 + i * 3) % 5) - 2)),
    Math.min(40, Math.max(5, y + ((slot * 5 + i * 2) % 5) - 2)),
  ] as [number, number]);
  const crackDepth = status === "cracked" ? (hitsLeft != null && hitsLeft <= Math.ceil(hitsMax / 2) ? 2 : 1) : 0;
  const crackColor = rumbling ? "#B45309" : "#4A3548";
  return (
    <Svg width={62} height={46} viewBox="0 0 62 46">
      <Rect x={1} y={1} width={60} height={44} rx={11} fill={status === "resting" ? "#5F4E47" : band.faceColor} />
      {rich && status !== "resting" && (
        <>
          <Rect x={1} y={1} width={60} height={44} rx={11} fill="#F2B33D" opacity={0.22} />
          <Rect x={1} y={1} width={60} height={44} rx={11} fill="none" stroke="#FDE68A" strokeWidth={1.6} />
        </>
      )}
      {bandIndex === 3 &&
        flecks.map(([x, y], i) => (
          <Path key={i} d={`M${x} ${y - 5} l3.4 4.6 -3.4 6 -3.4 -6 Z`} fill={fleckColor} opacity={status === "resting" ? 0.25 : 0.95} />
        ))}
      {bandIndex !== 3 &&
        flecks.map(([x, y], i) =>
          bandIndex === 0 ? (
            <Circle key={i} cx={x} cy={y} r={2.2} fill={fleckColor} opacity={status === "resting" ? 0.25 : 0.8} />
          ) : (
            <Polygon key={i} points={`${x - 4},${y + 2} ${x + 1},${y - 3} ${x + 5},${y + 1} ${x},${y + 4}`} fill={fleckColor} opacity={status === "resting" ? 0.25 : 0.95} />
          )
        )}
      {bandIndex === 2 && status !== "resting" && flecks.map(([x, y], i) => (
        <Circle key={`s${i}`} cx={x} cy={y} r={1.4} fill="#FFE9A8" />
      ))}
      {rich && status === "cracked" && (
        <>
          <Circle cx={16} cy={12} r={1.7} fill="#FFF3C4" />
          <Circle cx={47} cy={20} r={1.4} fill="#FFF3C4" />
          <Circle cx={31} cy={36} r={1.5} fill="#FFF3C4" />
          <Path d="M22 6 l1.2 2.6 L26 10 l-2.8 1.2 L22 14 l-1.2 -2.8 L18 10 l2.8 -1.4 Z" fill="#FDE68A" />
        </>
      )}
      {crackDepth >= 1 && (
        <Path d="M33 2 L27 13 L35 21 L29 33" fill="none" stroke={crackColor} strokeWidth={1.8} strokeLinecap="round" />
      )}
      {crackDepth >= 2 && (
        <Path d="M14 4 L19 14 L13 24 M48 6 L43 16 L49 27" fill="none" stroke={crackColor} strokeWidth={1.5} strokeLinecap="round" />
      )}
      {rumbling && (
        <>
          {/* dust shaking loose at the base — the rock groans */}
          <Circle cx={14} cy={41} r={2.4} fill="#D8C7A8" opacity={0.75} />
          <Circle cx={24} cy={43} r={1.7} fill="#D8C7A8" opacity={0.6} />
          <Circle cx={40} cy={42} r={2.1} fill="#D8C7A8" opacity={0.7} />
          <Circle cx={50} cy={40} r={1.5} fill="#D8C7A8" opacity={0.55} />
          <Circle cx={20} cy={16} r={1.3} fill="#D8C7A8" opacity={0.65} />
          <Circle cx={45} cy={26} r={1.2} fill="#D8C7A8" opacity={0.6} />
        </>
      )}
      {status === "resting" && (
        <Rect x={1} y={1} width={60} height={44} rx={11} fill="none" stroke="#CBB8A5" strokeWidth={1.6} strokeDasharray="5 4" />
      )}
    </Svg>
  );
}

/** The still pool, showing where a Deep face broke (v170): calm,
 *  glowing water — the mountain's mercy, deep down. */
function PoolArt() {
  return (
    <Svg width={62} height={46} viewBox="0 0 62 46">
      <Rect x={1} y={1} width={60} height={44} rx={11} fill="#1D2B47" />
      <Circle cx={31} cy={23} r={17} fill="#7DD3FC" opacity={0.18} />
      <Path d="M10 27 Q 20 20, 31 26 T 52 25 L 52 38 Q 41 43, 31 39 T 10 37 Z" fill="#38BDF8" opacity={0.75} />
      <Path d="M14 29 Q 22 24, 31 28 T 48 27" fill="none" stroke="#E0F2FE" strokeWidth={1.6} strokeLinecap="round" opacity={0.9} />
      <Path d="M20 34 Q 27 31, 34 34 T 46 33" fill="none" stroke="#BAE6FD" strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
      <Circle cx={24} cy={14} r={1.5} fill="#E0F2FE" />
      <Circle cx={40} cy={10} r={1.2} fill="#E0F2FE" opacity={0.8} />
    </Svg>
  );
}

/** The decorative villager at work in the iron band (mockup dressing —
 *  presence only; mining is the hero's own taps, no job system). */
function DressingMiner({ person }: { person: PrayedPerson }) {
  const look = paperDinerLookFor({ id: String(person.id), accentColor: person.accentColor });
  return (
    <Svg width={34} height={44} viewBox="0 0 34 44">
      <Circle cx={13} cy={9} r={5.5} fill={look.skin} />
      <Path d="M6 38 V24 a7 7 0 0 1 14 0 V38 Z" fill={look.shirt} />
      <Path d="M19 20 L27 12" stroke="#9A6A3B" strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M27 12 L31 17" stroke="#9C93AC" strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* The screen                                                          */
/* ------------------------------------------------------------------ */

export default function MineInteriorScreen() {
  const router = useRouter();
  // Paper skin (v174): chrome bars gain the kit shadow; cave art untouched.
  const { isPaper, tokens: skinTokens } = useSkin();
  const [mine, setMine] = useState<MineState | null>(null);
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [gates, setGates] = useState<MineGates>({ totalPrestiges: 0, crowns: 0 });
  const [people, setPeople] = useState<PrayedPerson[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hero health (lib/hero-health): the SAME persistent HP the Dark
  // Forest fights with — a cave-in hits it here, the still pool can
  // mend it here. effMax is computed exactly as the forest and the
  // hospital compute it (gear + stacked boons).
  const [heroHealth, setHeroHealth] = useState<HeroHealthState | null>(null);
  const [effMax, setEffMax] = useState(0);
  const [needs, setNeeds] = useState<HeroNeedsState | null>(null);
  /** The last cave-in's account, shown at the entrance until he digs again. */
  const [caveInMsg, setCaveInMsg] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    const [m, c, pState, crowns, ppl] = await Promise.all([
      loadMineState(),
      loadCoinsRecord(),
      loadPrestigeState(),
      loadPrestigeLevel(),
      prayedTodayPeople().catch(() => [] as PrayedPerson[]),
    ]);
    setMine(m);
    setCoins(c);
    setGates({ totalPrestiges: pState.totalPrestiges, crowns });
    setPeople(ppl);
    // Hero health, settled the way the Dark Forest settles it.
    try {
      try { await refreshGearBoostCache(); } catch {}
      try { await refreshBadgeCache(); } catch {}
      try { await refreshStatBoostCache(); } catch {}
      const [house, nds, equipped] = await Promise.all([
        loadHouseState(),
        loadHeroNeeds(),
        loadEquipped(),
      ]);
      setNeeds(nds);
      const boon = combineBoons(boonFor(nds, house), poolBoonFor(nds));
      const base = combatStats(equipped);
      const max = boon.active ? Math.round(base.maxHp * (1 + boon.hpPct)) : base.maxHp;
      setEffMax(max);
      const bedTier = house.rooms.bedroom?.furniture["bed"] || 0;
      const raw = await loadHeroHealthRaw();
      const { state: settled, changed } = settleHealth(raw, Date.now(), max, restPctForBedTier(bedTier));
      setHeroHealth(settled);
      if (changed) await saveHeroHealth(settled).catch(() => undefined);
    } catch {}
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  /** Drink the still pool — one drink per discovery, his choice:
   *  mended whole, or blessed for the forest till midnight. */
  const handleDrinkPool = useCallback(
    (choice: "heal" | "blessing") => {
      if (!mine || mine.poolFace == null) return;
      void (async () => {
        const next = spendPool(mine);
        setMine(next);
        await saveMineState(next);
        if (choice === "heal") {
          if (heroHealth && effMax > 0) {
            const healed = healToFull(heroHealth, effMax, Date.now());
            setHeroHealth(healed);
            await saveHeroHealth(healed).catch(() => undefined);
          }
          showToast("You drink deep — strength returns, whole.");
        } else {
          if (needs) {
            const blessed = grantPoolBoon(needs, Date.now());
            setNeeds(blessed);
            await saveHeroNeeds(blessed).catch(() => undefined);
          }
          showToast("The pool's blessing settles on you — forest strength till midnight.");
        }
      })();
    },
    [mine, heroHealth, effMax, needs, showToast]
  );

  const handleTapFace = useCallback(
    (faceIndex: number) => {
      if (!mine) return;
      // The pool shows at a Deep face's spot — tapping it is the drink.
      if (mine.poolFace === faceIndex) {
        Alert.alert(
          "The still pool",
          "Still water, deep down, glowing faintly. One drink: it can mend you whole, or bless your strength in the Dark Forest until midnight.",
          [
            { text: "Not yet", style: "cancel" },
            { text: "Drink — full heal", onPress: () => handleDrinkPool("heal") },
            { text: "Drink — forest blessing", onPress: () => handleDrinkPool("blessing") },
          ]
        );
        return;
      }
      setCaveInMsg(null); // digging again — a new trip
      const now = Date.now();
      const wasCracked = mine.faces[faceIndex]?.hitsLeft != null;
      const haulBefore = mine.haulMultiplier;
      const { state, outcome } = mineTap(mine, faceIndex, now, Math.random(), Math.random(), Math.random());
      setMine(state);
      void saveMineState(state);
      const band = MINE_BANDS[bandIndexForFace(faceIndex)];
      if (outcome.kind === "full") {
        showToast("Your bag is full — haul it up to the Mouth.");
      } else if (outcome.kind === "collapse") {
        // The hero takes the hit through the one HP store (v170):
        // 20% of max, and a hit that would drop him to zero wakes
        // him at home at the defeat floor instead — never worse.
        const buriedParts = ORE_KINDS.filter((k) => outcome.buried[k] > 0).map(
          (k) => `${outcome.buried[k]} ${k}`
        );
        let hpLine = "You scramble out to the lantern light.";
        if (heroHealth && effMax > 0) {
          const hit = applyCaveInDamage(heroHealth, effMax, now);
          setHeroHealth(hit.state);
          void saveHeroHealth(hit.state);
          hpLine = hit.wokeAtHome
            ? "Darkness — then home. You wake shaken but whole, at a whisper of strength. The mountain kept the rest."
            : `The fall costs you ${hit.damage} HP. You scramble out to the lantern light, digging done for now.`;
        }
        const msg =
          `The ${band.name} face came down.` +
          (buriedParts.length ? ` Buried from your satchel: ${buriedParts.join(", ")}.` : "") +
          (haulBefore > 1
            ? ` And the haul's ×${formatHaulMultiplier(haulBefore)} promise is buried with it — what survives sells at ×1.`
            : "") +
          ` ${hpLine}`;
        setCaveInMsg(msg);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        Alert.alert("Cave-in!", msg);
      } else if (outcome.kind === "broke") {
        const parts = ORE_KINDS.filter((k) => (outcome.yield[k] ?? 0) > 0).map(
          (k) => `+${outcome.yield[k]} ${k}`
        );
        showToast(
          (outcome.rich ? "A rich vein! " : "") +
            (parts.length ? parts.join("  ") : "The face crumbles")
        );
        if (outcome.poolRevealed) {
          Alert.alert(
            "Still water",
            "Beneath the broken rock, water gathers — still, and faintly glowing. The still pool is showing in the Deep. Tap it to drink."
          );
        }
      } else if (outcome.kind === "hit") {
        if (!wasCracked) {
          // The first crack is the reveal moment: a rich vein shows
          // its gold, and unstable rock gives its one fair warning.
          const notes: string[] = [];
          if (isRichFace(faceIndex, state.day)) notes.push("Gold in the crack — a rich vein!");
          if (outcome.rumbling) notes.push("The rock groans… this face could come down.");
          if (notes.length) showToast(notes.join(" "));
        }
      } else if (outcome.kind === "locked") {
        Alert.alert(
          "Too deep for this pick",
          `The ${band.name} band needs the ${pickaxeFor(outcome.requiredPick).name}. Better rock takes a better pick — picks are sold at the Tool Shop in town.`
        );
      } else if (outcome.kind === "resting") {
        Alert.alert(
          "Still settling",
          `This face is filling back in, the way the mountain heals. Whole again in about ${formatCooldown(Math.max(0, outcome.readyAt - now))}.`
        );
      } else if (outcome.kind === "cap") {
        Alert.alert(
          "The mine rests",
          `You've mined today's ${DAILY_FACE_CAP} faces. The wall settles overnight — come back tomorrow.`
        );
      }
    },
    [mine, heroHealth, effMax, handleDrinkPool, showToast]
  );

  const dressingMiner = pickPeople(people, "mine|dressing", 1)[0];
  const bagCount = mine ? satchelCount(mine.satchel) : 0;
  const bagCap = mine ? satchelCapacity(mine) : 0;
  const haulWorth = mine ? haulValue(mine) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="terrain" iconColor={GOLD} title={MINE_TITLE} coins={coins} bg={BG} textColor={CREAM} />
      {mine && (
        <View style={[{ flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 10, backgroundColor: "#3B2C14", borderColor: GOLD, borderWidth: 1, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 12 }, isPaper ? skinTokens.cardShadow : null]}>
          <MaterialIcons name="trending-up" size={16} color="#FDE68A" />
          <Text style={{ color: "#FDE68A", fontWeight: "800", fontSize: 13, marginLeft: 7 }}>
            Haul ×{formatHaulMultiplier(mine.haulMultiplier)}
          </Text>
          <Text style={{ color: DIM, fontSize: 11.5, marginLeft: 8, flex: 1 }}>
            the deepest band worked sets the rate — it banks at the Mouth, a cave-in spends it
          </Text>
          <Text style={{ color: bagCount >= bagCap ? "#FCA5A5" : DIM, fontWeight: "800", fontSize: 12 }}>
            {bagCount}/{bagCap}
          </Text>
        </View>
      )}
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={{ color: DIM, fontSize: 13, lineHeight: 19, marginHorizontal: 16, marginBottom: 12 }}>
          Come in out of the wild — the lanterns are lit, the stone is warm, and the rock provides. Tap a face to
          mine it with your pick — iron near the top, gold deeper, diamonds sleeping in the Deep. Faces settle
          back over a few hours. But mind the deep bands: gold rock and the Deep can groan, and groaning rock
          can fall — a cave-in buries unsold ore and costs the hero dear. What glitters down there is real, too.
        </Text>

        {toast && (
          <View style={[{ marginHorizontal: 16, marginBottom: 10, backgroundColor: "#3B2C14", borderColor: GOLD, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center" }, isPaper ? skinTokens.cardShadow : null]}>
            <Text style={{ color: "#FDE68A", fontWeight: "800", fontSize: 14 }}>{toast}</Text>
          </View>
        )}

        {caveInMsg && (
          <View style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: "#3D1420", borderColor: "#F87171", borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12 }}>
            <Text style={{ color: "#FCA5A5", fontWeight: "800", fontSize: 13, marginBottom: 2 }}>Cave-in!</Text>
            <Text style={{ color: "#FECACA", fontSize: 12.5, lineHeight: 17 }}>{caveInMsg}</Text>
          </View>
        )}

        {!mine ? (
          <Text style={{ color: DIM, textAlign: "center", marginTop: 24 }}>Lighting the lanterns…</Text>
        ) : (
          <View style={{ flexDirection: "row", marginHorizontal: 16 }}>
            {/* the dig wall */}
            <View style={{ flex: 1, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(24,8,44,.6)" }}>
              {/* surface strip — grass and the shaft you came down.
                  The shaft mouth carries the cave's welcome (v169):
                  warm light pooled where you step in, breathing on
                  the kit's sine — coming in out of the wild, not
                  descending into a dungeon. */}
              <View style={{ height: 20, backgroundColor: "#7CB35C", position: "relative" }}>
                <View style={{ position: "absolute", left: "42%", top: 8, width: 34, height: 12, backgroundColor: "#241430" }} />
                <PaperPulse duration={2800} min={0.6} max={1} style={{ position: "absolute", left: "42%", marginLeft: -14, top: -16 }}>
                  <PaperGlowDisc size={62} color="#FFB84D" opacity={0.65} />
                </PaperPulse>
                {/* two lantern dots keeping the shaft mouth */}
                <View style={{ position: "absolute", left: "42%", marginLeft: -5, top: 9, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFD98A" }} />
                <View style={{ position: "absolute", left: "42%", marginLeft: 34, top: 9, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFD98A" }} />
              </View>
              {MINE_BANDS.map((band, bandIndex) => {
                const locked = !canPickBand(mine, bandIndex * FACES_PER_BAND);
                return (
                  <View key={band.id} style={{ backgroundColor: band.color, height: 84, position: "relative", justifyContent: "center" }}>
                    {/* rotated band label, as in the mockup — with the
                        band's haul rate (v172): this is what working
                        this depth does to everything in the bag */}
                    <View style={{ position: "absolute", left: -29, top: 33, width: 76, alignItems: "center", transform: [{ rotate: "-90deg" }] }}>
                      <Text style={{ color: CREAM, fontSize: 9, fontWeight: "bold", letterSpacing: 2.2, opacity: 0.92 }}>{band.name.toUpperCase()} ×{formatHaulMultiplier(bandMultiplier(bandIndex))}</Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-evenly", marginLeft: 22, marginRight: bandIndex === 1 && dressingMiner ? 30 : 4 }}>
                      {Array.from({ length: FACES_PER_BAND }).map((_, slot) => {
                        const faceIndex = bandIndex * FACES_PER_BAND + slot;
                        const face = mine.faces[faceIndex];
                        const status = faceStatus(mine, faceIndex);
                        const isPool = mine.poolFace === faceIndex;
                        return (
                          <Pressable key={faceIndex} onPress={() => handleTapFace(faceIndex)} style={{ opacity: locked && !isPool ? 0.55 : 1 }}>
                            <View style={{ position: "relative", width: 62, height: 46 }}>
                              <View style={{ position: "absolute", left: 2.5, top: 3, width: 62, height: 46, borderRadius: 12, backgroundColor: "rgba(24,8,44,.3)" }} />
                              {isPool ? (
                                <PoolArt />
                              ) : (
                                <FaceArt
                                  bandIndex={bandIndex}
                                  slot={slot}
                                  status={status}
                                  hitsLeft={face.hitsLeft}
                                  hitsMax={effectiveHits(band, mine.pickTier)}
                                  rich={status === "cracked" && isRichFace(faceIndex, mine.day)}
                                  rumbling={faceRumbles(mine, faceIndex)}
                                />
                              )}
                              {locked && !isPool && (
                                <View style={{ position: "absolute", left: 0, top: 0, width: 62, height: 46, alignItems: "center", justifyContent: "center" }}>
                                  <MaterialIcons name="lock" size={18} color={CREAM} />
                                </View>
                              )}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                    {bandIndex === 1 && dressingMiner && (
                      <View pointerEvents="none" style={{ position: "absolute", right: 2, bottom: 2 }}>
                        <DressingMiner person={dressingMiner} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* the pickaxe ladder — STATUS ONLY (v170): picks are
                bought at the Tool Shop in town; this strip just shows
                what the hero carries and where the next rung lives. */}
            <View style={{ width: 96, marginLeft: 10, backgroundColor: PANEL, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: "rgba(24,8,44,.6)" }}>
              <Text style={{ color: CREAM, fontWeight: "800", fontSize: 12, marginBottom: 8, textAlign: "center" }}>Pickaxes</Text>
              {PICKAXES.map((pick) => {
                const owned = pick.tier <= mine.pickTier;
                const current = pick.tier === mine.pickTier;
                const isNext = pick.tier === mine.pickTier + 1;
                const gateMet = pickGateMet(pick.tier, gates);
                return (
                  <Pressable
                    key={pick.tier}
                    onPress={() => {
                      if (!owned) {
                        Alert.alert(
                          "Sold at the Tool Shop",
                          `Picks are tools, and tools are sold at the Tool Shop in town. The ${pick.name} waits there${pick.cost > 0 ? ` for ${formatCoins(pick.cost)} coins` : ""}. This wall only shows what you carry.`
                        );
                      }
                    }}
                    style={{
                      paddingVertical: 7,
                      paddingHorizontal: 6,
                      borderRadius: 10,
                      marginBottom: 6,
                      backgroundColor: current ? "rgba(201,150,60,.22)" : "rgba(255,255,255,.05)",
                      borderWidth: current ? 1 : 0,
                      borderColor: GOLD,
                      opacity: !owned && !isNext && !gateMet ? 0.65 : 1,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <PickIcon color={pick.color} size={18} />
                      <Text style={{ color: CREAM, fontSize: 10.5, fontWeight: "700", marginLeft: 4, flex: 1 }} numberOfLines={1}>
                        {pick.name.replace(" Pick", "")}
                      </Text>
                    </View>
                    {current ? (
                      <Text style={{ color: "#FDE68A", fontSize: 9.5, fontWeight: "800", marginTop: 3 }}>Yours</Text>
                    ) : owned ? (
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                        <MaterialIcons name="check" size={11} color={DIM} />
                        <Text style={{ color: DIM, fontSize: 9.5, marginLeft: 2 }}>Owned</Text>
                      </View>
                    ) : pick.gate !== "none" && !gateMet ? (
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                        <MaterialIcons name={pick.gate === "crown" ? "workspace-premium" : "lock"} size={11} color={DIM} />
                        <Text style={{ color: DIM, fontSize: 9.5, marginLeft: 2 }}>{pick.gate === "crown" ? "Crown" : "Prestige"}</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                        <MaterialIcons name="storefront" size={11} color="#FDE68A" />
                        <Text style={{ color: "#FDE68A", fontSize: 9.5, fontWeight: "700", marginLeft: 2 }}>Tool Shop</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
              <Text style={{ color: DIM, fontSize: 9, lineHeight: 13, textAlign: "center", marginTop: 2 }}>
                Better picks are sold at the Tool Shop. Deeper bands need the pick named for the rock above them.
              </Text>
            </View>
          </View>
        )}

        {/* the still pool — showing in the Deep until drunk (v170) */}
        {mine && mine.poolFace != null && (
          <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: "#16263F", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "#38BDF8" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialIcons name="water-drop" size={20} color="#7DD3FC" />
              <Text style={{ color: "#E0F2FE", fontWeight: "800", fontSize: 14, marginLeft: 8 }}>The Still Pool</Text>
            </View>
            <Text style={{ color: "#BAE6FD", fontSize: 12.5, lineHeight: 18, marginTop: 6 }}>
              Still water in the Deep, faintly glowing. One drink — it stays until you take it.
            </Text>
            <View style={{ flexDirection: "row", marginTop: 10, gap: 8 }}>
              <Pressable
                onPress={() => handleDrinkPool("heal")}
                style={{ flex: 1, backgroundColor: "#0EA5E9", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12.5 }}>Drink — Full heal</Text>
              </Pressable>
              <Pressable
                onPress={() => handleDrinkPool("blessing")}
                style={{ flex: 1, backgroundColor: "rgba(56,189,248,.18)", borderRadius: 10, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "#38BDF8" }}
              >
                <Text style={{ color: "#E0F2FE", fontWeight: "800", fontSize: 12.5 }}>Drink — Forest blessing</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* the satchel — carried, never sold down here (v172):
            ore becomes coins only at the Mouth, up the shaft */}
        {mine && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 14, backgroundColor: PANEL, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(24,8,44,.6)" }}>
              <Text style={{ color: CREAM, fontWeight: "800", fontSize: 13, marginRight: 8 }}>Satchel</Text>
              {ORE_KINDS.map((k) => (
                <View key={k} style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
                  <OreGlyph kind={k} size={17} />
                  <Text style={{ color: CREAM, fontSize: 13, fontWeight: "700", marginLeft: 4 }}>× {mine.satchel[k]}</Text>
                  <Text style={{ color: DIM, fontSize: 10, marginLeft: 3 }}>@{ORE_PRICES[k]}</Text>
                </View>
              ))}
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() => router.back()}
                style={{ backgroundColor: "rgba(201,150,60,.25)", borderWidth: 1, borderColor: GOLD, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
              >
                <Text style={{ color: "#FDE68A", fontWeight: "800", fontSize: 12.5 }}>
                  Sell at the Mouth{haulWorth > 0 ? ` · ${formatCoins(haulWorth)}` : ""}
                </Text>
              </Pressable>
            </View>
            <Text style={{ color: bagCount >= bagCap ? "#FCA5A5" : DIM, fontSize: 12, textAlign: "center", marginTop: 10, fontWeight: bagCount >= bagCap ? "800" : "400" }}>
              {bagFor(mine.bagTier).name}: {bagCount} / {bagCap} pieces
              {bagCount >= bagCap ? " — full. Haul it up to the Mouth to sell." : ""}
            </Text>
            <Text style={{ color: DIM, fontSize: 12, textAlign: "center", marginTop: 6 }}>
              Faces mined today: {mine.minedToday} / {DAILY_FACE_CAP} · Your pick: {pickaxeFor(mine.pickTier).name}
              {heroHealth && effMax > 0 ? ` · Hero HP ${heroHealth.hp ?? effMax}/${effMax}` : ""}
            </Text>
            <Text style={{ color: DIM, fontSize: 12, textAlign: "center", marginTop: 6, paddingHorizontal: 40, lineHeight: 17 }}>
              Mined faces settle back over a few hours. And remember — prayer still runs this town. The mine just helps.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
