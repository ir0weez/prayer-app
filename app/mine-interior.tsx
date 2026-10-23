// The Mine — one cave (v168; warmth pass v169; danger v170;
// the Mouth v172; the Deep Descent v175; switchback descent v178;
// ONE CAVE v191; the satchel heads-up v198; ores on the map v199).
//
// Through the cave mouth under the Great Peak — in out of the wild,
// lantern light on warm stone (the entrance shaft glows, v169: the
// cave should FEEL safe, a refuge, never a dungeon — and it has no
// name beyond "The Mine"): eight strata of ten levels each — Stone,
// Coal, Copper, Iron, Silver, Gold, Diamond, The Deep — eighty
// levels down. The switchback shaft IS the cave (v191, his
// correction: the mockup's ore screen and zigzag were always the
// same screen) — and the mountain is its dig wall (v199, his
// correction of the gallery: "the ores themselves would be on the
// zigzag map, not just a little window that opens"): every opened
// level wears its three faces set into the rock beside its
// landing, dug right where they sit, no panel, no second screen,
// nothing to dismiss. Faces crack as you work them,
// break into ore for the satchel priced at the depth it broke, and
// settle back over a few hours — by timestamp, never by timer
// (lib/mountain settles on open). Breaking two faces on your deepest
// level cracks open the next; opened levels stay open and a trip
// starts at the deepest. The pickaxe ladder climbs Wood → Stone →
// Copper → Iron → Silver → Gold with coins, then Diamond behind
// prestige and the Crown Pick behind a Crown — bought at the Tool
// Shop in town (v170); the rail here (in the header now, v199)
// only shows what he carries.
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
// The satchel heads-up (v198): a full carrier refused the swing in
// silence — a toast at the top of the screen, gone in seconds,
// while his eyes were on the wall. Now the load speaks where he
// looks (lib/mountain's satchelLoad): the count readouts warm to
// amber in the last stretch of room, and the moment the satchel is
// full the faces sit quiet and a plain line says so — in its new
// home (v199) directly under the faces of the level he stands on,
// in the shaft itself. Sell at the Mouth to keep digging. A
// heads-up only: no button, no shortcut; the selling still
// happens up the shaft, as ever.
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
import Svg, { Path, Polygon } from "react-native-svg";
import { InteriorHeader } from "@/components/interior-shell";
import {
  formatCoins,
  loadCoinsRecord,
  type HometownCoins,
} from "@/lib/hometown";
import { loadPrestigeLevel, loadPrestigeState } from "@/lib/prestige";
import { formatCooldown } from "@/lib/gathering-places";
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
import type { MineFaceView, MineLevelFaces } from "@/components/mine-faces";
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
  faceReadyAt,
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
  satchelLoad,
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

/* The faces themselves — their art, and the wall each opened level
   wears in the shaft — live in components/mine-faces (v199): the
   mountain is the dig wall now, and the shaft scene carries them. */

/* ------------------------------------------------------------------ */
/* The screen                                                          */
/* ------------------------------------------------------------------ */

export default function MineInteriorScreen() {
  const router = useRouter();
  // Paper skin (v174): chrome bars gain the kit shadow; cave art untouched.
  const { isSkinned, tokens: skinTokens } = useSkin();
  const [mine, setMine] = useState<MineState | null>(null);
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [gates, setGates] = useState<MineGates>({ totalPrestiges: 0, crowns: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The level the hero stands on: a trip starts at the deepest
  // opened level (null = not chosen yet, follow the mine); wandering
  // among opened levels is free — by walking the switchback shaft
  // itself (v178, merged into the one cave screen v191): a tap on a
  // lit landing walks the hero there, and he digs where he stands —
  // every opened level's faces are in the wall beside him (v199).
  const [viewLevel, setViewLevel] = useState<number | null>(null);
  // When a level cracks open, the shaft walks him down to the new
  // landing unasked (v178) — in place now, no overlay (v191).
  const [descentAutoWalk, setDescentAutoWalk] = useState<number | null>(null);
  // Where the shaft begins inside this screen's scroll view, so a
  // walk can ask the scroll to follow the hero (v191).
  const shaftTopRef = useRef(0);
  const followHero = useCallback((shaftY: number, animated: boolean) => {
    scrollRef.current?.scrollTo({ y: Math.max(0, shaftTopRef.current + shaftY), animated });
  }, []);
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
    const [m0, c, pState, crowns] = await Promise.all([
      loadMineState(),
      loadCoinsRecord(),
      loadPrestigeState(),
      loadPrestigeLevel(),
    ]);
    // The Tinderbox kindles its morning flames on the way in (v175).
    const m = await settleTinderboxBonus(m0).catch(() => m0);
    setMine(m);
    setCoins(c);
    setGates({ totalPrestiges: pState.totalPrestiges, crowns });
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
            // The shaft walks him down to the new landing (v178) —
            // in place in the one cave screen (v191): the way down
            // is this place, and a fresh level deserves the walk,
            // not just a toast.
            setDescentAutoWalk(outcome.levelOpened);
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

  // The tap the shaft's walls call (v199): a stable dispatcher to
  // the freshest handleTapFace, so a memoized wall that skipped a
  // repaint still digs against the latest mine — never a stale one.
  const tapFaceRef = useRef(handleTapFace);
  tapFaceRef.current = handleTapFace;
  const dispatchTapFace = useCallback((faceIndex: number) => {
    tapFaceRef.current(faceIndex);
  }, []);

  // A walk finished: he stands at the new level (stable, so the
  // shaft's bands can stay memoized across digs).
  const handleArrive = useCallback((level: number) => {
    setViewLevel(level);
    setDescentAutoWalk(null);
  }, []);

  const bagCount = mine ? satchelCount(mine.satchel) : 0;
  const bagCap = mine ? satchelCapacity(mine) : 0;
  // The satchel's three states (v198): drives the readouts' warning
  // ink, the faces' quiet, and the full line under his faces (v199).
  const bagLoad = mine ? satchelLoad(mine) : "room";
  const haulWorth = mine ? haulValue(mine) : 0;
  const kinds = mine ? satchelByKind(mine.satchel) : null;
  const view = mine ? Math.min(viewLevel ?? mine.deepestLevel, mine.deepestLevel) : 1;
  const viewStratum = stratumForLevel(view);
  const viewStratumIndex = stratumIndexForLevel(view);
  const frontierBroken = mine ? brokenSlotCount(mine, mine.deepestLevel) : 0;
  const hasLantern = mine ? hasMiningGear(mine, "lantern") : false;
  const poolLevel = mine && mine.poolFace != null ? levelForFace(mine.poolFace) : null;

  /** Every opened level's faces, as the shaft wears them (v199):
   *  the same readings the gallery's wall used to give for one
   *  level — status, cracks, the rich vein's gold (revealed, or
   *  lantern-faint), the rumble, the pool, and a resting face's
   *  way back counted from its timestamp — now built for every
   *  level he has opened, each with a key of its own states so the
   *  shaft repaints only the wall that changed. Unopened levels
   *  get no entry: dark rock shows no faces. */
  const levelFaces: Array<{ data: MineLevelFaces; key: string }> = [];
  if (mine) {
    const nowMs = Date.now();
    for (let level = 1; level <= mine.deepestLevel; level++) {
      const stratum = stratumForLevel(level);
      const lockedLevel = !canPickFace(mine, faceIndexFor(level, 0));
      const faces: MineFaceView[] = [];
      for (let slot = 0; slot < FACES_PER_LEVEL; slot++) {
        const faceIndex = faceIndexFor(level, slot);
        const status = faceStatus(mine, faceIndex);
        const richToday = isRichFace(faceIndex, mine.day);
        const readyAt = status === "resting" ? faceReadyAt(mine.faces[faceIndex], faceIndex) : null;
        faces.push({
          status,
          hitsLeft: mine.faces[faceIndex].hitsLeft,
          hitsMax: effectiveHits(stratum, mine.pickTier),
          rich: status === "cracked" && richToday,
          richFaint: hasLantern && status === "ready" && richToday,
          rumbling: faceRumbles(mine, faceIndex),
          isPool: mine.poolFace === faceIndex,
          restMs: readyAt != null ? Math.max(0, readyAt - nowMs) : null,
        });
      }
      const data: MineLevelFaces = {
        level,
        stratumIndex: stratumIndexForLevel(level),
        locked: lockedLevel,
        faces,
      };
      levelFaces.push({
        data,
        key: [
          lockedLevel ? "locked" : "open",
          ...faces.map(
            (f) =>
              `${f.status}:${f.hitsLeft ?? "-"}:${f.isPool ? "pool" : ""}${f.rich ? "rich" : ""}${f.richFaint ? "faint" : ""}${f.rumbling ? "rumble" : ""}:${f.restMs ?? "-"}`
          ),
        ].join("|"),
      });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="terrain" iconColor={GOLD} title={MINE_TITLE} coins={coins} bg={BG} textColor={CREAM} />
      {mine && (
        <View style={[{ marginHorizontal: 16, marginBottom: 10, backgroundColor: "#3B2C14", borderColor: GOLD, borderWidth: 1, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 12 }, isSkinned ? skinTokens.cardShadow : null]}>
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
            <Text style={{ color: bagLoad === "full" ? "#FCA5A5" : bagLoad === "nearly" ? "#FB923C" : DIM, fontWeight: "800", fontSize: 12 }}>
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
      {mine && (
        <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
          {/* where he stands (v199): the gallery's header, moved to
              the screen's own header — the level he is looking at,
              how deep the mountain stands open, and what working
              this depth does to everything in the bag (the rate the
              gallery's wall used to carry rotated at its edge) */}
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <Text style={{ color: CREAM, fontWeight: "900", fontSize: 15 }}>
              Level {view} · {viewStratum.name}
            </Text>
            <Text style={{ color: DIM, fontSize: 11.5 }}>
              {mine.deepestLevel >= MAX_LEVEL
                ? "Every level stands open"
                : `Deepest opened: Level ${mine.deepestLevel} of ${MAX_LEVEL}`}
            </Text>
          </View>
          <Text style={{ color: DIM, fontSize: 11.5, marginTop: 2 }}>
            Pieces broken here are priced ×{formatHaulMultiplier(stratumMultiplier(viewStratumIndex))} at the Mouth.
            {view < mine.deepestLevel ? ` The frontier is Level ${mine.deepestLevel}, deeper down.` : ""}
          </Text>
          {/* the pickaxe rail — STATUS ONLY (v170): picks are bought
              at the Tool Shop in town; the rail just shows what the
              hero carries. In the header since v199: the gallery
              panel that used to carry it is gone, and the rail
              stays in reach while he digs, wherever he stands. */}
          <Text style={{ color: DIM, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 10, marginBottom: 5 }}>
            PICKAXES — SOLD AT THE TOOL SHOP
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "center", gap: 8 }}>
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
                        `Picks are tools, and tools are sold at the Tool Shop in town. The ${pick.name} waits there${pick.cost > 0 ? ` for ${formatCoins(pick.cost)} coins` : ""}. This rail only shows what you carry.`
                      );
                    }
                  }}
                  style={{
                    width: 62,
                    height: 60,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: current ? "rgba(201,150,60,.22)" : "rgba(255,255,255,.05)",
                    borderWidth: current ? 1 : 0,
                    borderColor: GOLD,
                    opacity: !owned && !isNext && !gateMet ? 0.65 : 1,
                  }}
                >
                  <PickIcon color={pick.color} size={19} />
                  <Text style={{ color: CREAM, fontSize: 9.5, fontWeight: "700", marginTop: 3 }} numberOfLines={1}>
                    {pick.name.replace(" Pick", "")}
                  </Text>
                  {current ? (
                    <Text style={{ color: "#FDE68A", fontSize: 8.5, fontWeight: "800", marginTop: 1 }}>Yours</Text>
                  ) : owned ? (
                    <Text style={{ color: DIM, fontSize: 8.5, marginTop: 1 }}>Owned</Text>
                  ) : pick.gate !== "none" && !gateMet ? (
                    <Text style={{ color: DIM, fontSize: 8.5, marginTop: 1 }}>{pick.gate === "crown" ? "Crown" : "Prestige"}</Text>
                  ) : (
                    <Text style={{ color: "#FDE68A", fontSize: 8.5, fontWeight: "700", marginTop: 1 }}>Tool Shop</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
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
          <View style={[{ marginHorizontal: 16, marginBottom: 10, backgroundColor: "#3B2C14", borderColor: GOLD, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center" }, isSkinned ? skinTokens.cardShadow : null]}>
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
            {/* ONE CAVE (v191), ORES ON THE MAP (v199): the shaft is
                the screen, and the mountain is its dig wall. Its
                heading, then the switchbacks themselves — every
                opened level's faces set in the rock beside its
                landing. There is no separate dig screen, no overlay,
                and no panel that opens: the ore and the zigzag are
                the same screen, as the mockup always showed. */}
            <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
              <Text style={{ color: CREAM, fontWeight: "900", fontSize: 17 }}>The Descent</Text>
              <Text style={{ color: DIM, fontSize: 11.5, marginTop: 1 }}>
                Level {mine.deepestLevel} of {MAX_LEVEL} stands open · tap a lit landing to walk there — every opened level's faces are in the rock beside it
              </Text>
            </View>
            <View
              onLayout={(e) => {
                shaftTopRef.current = e.nativeEvent.layout.y;
              }}
            >
              <MineDescent
                deepestLevel={mine.deepestLevel}
                currentLevel={view}
                pawn={pawn}
                autoWalkTo={descentAutoWalk}
                bagLoad={bagLoad}
                levelFaces={levelFaces}
                frontierBroken={frontierBroken}
                onTapFace={dispatchTapFace}
                onArrive={handleArrive}
                onFollowHero={followHero}
              />
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
            <Text style={{ color: bagLoad === "full" ? "#FCA5A5" : bagLoad === "nearly" ? "#FB923C" : DIM, fontSize: 12, textAlign: "center", marginTop: 10, fontWeight: bagLoad === "room" ? "400" : "800" }}>
              {bagFor(mine.bagTier).name}: {bagCount} / {bagCap} pieces
              {bagLoad === "full" ? " — full. Haul it up to the Mouth to sell." : bagLoad === "nearly" ? " — nearly full." : ""}
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
    </View>
  );
}
