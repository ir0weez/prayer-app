// The Mine — the Descent (v168; warmth pass v169; danger v170;
// the Mouth v172; the Deep Descent v175; switchback descent v178).
//
// Through the cave mouth under the Great Peak — in out of the wild,
// lantern light on warm stone (the entrance shaft glows, v169: the
// cave should FEEL safe, a refuge, never a dungeon — and it has no
// name beyond "The Mine"): eight strata of ten levels each — Stone,
// Coal, Copper, Iron, Silver, Gold, Diamond, The Deep — eighty
// levels down, one dig wall at a time. Faces crack as you work them,
// break into ore for the satchel priced at the depth it broke, and
// settle back over a few hours — by timestamp, never by timer
// (lib/mountain settles on open). Breaking two faces on your deepest
// level cracks open the next; opened levels stay open and a trip
// starts at the deepest. The pickaxe ladder climbs Wood → Stone →
// Copper → Iron → Silver → Gold with coins, then Diamond behind
// prestige and the Crown Pick behind a Crown — bought at the Tool
// Shop in town (v170); the strip here only shows what he carries.
//
// Flames (v175): every block BROKEN costs one flame — the Dark
// Forest's energy, one shared daily pool (lib/forest-energy).
// Swings are free; at zero flames the breaking swing is refused and
// the face keeps its cracks. There is no daily face cap anymore —
// flames are the limiter. They trickle back one per hour and
// rekindle fully at midnight (v177), and the header carries the
// forest's own flame row so the pool is SEEN, not just counted:
// a break snuffs one flame right there, bonus flames burn gold.
//
// The haul (v172): the cave SELLS NOTHING — ore converts to coins
// only at the Mouth, up the shaft, where the satchel also banks its
// HAUL MULTIPLIER (the deepest stratum broken since the last sell).
// The satchel rides the carry ladder now (v175): Pockets at the
// top of the mountain, carts and wagons deeper in the purse. A
// cave-in spends the multiplier along with the buried ore.
// No emojis — SVG paper art and MaterialIcons only.
//
// Danger and reward (v170): the Gold stratum, Diamond, and the Deep
// are unstable — a cracked face there groans (dust, amber cracks)
// and can come down on the next hit: face lost, unsold satchel
// partly buried (a third with Braced Gloves), and the hero takes a
// real HP hit through lib/hero-health (a fifth of his strength, a
// tenth with Cave Boots; a fall that would drop him to zero wakes
// him at home at the defeat floor instead). Any face can hide a rich
// vein, revealed gold at the first crack — or glowing faintly
// before it, with the Miner's Lantern — and paying double; breaking
// Deep rock can bare the still pool: one drink, a full heal or a
// forest blessing till midnight. The Prospector's Charm finds an
// extra piece on one break in five.

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
  CAVE_IN_DAMAGE_PCT,
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
  loadForestEnergy,
  spendForestEnergy,
  type ForestEnergy,
} from "@/lib/forest-energy";
import { EnergyFlames, type SnuffState } from "@/components/energy-flames";
import { MineDescent } from "@/components/mine-descent";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import {
  BOOTS_CAVE_IN_DAMAGE_PCT,
  FACES_PER_LEVEL,
  MAX_LEVEL,
  MINE_STRATA,
  MINE_TITLE,
  ORE_KINDS,
  PICKAXES,
  bagFor,
  brokenSlotCount,
  canPickFace,
  effectiveHits,
  faceIndexFor,
  faceRumbles,
  faceStatus,
  formatHaulMultiplier,
  hasMiningGear,
  haulValue,
  isRichFace,
  levelForFace,
  loadMineState,
  mineTap,
  pickGateMet,
  pickaxeFor,
  satchelByKind,
  satchelCapacity,
  satchelCount,
  saveMineState,
  settleTinderboxBonus,
  spendPool,
  stratumForLevel,
  stratumIndexForLevel,
  stratumMultiplier,
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

const ORE_GLYPH_COLORS: Record<OreKind, [string, string]> = {
  stone: ["#9A9AA5", "#B4B4BE"],
  coal: ["#33333E", "#55555F"],
  copper: ["#D97E4A", "#E8A05C"],
  iron: ["#C96F3F", "#D97E4A"],
  silver: ["#C7CCD6", "#E8EEF7"],
  gold: ["#F2B33D", "#FBBF24"],
  diamond: ["#9BE8F5", "#CFF7FF"],
};

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
  const [main, light] = ORE_GLYPH_COLORS[kind];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="7,5 15,3.4 20,8.6 18.4,16.6 10,20 4.4,14.6" fill={main} />
      <Polygon points="7,5 12,9 10,20 4.4,14.6" fill={light} opacity={0.75} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* One rock face                                                       */
/* ------------------------------------------------------------------ */

/** Deterministic fleck spots per stratum family, in a 62x46 face box
 *  (the mockup's own layouts, nudged per slot so no two faces match). */
const FLECKS: Array<Array<[number, number]>> = [
  [[18, 20], [42, 32]],
  [[16, 12], [38, 30], [48, 14], [10, 34]],
  [[18, 14], [40, 28], [50, 12]],
  [[20, 12], [44, 30], [30, 36]],
  [[18, 20], [42, 32], [30, 14]],
  [[16, 12], [38, 30], [48, 14], [10, 34]],
  [[20, 12], [44, 30], [30, 36]],
  [[20, 12], [44, 30], [30, 36]],
];

function FaceArt({ stratumIndex, slot, status, hitsLeft, hitsMax, rich = false, richFaint = false, rumbling = false }: {
  stratumIndex: number;
  slot: number;
  status: "ready" | "cracked" | "resting";
  hitsLeft: number | null;
  hitsMax: number;
  /** A rich vein, revealed at the first crack: gold shimmer (v170). */
  rich?: boolean;
  /** The Miner's Lantern's tell: the vein glows BEFORE the crack —
   *  the same gold, fainter, no sparkle yet (v175). */
  richFaint?: boolean;
  /** A cracked face in an unstable stratum: dust and amber cracks (v170). */
  rumbling?: boolean;
}) {
  const stratum = MINE_STRATA[stratumIndex];
  const fleckColor = stratum.fleckColor;
  const gemFlecks = stratumIndex >= 6;
  const flecks = (FLECKS[stratumIndex] ?? []).map(([x, y], i) => [
    Math.min(56, Math.max(5, x + ((slot * 7 + i * 3) % 5) - 2)),
    Math.min(40, Math.max(5, y + ((slot * 5 + i * 2) % 5) - 2)),
  ] as [number, number]);
  const crackDepth = status === "cracked" ? (hitsLeft != null && hitsLeft <= Math.ceil(hitsMax / 2) ? 2 : 1) : 0;
  const crackColor = rumbling ? "#B45309" : "#4A3548";
  return (
    <Svg width={62} height={46} viewBox="0 0 62 46">
      <Rect x={1} y={1} width={60} height={44} rx={11} fill={status === "resting" ? "#5F4E47" : stratum.faceColor} />
      {(rich || richFaint) && status !== "resting" && (
        <>
          <Rect x={1} y={1} width={60} height={44} rx={11} fill="#F2B33D" opacity={richFaint ? 0.12 : 0.22} />
          <Rect x={1} y={1} width={60} height={44} rx={11} fill="none" stroke="#FDE68A" strokeWidth={1.6} opacity={richFaint ? 0.55 : 1} />
        </>
      )}
      {gemFlecks &&
        flecks.map(([x, y], i) => (
          <Path key={i} d={`M${x} ${y - 5} l3.4 4.6 -3.4 6 -3.4 -6 Z`} fill={fleckColor} opacity={status === "resting" ? 0.25 : 0.95} />
        ))}
      {!gemFlecks &&
        flecks.map(([x, y], i) =>
          stratumIndex <= 1 ? (
            <Circle key={i} cx={x} cy={y} r={2.2} fill={fleckColor} opacity={status === "resting" ? 0.25 : 0.8} />
          ) : (
            <Polygon key={i} points={`${x - 4},${y + 2} ${x + 1},${y - 3} ${x + 5},${y + 1} ${x},${y + 4}`} fill={fleckColor} opacity={status === "resting" ? 0.25 : 0.95} />
          )
        )}
      {stratumIndex === 5 && status !== "resting" && flecks.map(([x, y], i) => (
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

/** The decorative villager at work in the iron stratum (mockup
 *  dressing — presence only; mining is the hero's own taps, no job
 *  system). */
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
  // The level on the wall: a trip starts at the deepest opened
  // level (null = not chosen yet, follow the mine); wandering among
  // opened levels is free — by the switchback descent (v178), not
  // by arrows: the Descent button opens the shaft, and a tap on a
  // lit landing walks the hero there.
  const [viewLevel, setViewLevel] = useState<number | null>(null);
  const [descentOpen, setDescentOpen] = useState(false);
  // When a level cracks open, the descent opens with him standing
  // where he dug, and walks him down to the new landing (v178).
  const [descentAutoWalk, setDescentAutoWalk] = useState<number | null>(null);
  // The hero's own paper figure, for the descent (normal clothes —
  // no armor outside the forest, as ever).
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  // Forest energy — the flames (lib/forest-energy): the same daily
  // pool the Dark Forest fights on. One flame per block broken.
  const [flames, setFlames] = useState<ForestEnergy | null>(null);
  // The flame a break just spent, caught mid-snuff in the header row
  // (the forest's own mechanism, via components/energy-flames).
  const [snuff, setSnuff] = useState<SnuffState | null>(null);
  const clearSnuff = useCallback(() => setSnuff(null), []);
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
    const [m0, c, pState, crowns, ppl] = await Promise.all([
      loadMineState(),
      loadCoinsRecord(),
      loadPrestigeState(),
      loadPrestigeLevel(),
      prayedTodayPeople().catch(() => [] as PrayedPerson[]),
    ]);
    // The Tinderbox kindles its morning flames on the way in (v175).
    const m = await settleTinderboxBonus(m0).catch(() => m0);
    setMine(m);
    setCoins(c);
    setGates({ totalPrestiges: pState.totalPrestiges, crowns });
    setPeople(ppl);
    try {
      setPawn(await loadCustomPawn());
    } catch {}
    try {
      setFlames(await loadForestEnergy());
    } catch {}
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
      const stratum = stratumForLevel(levelForFace(faceIndex));
      void (async () => {
        // Flames (v175): read the shared pool fresh, and let the tap
        // refuse its breaking swing when the pool is dry. The spend
        // itself happens below, only on a break.
        let energy: ForestEnergy | null = null;
        try {
          energy = await loadForestEnergy();
          setFlames(energy);
        } catch {}
        const { state, outcome } = mineTap(mine, faceIndex, now, Math.random(), Math.random(), Math.random(), {
          flamesOk: energy ? energy.energy > 0 : true,
          charmRoll: Math.random(),
        });
        setMine(state);
        void saveMineState(state);
        if (outcome.kind === "full") {
          showToast("Your bag is full — haul it up to the Mouth.");
        } else if (outcome.kind === "noflames") {
          showToast("No flames left — one returns within the hour, all of them at midnight.");
        } else if (outcome.kind === "collapse") {
          // The hero takes the hit through the one HP store (v170):
          // a fifth of max — a tenth with Cave Boots (v175) — and a
          // hit that would drop him to zero wakes him at home at the
          // defeat floor instead — never worse.
          const buriedParts = ORE_KINDS.filter((k) => outcome.buried[k] > 0).map(
            (k) => `${outcome.buried[k]} ${k}`
          );
          let hpLine = "You scramble out to the lantern light.";
          if (heroHealth && effMax > 0) {
            const pct = hasMiningGear(mine, "boots") ? BOOTS_CAVE_IN_DAMAGE_PCT : CAVE_IN_DAMAGE_PCT;
            const hit = applyCaveInDamage(heroHealth, effMax, now, pct);
            setHeroHealth(hit.state);
            void saveHeroHealth(hit.state);
            hpLine = hit.wokeAtHome
              ? "Darkness — then home. You wake shaken but whole, at a whisper of strength. The mountain kept the rest."
              : `The fall costs you ${hit.damage} HP. You scramble out to the lantern light, digging done for now.`;
          }
          const msg =
            `The ${stratum.name} face came down.` +
            (buriedParts.length ? ` Buried from your satchel: ${buriedParts.join(", ")}.` : "") +
            (haulBefore > 1
              ? ` And the haul's ×${formatHaulMultiplier(haulBefore)} promise is buried with it — what survives sells at ×1.`
              : "") +
            ` ${hpLine}`;
          setCaveInMsg(msg);
          scrollRef.current?.scrollTo({ y: 0, animated: true });
          Alert.alert("Cave-in!", msg);
        } else if (outcome.kind === "broke") {
          // The break spends its flame from the shared pool (v175) —
          // and the spent flame snuffs in the header row (v177): the
          // tap-start load is the "from", the reload the "to".
          try {
            if (await spendForestEnergy()) {
              const after = await loadForestEnergy();
              setFlames(after);
              if (energy && after.energy < energy.energy) {
                setSnuff({ from: energy.energy, to: after.energy, key: Date.now(), long: after.energy === 0 });
              }
            }
          } catch {}
          const parts = ORE_KINDS.filter((k) => (outcome.yield[k] ?? 0) > 0).map(
            (k) => `+${outcome.yield[k]} ${k}`
          );
          showToast(
            (outcome.rich ? "A rich vein! " : "") +
              (parts.length ? parts.join("  ") : "The face crumbles") +
              (outcome.charmBonus ? " — the Charm finds one more." : "") +
              (outcome.levelOpened ? ` The rock gives way — Level ${outcome.levelOpened} opens below!` : "")
          );
          if (outcome.levelOpened) {
            // The descent opens and walks him down to the new
            // landing (v178) — the way down is a place, and a fresh
            // level deserves the walk, not just a toast.
            setDescentAutoWalk(outcome.levelOpened);
            setDescentOpen(true);
          }
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
            `The ${stratum.name} stratum needs the ${pickaxeFor(outcome.requiredPick).name}. Better rock takes a better pick — picks are sold at the Tool Shop in town.`
          );
        } else if (outcome.kind === "resting") {
          Alert.alert(
            "Still settling",
            `This face is filling back in, the way the mountain heals. Whole again in about ${formatCooldown(Math.max(0, outcome.readyAt - now))}.`
          );
        }
      })();
    },
    [mine, heroHealth, effMax, handleDrinkPool, showToast]
  );

  const dressingMiner = pickPeople(people, "mine|dressing", 1)[0];
  const bagCount = mine ? satchelCount(mine.satchel) : 0;
  const bagCap = mine ? satchelCapacity(mine) : 0;
  const haulWorth = mine ? haulValue(mine) : 0;
  const kinds = mine ? satchelByKind(mine.satchel) : null;
  const view = mine ? Math.min(viewLevel ?? mine.deepestLevel, mine.deepestLevel) : 1;
  const viewStratum = stratumForLevel(view);
  const viewStratumIndex = stratumIndexForLevel(view);
  const isFrontier = mine != null && view === mine.deepestLevel && mine.deepestLevel < MAX_LEVEL;
  const frontierBroken = mine ? brokenSlotCount(mine, mine.deepestLevel) : 0;
  const hasLantern = mine ? hasMiningGear(mine, "lantern") : false;
  const poolLevel = mine && mine.poolFace != null ? levelForFace(mine.poolFace) : null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="terrain" iconColor={GOLD} title={MINE_TITLE} coins={coins} bg={BG} textColor={CREAM} />
      {mine && (
        <View style={[{ marginHorizontal: 16, marginBottom: 10, backgroundColor: "#3B2C14", borderColor: GOLD, borderWidth: 1, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 12 }, isPaper ? skinTokens.cardShadow : null]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="trending-up" size={16} color="#FDE68A" />
            <Text style={{ color: "#FDE68A", fontWeight: "800", fontSize: 13, marginLeft: 7 }}>
              Haul ×{formatHaulMultiplier(mine.haulMultiplier)}
            </Text>
            <MaterialIcons name="local-fire-department" size={15} color={flames && flames.energy <= 0 ? "#FCA5A5" : "#FB923C"} style={{ marginLeft: 12 }} />
            <Text style={{ color: flames && flames.energy <= 0 ? "#FCA5A5" : "#FDE68A", fontWeight: "800", fontSize: 13, marginLeft: 4 }}>
              {flames ? flames.energy : "–"}
            </Text>
            <Text style={{ color: DIM, fontSize: 11.5, marginLeft: 8, flex: 1 }}>
              flames — one per block broken, shared with the forest
            </Text>
            <Text style={{ color: bagCount >= bagCap ? "#FCA5A5" : DIM, fontWeight: "800", fontSize: 12 }}>
              {bagCount}/{bagCap}
            </Text>
          </View>
          {/* the flames themselves (v177): one living flame per point
              of strength, the forest's row brought underground. A
              break snuffs one; bonus flames burn pale gold. */}
          {flames && (
            <View style={{ marginTop: 7, alignItems: "center" }}>
              <EnergyFlames energy={flames.energy} max={flames.max} cap={24} size={14} snuff={snuff} onSnuffDone={clearSnuff} bonusTint />
            </View>
          )}
        </View>
      )}
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={{ color: DIM, fontSize: 13, lineHeight: 19, marginHorizontal: 16, marginBottom: 12 }}>
          Come in out of the wild — the lanterns are lit, the stone is warm, and the rock provides. Eight
          strata, ten levels each, eighty down: stone near the top, diamonds sleeping in the Deep, and every
          level paying more than the one above it. Break two faces on your deepest level and the way down
          opens. But mind the deep strata: gold rock and below can groan, and groaning rock can fall — a
          cave-in buries unsold ore and costs the hero dear. What glitters down there is real, too.
        </Text>

        {toast && (
          <View style={[{ marginHorizontal: 16, marginBottom: 10, backgroundColor: "#3B2C14", borderColor: GOLD, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center" }, isPaper ? skinTokens.cardShadow : null]}>
            <Text style={{ color: "#FDE68A", fontWeight: "800", fontSize: 14, textAlign: "center" }}>{toast}</Text>
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
          <>
            {/* the level header — where he stands, and the way
                through the mountain: the Descent opens the shaft */}
            <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: CREAM, fontWeight: "900", fontSize: 17 }}>
                  Level {view} · {viewStratum.name}
                </Text>
                <Text style={{ color: DIM, fontSize: 11.5, marginTop: 1 }}>
                  {mine.deepestLevel >= MAX_LEVEL
                    ? "The bottom of the mountain — every level stands open."
                    : `Deepest opened: Level ${mine.deepestLevel} of ${MAX_LEVEL}`}
                </Text>
              </View>
              <Pressable
                onPress={() => { setDescentAutoWalk(null); setDescentOpen(true); }}
                style={{ backgroundColor: PANEL, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "rgba(201,150,60,.45)", flexDirection: "row", alignItems: "center" }}
              >
                <MaterialIcons name="route" size={16} color="#FDE68A" />
                <Text style={{ color: "#FDE68A", fontWeight: "800", fontSize: 12.5, marginLeft: 6 }}>The Descent</Text>
              </Pressable>
            </View>
            {isFrontier && (
              <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 10 }}>
                {[0, 1].map((pip) => (
                  <View
                    key={pip}
                    style={{ width: 10, height: 10, borderRadius: 5, marginRight: 6, backgroundColor: frontierBroken > pip ? GOLD : "rgba(255,255,255,.18)", borderWidth: 1, borderColor: GOLD }}
                  />
                ))}
                <Text style={{ color: DIM, fontSize: 12 }}>
                  {frontierBroken >= 2
                    ? `Level ${mine.deepestLevel + 1} has opened below.`
                    : `Break ${2 - frontierBroken} ${frontierBroken === 1 ? "more face" : "faces"} on this level to open Level ${mine.deepestLevel + 1}.`}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: "row", marginHorizontal: 16 }}>
              {/* the dig wall — one level at a time */}
              <View style={{ flex: 1, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(24,8,44,.6)" }}>
                {/* surface strip — grass and the shaft you came down.
                    The shaft mouth carries the cave's welcome (v169):
                    warm light pooled where you step in, breathing on
                    the kit's sine — coming in out of the wild, not
                    descending into a dungeon. Shown on the first
                    level, where the shaft actually lands. */}
                {view === 1 ? (
                  <View style={{ height: 20, backgroundColor: "#7CB35C", position: "relative" }}>
                    <View style={{ position: "absolute", left: "42%", top: 8, width: 34, height: 12, backgroundColor: "#241430" }} />
                    <PaperPulse duration={2800} min={0.6} max={1} style={{ position: "absolute", left: "42%", marginLeft: -14, top: -16 }}>
                      <PaperGlowDisc size={62} color="#FFB84D" opacity={0.65} />
                    </PaperPulse>
                    {/* two lantern dots keeping the shaft mouth */}
                    <View style={{ position: "absolute", left: "42%", marginLeft: -5, top: 9, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFD98A" }} />
                    <View style={{ position: "absolute", left: "42%", marginLeft: 34, top: 9, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFD98A" }} />
                  </View>
                ) : (
                  <View style={{ height: 20, backgroundColor: "#241430", position: "relative" }}>
                    <View style={{ position: "absolute", left: "42%", top: 0, width: 34, height: 20, backgroundColor: "#17101F" }} />
                    <View style={{ position: "absolute", left: "42%", marginLeft: -5, top: 7, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFD98A" }} />
                    <View style={{ position: "absolute", left: "42%", marginLeft: 34, top: 7, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFD98A" }} />
                  </View>
                )}
                {(() => {
                  const locked = !canPickFace(mine, faceIndexFor(view, 0));
                  return (
                    <View style={{ backgroundColor: viewStratum.color, height: 118, position: "relative", justifyContent: "center" }}>
                      {/* rotated stratum label — with the stratum's haul
                          rate (v172): this is what working this depth
                          does to everything in the bag */}
                      <View style={{ position: "absolute", left: -29, top: 50, width: 76, alignItems: "center", transform: [{ rotate: "-90deg" }] }}>
                        <Text style={{ color: CREAM, fontSize: 9, fontWeight: "bold", letterSpacing: 2.2, opacity: 0.92 }}>{viewStratum.name.toUpperCase()} ×{formatHaulMultiplier(stratumMultiplier(viewStratumIndex))}</Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-evenly", marginLeft: 22, marginRight: viewStratumIndex === 3 && dressingMiner ? 30 : 4 }}>
                        {Array.from({ length: FACES_PER_LEVEL }).map((_, slot) => {
                          const faceIndex = faceIndexFor(view, slot);
                          const face = mine.faces[faceIndex];
                          const status = faceStatus(mine, faceIndex);
                          const isPool = mine.poolFace === faceIndex;
                          const richToday = isRichFace(faceIndex, mine.day);
                          return (
                            <Pressable key={faceIndex} onPress={() => handleTapFace(faceIndex)} style={{ opacity: locked && !isPool ? 0.55 : 1 }}>
                              <View style={{ position: "relative", width: 62, height: 46 }}>
                                <View style={{ position: "absolute", left: 2.5, top: 3, width: 62, height: 46, borderRadius: 12, backgroundColor: "rgba(24,8,44,.3)" }} />
                                {isPool ? (
                                  <PoolArt />
                                ) : (
                                  <FaceArt
                                    stratumIndex={viewStratumIndex}
                                    slot={slot}
                                    status={status}
                                    hitsLeft={face.hitsLeft}
                                    hitsMax={effectiveHits(viewStratum, mine.pickTier)}
                                    rich={status === "cracked" && richToday}
                                    richFaint={hasLantern && status === "ready" && richToday}
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
                      {viewStratumIndex === 3 && dressingMiner && (
                        <View pointerEvents="none" style={{ position: "absolute", right: 2, bottom: 2 }}>
                          <DressingMiner person={dressingMiner} />
                        </View>
                      )}
                    </View>
                  );
                })()}
                {/* the way down, drawn where it opens */}
                <View style={{ backgroundColor: "#17101F", paddingVertical: 7, alignItems: "center" }}>
                  <Text style={{ color: DIM, fontSize: 10.5, letterSpacing: 1.5 }}>
                    {view < mine.deepestLevel
                      ? `LEVEL ${view + 1} WAITS BELOW`
                      : mine.deepestLevel >= MAX_LEVEL
                        ? "THE BOTTOM OF THE MOUNTAIN"
                        : `LEVEL ${mine.deepestLevel + 1} — UNOPENED ROCK`}
                  </Text>
                </View>
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
                  Better picks are sold at the Tool Shop. Deeper strata need the pick named for the rock above them.
                </Text>
              </View>
            </View>
          </>
        )}

        {/* the still pool — showing in the Deep until drunk (v170) */}
        {mine && mine.poolFace != null && (
          <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: "#16263F", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "#38BDF8" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialIcons name="water-drop" size={20} color="#7DD3FC" />
              <Text style={{ color: "#E0F2FE", fontWeight: "800", fontSize: 14, marginLeft: 8 }}>The Still Pool</Text>
            </View>
            <Text style={{ color: "#BAE6FD", fontSize: 12.5, lineHeight: 18, marginTop: 6 }}>
              Still water in the Deep{poolLevel ? `, showing on Level ${poolLevel}` : ""}, faintly glowing. One drink — it stays until you take it.
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
        {mine && kinds && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginHorizontal: 16, marginTop: 14, backgroundColor: PANEL, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(24,8,44,.6)" }}>
              <Text style={{ color: CREAM, fontWeight: "800", fontSize: 13, marginRight: 8 }}>Satchel</Text>
              {ORE_KINDS.filter((k) => kinds[k] > 0).map((k) => (
                <View key={k} style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
                  <OreGlyph kind={k} size={17} />
                  <Text style={{ color: CREAM, fontSize: 13, fontWeight: "700", marginLeft: 4 }}>× {kinds[k]}</Text>
                </View>
              ))}
              {bagCount === 0 && <Text style={{ color: DIM, fontSize: 12.5 }}>Empty — the rock provides.</Text>}
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
              Faces broken today: {mine.minedToday} · Your pick: {pickaxeFor(mine.pickTier).name}
              {heroHealth && effMax > 0 ? ` · Hero HP ${heroHealth.hp ?? effMax}/${effMax}` : ""}
              {flames ? ` · Flames ${flames.energy}/${flames.max}` : ""}
            </Text>
            <Text style={{ color: DIM, fontSize: 12, textAlign: "center", marginTop: 6, paddingHorizontal: 40, lineHeight: 17 }}>
              Mined faces settle back over a few hours. And remember — prayer still runs this town. The mine just helps.
            </Text>
          </>
        )}
      </ScrollView>
      {/* the switchback descent (v178): level navigation as a place */}
      {descentOpen && mine && (
        <MineDescent
          deepestLevel={mine.deepestLevel}
          currentLevel={view}
          pawn={pawn}
          autoWalkTo={descentAutoWalk}
          onArrive={(level) => {
            setViewLevel(level);
            setDescentOpen(false);
            setDescentAutoWalk(null);
          }}
          onClose={() => {
            setDescentOpen(false);
            setDescentAutoWalk(null);
          }}
        />
      )}
    </View>
  );
}
