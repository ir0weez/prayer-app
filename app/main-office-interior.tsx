// Main Office interior (School Campus): the campus front desk — and the
// town hall for the prayer lights. Its heart is the VILLAGER ROSTER: every
// light prayed for today, with their status in plain words, an Assign
// control that drives the exact same villager-work APIs as tapping the
// villager on the map, and a Collect button that pays finished shifts out
// exactly like collecting on the map (scaled reward + banked restock box
// bonus, Bloodmoon Badge blessing included).
//
// The roster stays live while open: state is re-read from the shared
// storage keys on focus and every few seconds, and due shifts are ticked
// to "done" (and saved) just like the town map's own work tick — so a
// shift that ends while you watch flips to Collect on its own.
//
// The room grows with level: L1 a front desk and a plant, L2 filing
// cabinets and a wall clock join, L3 a conference table for planning the
// town's work. "File the Paperwork" is the office's own 1-hour action.
// The desk bell rings (try it). The roster plates are animated — see
// components/roster-board.tsx for the board's choreography.
// No emojis — SVG art and MaterialIcons only.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Modal, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from "react-native-svg";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { getTimeOfDay } from "@/lib/daynight";
import {
  MAP_UNLOCKED_KEY,
  TOWN_STORAGE_KEY,
  emptyTownState,
  loadMissions,
  parseTown,
  parseUnlockedMaps,
  prayedTodayPeople,
  scaledCoins,
  scaledXP,
  type FieldMission,
  type PlacedBuilding,
  type PrayedPerson,
} from "@/lib/hometown";
import {
  settleAndSaveVillagerLocations,
  type VillagerLocations,
} from "@/lib/villager-locations";
import {
  WORK_KINDS,
  collectWorkAssignment,
  collectWorkAssignments,
  createWorkAssignment,
  loadVillagerWorkState,
  personHasActiveWork,
  saveVillagerWorkState,
  tickWorkAssignments,
  type VillagerWorkAssignment,
  type WorkKind,
} from "@/lib/villager-work";
import { loadVillagerMissionState, type VillagerMission } from "@/lib/villager-missions";
import {
  buildRosterRows,
  canAssignRow,
  collectAllTotalCoins,
  collectPayoutCoins,
  collectableRows,
  jobOptionsFor,
  rosterSummary,
  rosterSummaryText,
  showCollectAll,
  workSiteFor,
  type RosterRow,
} from "@/lib/villager-roster";
import { refreshBadgeCache } from "@/lib/badges";
import { RosterRowCard } from "@/components/roster-board";
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

const BG = "#F7F4EE";
const SLATE = "#334155";
const SLATE_DARK = "#1E293B";
const WOOD = "#A9743F";
const WOOD_DARK = "#6B4A2F";
const AMBER = "#B45309";
const GOLD = "#F59E0B";
const TEXT_DIM = "#A08B6D";

const STATUS_COLORS: Record<RosterRow["status"], string> = {
  idle: "#059669",
  collect: "#B45309",
  request: "#BE3455",
  working: "#2563EB",
  mission: "#7C3AED",
  sleeping: "#78716C",
};

/** Coin totals with thousands separators, always to the cent. */
const formatCoinTotal = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PAPERWORK_KEY = "prayercircle.interior.main-office.paperwork.v1";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const ACTION_COINS: Record<1 | 2 | 3, number> = { 1: 14, 2: 26, 3: 44 };
const ACTION_XP: Record<1 | 2 | 3, number> = { 1: 7, 2: 13, 3: 20 };

/** The front desk: counter, name plate, service bell, a stack of papers. */
function FrontDesk() {
  return (
    <Svg width={190} height={74} viewBox="0 0 190 74">
      {/* counter top */}
      <Rect x={4} y={26} width={182} height={8} rx={3} fill={WOOD_DARK} />
      {/* counter front with panels */}
      <Rect x={10} y={34} width={170} height={36} rx={3} fill={WOOD} />
      <Rect x={22} y={42} width={40} height={20} rx={2} fill="none" stroke={WOOD_DARK} strokeWidth={2} />
      <Rect x={75} y={42} width={40} height={20} rx={2} fill="none" stroke={WOOD_DARK} strokeWidth={2} />
      <Rect x={128} y={42} width={40} height={20} rx={2} fill="none" stroke={WOOD_DARK} strokeWidth={2} />
      {/* name plate */}
      <Rect x={78} y={16} width={34} height={10} rx={2} fill="#FDE68A" stroke={WOOD_DARK} strokeWidth={1.4} />
      {/* the service bell lives in DeskBell below — it's tappable */}
      {/* paper stack */}
      <Rect x={30} y={18} width={22} height={3.4} fill="#FFFFFF" stroke="#CBD5E1" />
      <Rect x={32} y={21.5} width={22} height={3.4} fill="#F8FAFC" stroke="#CBD5E1" />
    </Svg>
  );
}

/** The desk bell, sitting on the counter where FrontDesk leaves a space
 *  for it. Pure delight, no function: a tap swings it through a decaying
 *  sine wobble (about 600ms) while a gold ring flashes — the "ding". */
function DeskBell() {
  const swing = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const ringingRef = useRef(false);
  const ringIt = () => {
    if (ringingRef.current) return;
    ringingRef.current = true;
    swing.setValue(0);
    ring.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(swing, { toValue: 14, duration: 90, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.timing(swing, { toValue: -10, duration: 140, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(swing, { toValue: 6, duration: 140, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(swing, { toValue: -3, duration: 120, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(swing, { toValue: 0, duration: 130, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
      Animated.timing(ring, { toValue: 1, duration: 480, easing: Easing.out(Easing.sin), useNativeDriver: true }),
    ]).start(() => {
      ringingRef.current = false;
    });
  };
  const rotate = swing.interpolate({ inputRange: [-14, 14], outputRange: ["-14deg", "14deg"] });
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.6] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.85, 0] });
  const bellFlash = ring.interpolate({ inputRange: [0, 0.18, 0.45, 1], outputRange: [1, 1.14, 1, 1] });
  return (
    <Pressable
      onPress={ringIt}
      hitSlop={10}
      accessibilityLabel="Ring the desk bell"
      style={{ position: "absolute", left: 122, top: -3, width: 36, height: 32 }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 1,
          top: 0,
          width: 34,
          height: 30,
          borderRadius: 17,
          borderWidth: 2,
          borderColor: GOLD,
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }}
      />
      <Animated.View style={{ transform: [{ rotate }, { scale: bellFlash }] }}>
        <Svg width={36} height={32} viewBox="0 0 36 32">
          <Ellipse cx={18} cy={27} rx={11} ry={3.4} fill="#94A3B8" />
          <Path d="M7 26 C7 16 11 9 18 9 C25 9 29 16 29 26 Z" fill="#CBD5E1" stroke="#94A3B8" strokeWidth={1.4} />
          <Circle cx={18} cy={7} r={3} fill="#94A3B8" />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

/** A filing cabinet (L2+): three drawers with label plates. */
function FilingCabinet() {
  return (
    <Svg width={52} height={84} viewBox="0 0 52 84">
      <Rect x={3} y={3} width={46} height={78} rx={3} fill="#94A3B8" />
      {[0, 1, 2].map((i) => (
        <G key={i}>
          <Rect x={8} y={9 + i * 24} width={36} height={19} rx={2} fill="#CBD5E1" />
          <Rect x={17} y={12 + i * 24} width={18} height={5} rx={1.4} fill="#F8FAFC" />
          <Rect x={21} y={21 + i * 24} width={10} height={3.4} rx={1.7} fill="#64748B" />
        </G>
      ))}
    </Svg>
  );
}

/** A potted plant for the office corners. */
function OfficePlant({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 40 50">
      <Ellipse cx={20} cy={14} rx={5} ry={11} fill="#16A34A" />
      <Ellipse cx={9} cy={20} rx={4.4} ry={9} fill="#22C55E" transform="rotate(-24 9 20)" />
      <Ellipse cx={31} cy={20} rx={4.4} ry={9} fill="#15803D" transform="rotate(24 31 20)" />
      <Rect x={11} y={30} width={18} height={15} rx={2.4} fill="#B45309" />
      <Rect x={9} y={28} width={22} height={4.4} rx={2} fill="#92400E" />
    </Svg>
  );
}

/** A wall clock (L2+). */
function WallClock() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Circle cx={22} cy={22} r={19} fill="#FFFFFF" stroke={SLATE} strokeWidth={2.6} />
      <Line x1={22} y1={22} x2={22} y2={11} stroke={SLATE_DARK} strokeWidth={2.4} />
      <Line x1={22} y1={22} x2={30} y2={26} stroke={AMBER} strokeWidth={2.4} />
      <Circle cx={22} cy={22} r={2.4} fill={SLATE_DARK} />
    </Svg>
  );
}

/** The conference table (L3): a long table with stools and open ledgers. */
function ConferenceTable() {
  return (
    <Svg width={196} height={62} viewBox="0 0 196 62">
      {[22, 76, 120, 166].map((x) => (
        <Rect key={x} x={x - 11} y={2} width={22} height={10} rx={3} fill="#78716C" />
      ))}
      <Rect x={6} y={14} width={184} height={26} rx={6} fill={WOOD} />
      <Rect x={6} y={14} width={184} height={7} rx={3.5} fill={WOOD_DARK} opacity={0.55} />
      {/* open ledgers on the table */}
      <Rect x={34} y={22} width={26} height={12} rx={1.6} fill="#FFFFFF" stroke="#CBD5E1" />
      <Line x1={47} y1={22} x2={47} y2={34} stroke="#CBD5E1" strokeWidth={1.4} />
      <Rect x={132} y={22} width={26} height={12} rx={1.6} fill="#FEF3C7" stroke="#CBD5E1" />
      <Rect x={16} y={44} width={8} height={14} fill={WOOD_DARK} />
      <Rect x={172} y={44} width={8} height={14} fill={WOOD_DARK} />
      {[22, 76, 120, 166].map((x) => (
        <Rect key={`b-${x}`} x={x - 11} y={48} width={22} height={10} rx={3} fill="#78716C" />
      ))}
    </Svg>
  );
}

/** Collect All: one wide button under the roster summary that pays every
 *  finished shift at once. The flourish is a single moment — a few coin
 *  dots rise off the button while the summary line fades in below — not
 *  one coin-fly per villager. All motion is sine-eased, native driver. */
function CollectAllBar({
  buttonVisible,
  totalCoins,
  busy,
  celebrateKey,
  summary,
  onPress,
}: {
  buttonVisible: boolean;
  totalCoins: number;
  busy: boolean;
  celebrateKey: number;
  summary: { key: number; text: string } | null;
  onPress: () => void;
}) {
  const dots = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;
  const summaryOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!celebrateKey) return;
    dots.forEach((v) => v.setValue(0));
    Animated.parallel(
      dots.map((v, i) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 620,
          delay: i * 70,
          easing: Easing.out(Easing.sin),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [celebrateKey, dots]);

  useEffect(() => {
    if (!summary) return;
    summaryOpacity.setValue(0);
    const seq = Animated.sequence([
      Animated.timing(summaryOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.delay(2600),
      Animated.timing(summaryOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]);
    seq.start();
    return () => seq.stop();
  }, [summary, summaryOpacity]);

  if (!buttonVisible && !summary) return null;
  return (
    <View>
      {buttonVisible && (
        <View style={{ position: "relative", marginTop: 10 }}>
          {dots.map((v, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -2,
                left: `${10 + i * 20}%`,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: "#FBBF24",
                borderWidth: 1.5,
                borderColor: AMBER,
                zIndex: 5,
                opacity: v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] }),
                transform: [
                  { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) },
                ],
              }}
            />
          ))}
          <Pressable
            onPress={onPress}
            disabled={busy}
            style={{
              backgroundColor: AMBER,
              borderRadius: 12,
              paddingVertical: 11,
              alignItems: "center",
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>
              {busy ? "Collecting…" : `Collect All · ${formatCoinTotal(totalCoins)} coins`}
            </Text>
          </Pressable>
        </View>
      )}
      {summary && (
        <Animated.Text
          style={{ color: AMBER, fontSize: 12.5, fontWeight: "700", marginTop: 6, opacity: summaryOpacity }}
        >
          {summary.text}
        </Animated.Text>
      )}
    </View>
  );
}

type RosterData = {
  people: PrayedPerson[];
  assignments: VillagerWorkAssignment[];
  fieldMissions: FieldMission[];
  villagerMissions: VillagerMission[];
  townBuildings: PlacedBuilding[];
  /** Single-location truth (lib/villager-locations), settled on refresh:
   *  the roster can now say which map each villager is actually on. */
  locations: VillagerLocations;
};

export default function MainOfficeInteriorScreen() {
  const { coins, building, people: shellPeople, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastAction, setLastAction] = useState(0);
  const [roster, setRoster] = useState<RosterData | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [bloodmoon, setBloodmoon] = useState(false);
  const [assignFor, setAssignFor] = useState<RosterRow | null>(null);
  const [assignStep, setAssignStep] = useState<"kind" | "recipient">("kind");
  const [assignKind, setAssignKind] = useState<WorkKind | null>(null);
  const rosterRef = useRef<RosterData | null>(null);
  rosterRef.current = roster;
  const rowsRef = useRef<RosterRow[]>([]);
  // Every collect (a row button or Collect All) runs through this chain,
  // so two payout paths can never load the shared work ledger at the
  // same moment and pay the same shift twice.
  const collectChainRef = useRef<Promise<void>>(Promise.resolve());
  const [collectingAll, setCollectingAll] = useState(false);
  const collectingAllRef = useRef(false);
  const [collectSummary, setCollectSummary] = useState<{ key: number; text: string } | null>(null);
  const [collectCelebrateKey, setCollectCelebrateKey] = useState(0);

  // Load the paperwork cooldown + the Bloodmoon Badge blessing flag.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PAPERWORK_KEY);
        setLastAction(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
      const badges = await refreshBadgeCache().catch(() => [] as string[]);
      setBloodmoon(badges.includes("bloodmoon"));
    })();
  }, []);

  /** Re-read every roster input from the shared storage keys. Due shifts
   *  are ticked to "done" and saved, exactly like the town map's tick, so
   *  a shift ending while the office is open flips to Collect by itself. */
  const refreshRoster = useCallback(async () => {
    try {
      const [people, workState, fieldMissions, vmState, townRaw] = await Promise.all([
        prayedTodayPeople(),
        loadVillagerWorkState(),
        loadMissions(),
        loadVillagerMissionState(),
        AsyncStorage.getItem(TOWN_STORAGE_KEY),
      ]);
      let assignments = workState.assignments;
      const { state: ticked, newlyDone } = tickWorkAssignments(workState, Date.now());
      if (newlyDone.length > 0) {
        assignments = ticked.assignments;
        await saveVillagerWorkState(ticked);
      }
      const town = townRaw ? parseTown(JSON.parse(townRaw)) : emptyTownState();
      // Settle single-location truth with the same ticked ledger, so an
      // assignment started at this desk pins its villager to town at
      // once — and a finished shift leaves them there until they drift.
      let locations: VillagerLocations = {};
      try {
        const unlockedRaw = await AsyncStorage.getItem(MAP_UNLOCKED_KEY);
        const settled = await settleAndSaveVillagerLocations({
          people: people.map((p) => ({ personId: String(p.id) })),
          assignments,
          fieldMissions,
          unlockedMaps: parseUnlockedMaps(unlockedRaw ? JSON.parse(unlockedRaw) : null),
          nowMs: Date.now(),
          isNight: getTimeOfDay() === "night",
        });
        locations = settled.locations;
      } catch {}
      setRoster({
        people,
        assignments,
        fieldMissions,
        villagerMissions: vmState.missions,
        townBuildings: town.maps.town.buildings,
        locations,
      });
    } catch {}
  }, []);

  useEffect(() => {
    refreshRoster();
    const id = setInterval(refreshRoster, 4000);
    return () => clearInterval(id);
  }, [refreshRoster]);

  useFocusEffect(
    useCallback(() => {
      refreshRoster();
    }, [refreshRoster])
  );

  // One-second clock for the working countdowns.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    if (!roster) return [];
    return buildRosterRows({
      people: roster.people,
      assignments: roster.assignments,
      fieldMissions: roster.fieldMissions,
      villagerMissions: roster.villagerMissions,
      townBuildings: roster.townBuildings,
      isNight: getTimeOfDay() === "night",
      nowMs,
      locations: roster.locations,
    });
  }, [roster, nowMs]);
  rowsRef.current = rows;

  const summary = useMemo(() => rosterSummary(rows), [rows]);
  const jobOptions = useMemo(
    () => jobOptionsFor(roster?.townBuildings ?? []),
    [roster?.townBuildings]
  );

  // ---- board choreography (presentation only) ----
  // The roster rows are name plates on an Assignments board. These three
  // pieces of state drive the animations in components/roster-board.tsx:
  // an entrance epoch (replays the staggered plate entrance whenever the
  // board's order changes), ASSIGNED stamps per villager, and a one-shot
  // celebration when a shift flips working → collectable live.
  const [entranceEpoch, setEntranceEpoch] = useState(0);
  const [stamps, setStamps] = useState<Record<string, number>>({});
  const [celebrations, setCelebrations] = useState<Record<string, number>>({});
  const prevOrderRef = useRef("");
  const prevStatusRef = useRef<Map<string, RosterRow["status"]>>(new Map());

  useEffect(() => {
    const orderKey = rows.map((r) => r.personId).join("|");
    if (orderKey && orderKey !== prevOrderRef.current) {
      prevOrderRef.current = orderKey;
      setEntranceEpoch((e) => e + 1);
    }
  }, [rows]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const fresh: Record<string, number> = {};
    for (const row of rows) {
      if (prev.get(row.personId) === "working" && row.status === "collect") {
        fresh[row.personId] = Date.now();
      }
    }
    prevStatusRef.current = new Map(rows.map((r) => [r.personId, r.status] as const));
    if (Object.keys(fresh).length > 0) setCelebrations((c) => ({ ...c, ...fresh }));
  }, [rows]);

  const openAssign = useCallback((row: RosterRow) => {
    setAssignFor(row);
    setAssignStep("kind");
    setAssignKind(null);
  }, []);

  const remaining = Math.max(0, lastAction + COOLDOWN_MS - Date.now());
  const actionCoins = scaledCoins(ACTION_COINS[level]);
  const actionXp = scaledXP(ACTION_XP[level]);
  const clerks = pickPeople(shellPeople, `main-office|${building?.id ?? "office"}|clerks`, level >= 3 ? 2 : 1);

  const levelBlurb =
    level >= 3
      ? "Filing cabinets stand full, and the conference table is where the town's work gets planned."
      : level >= 2
        ? "Filing cabinets line the wall now — every shift, request, and blessing on record."
        : "A front desk, a bell, and a plant doing its best.";

  const handlePaperwork = async () => {
    if (remaining > 0) {
      Alert.alert("Desk Clear — For Now", `The inbox is empty.\n\nThe next stack of paperwork arrives in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastAction(t);
    await AsyncStorage.setItem(PAPERWORK_KEY, String(t)).catch(() => undefined);
    addCoins(actionCoins);
    await awardCustomXP(actionXp, `main-office-paperwork-${t}`).catch(() => undefined);
    Alert.alert("Paperwork Filed", `Every form stamped, every record straight.\n\n+${actionCoins.toFixed(2)} coins, +${actionXp} XP.`);
  };

  /** Send a villager to work — the same guards and the same assignment
   *  the on-map picker creates (interrupt, walk to site, stay working). */
  const handleAssign = async (row: RosterRow, kind: WorkKind, recipientName?: string) => {
    const data = rosterRef.current;
    if (!data) return;
    if (getTimeOfDay() === "night") {
      Alert.alert("Everyone's asleep", "Assign work in the morning — the town is sleeping.");
      return;
    }
    const fresh = await loadVillagerWorkState();
    if (personHasActiveWork(fresh.assignments, row.personId)) {
      Alert.alert("Already working", `${row.name} is already on a shift.`);
      refreshRoster();
      return;
    }
    const vmBusy = data.villagerMissions.some(
      (m) => m.personId === row.personId && m.status !== "done"
    );
    if (vmBusy) {
      Alert.alert("They're busy", `${row.name} has a request waiting — help them first.`);
      return;
    }
    if (!workSiteFor(kind, data.townBuildings)) {
      Alert.alert("Not built yet", "There's nowhere to do that work right now — build the right spot first.");
      return;
    }
    const assignment = createWorkAssignment({
      personId: row.personId,
      personName: row.name,
      kind,
      recipientName,
    });
    await saveVillagerWorkState({ assignments: [...fresh.assignments, assignment] });
    setAssignFor(null);
    setAssignStep("kind");
    setAssignKind(null);
    // No success alert: the board itself confirms — the plate pulses,
    // the status crossfades to the new job, and the ASSIGNED stamp lands.
    setStamps((s) => ({ ...s, [row.personId]: Date.now() }));
    refreshRoster();
  };

  /** Serialize every payout through one chain: a collect always loads,
   *  guards, saves, and pays against the freshest shared work ledger,
   *  never in parallel with another collect. */
  const enqueueCollect = (work: () => Promise<void>): Promise<void> => {
    const run = collectChainRef.current.then(work);
    collectChainRef.current = run.catch(() => undefined);
    return run;
  };

  /** Pay out a finished shift — identical to collecting on the map:
   *  scaled job reward + banked restock box bonus, with the Bloodmoon
   *  Badge's +10% on the grant when Jonathan holds it. */
  const handleCollect = (row: RosterRow) =>
    enqueueCollect(async () => {
      if (!row.assignment) return;
      const fresh = await loadVillagerWorkState();
      const { state, assignment: done } = collectWorkAssignment(fresh, row.assignment.id);
      if (!done) {
        refreshRoster();
        return;
      }
      await saveVillagerWorkState(state);
      const def = WORK_KINDS[done.kind];
      addCoins(collectPayoutCoins(def.rewardCoins + (done.bonusCoins ?? 0), bloodmoon));
      await awardCustomXP(scaledXP(def.rewardXP), `villager-work:${done.id}`).catch(() => undefined);
      refreshRoster();
    });

  /** Collect All: pay every finished shift with one tap. The ready set
   *  is snapshotted at tap time — a shift that finishes mid-sweep is not
   *  swept in. Each shift goes through the same guarded collect as the
   *  row button; a shift whose guard fails is skipped and the rest still
   *  pay. The balance moves once, to the final total. */
  const handleCollectAll = () => {
    if (collectingAllRef.current) return;
    const ready = collectableRows(rowsRef.current);
    if (ready.length < 2) return;
    const ids = ready.map((r) => r.assignment!.id);
    collectingAllRef.current = true;
    setCollectingAll(true);
    void enqueueCollect(async () => {
      try {
        const fresh = await loadVillagerWorkState();
        const { state, collected, skippedIds } = collectWorkAssignments(fresh, ids);
        if (collected.length > 0) {
          await saveVillagerWorkState(state);
          let total = 0;
          for (const done of collected) {
            const def = WORK_KINDS[done.kind];
            total += collectPayoutCoins(def.rewardCoins + (done.bonusCoins ?? 0), bloodmoon);
          }
          addCoins(total);
          for (const done of collected) {
            await awardCustomXP(scaledXP(WORK_KINDS[done.kind].rewardXP), `villager-work:${done.id}`).catch(
              () => undefined
            );
          }
          setCollectSummary({
            key: Date.now(),
            text:
              `Collected ${collected.length} ${collected.length === 1 ? "shift" : "shifts"} · +${formatCoinTotal(total)} coins` +
              (skippedIds.length > 0 ? ` · ${skippedIds.length} couldn't be collected` : ""),
          });
          setCollectCelebrateKey(Date.now());
        }
      } finally {
        collectingAllRef.current = false;
        setCollectingAll(false);
        refreshRoster();
      }
    });
  };

  const collectDisplay = (row: RosterRow) =>
    collectPayoutCoins(row.collectCoins ?? 0, bloodmoon).toFixed(2);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="business-center" iconColor={SLATE} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="business-center"
          iconColor={SLATE}
          title="The Main Office"
          blurb="Every prayer light, one desk. Send anyone to work and collect finished shifts — no more chasing villagers across town."
          accent="#CBD5E1"
        />

        {/* ---- the office room ---- */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden", backgroundColor: "#FFFDF8" }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="main-office" />

          {level >= 2 && (
            <View style={{ alignItems: "center", marginTop: 10 }}>
              <WallClock />
            </View>
          )}

          {/* cabinets + clerks behind the desk */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, paddingHorizontal: 10 }}>
            {level >= 2 && <FilingCabinet />}
            <View style={{ flex: 1, alignItems: "center" }}>
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end" }}>
                {clerks[0] && <WorkingFigure person={clerks[0]} delay={200} icon="assignment" iconColor={SLATE} />}
                {level >= 3 && clerks[1] && <WorkingFigure person={clerks[1]} delay={600} icon="folder-open" iconColor={AMBER} />}
              </View>
              <View style={{ width: 190, height: 74 }}>
                <FrontDesk />
                <DeskBell />
              </View>
            </View>
            {level >= 2 ? <FilingCabinet /> : <OfficePlant size={34} />}
          </View>

          {level >= 3 && (
            <View style={{ alignItems: "center", marginTop: 4 }}>
              <ConferenceTable />
            </View>
          )}

          {/* the hero at the front desk */}
          {pawn && (
            <View style={{ alignItems: "center", marginTop: 6 }}>
              <SoftPulse duration={2250}>
                <FigureName name={pawn.name} color={SLATE_DARK} />
              </SoftPulse>
              <PawnPreview pawn={pawn} size={48} />
            </View>
          )}

          {/* office floor */}
          <View style={{ height: 20, backgroundColor: "#E7E5E4", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: SLATE }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Next paperwork in ${formatCooldown(remaining)}` : "File the Paperwork"}
          onPrimary={handlePaperwork}
          primaryColor={SLATE}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "A conference table for planning the town's work together." : "Filing cabinets and a wall clock — the office starts keeping real records.")}
        />

        {/* ---- the villager roster ---- */}
        <View style={{ marginHorizontal: 16, marginTop: 22 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="groups" size={22} color={SLATE} />
            <Text style={{ fontSize: 18, fontWeight: "800", color: SLATE_DARK, marginLeft: 8 }}>Villager Roster</Text>
          </View>
          <Text style={{ color: "#57534E", fontSize: 13, fontWeight: "600", marginTop: 4 }}>
            {roster ? rosterSummaryText(summary) : "Opening the roster…"}
          </Text>
          {summary.collectable > 0 && (
            <Text style={{ color: AMBER, fontSize: 12.5, fontWeight: "700", marginTop: 2 }}>
              {summary.collectable} finished {summary.collectable === 1 ? "shift" : "shifts"} ready to collect
            </Text>
          )}
          <CollectAllBar
            buttonVisible={showCollectAll(rows)}
            totalCoins={collectAllTotalCoins(rows, bloodmoon)}
            busy={collectingAll}
            celebrateKey={collectCelebrateKey}
            summary={collectSummary}
            onPress={handleCollectAll}
          />
          <Text style={{ color: TEXT_DIM, fontSize: 11.5, marginTop: 4 }}>
            Everyone here is a prayer light — someone you prayed for today. The little gold flame marks it.
          </Text>

          {!roster && (
            <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 18 }}>Opening the roster…</Text>
          )}
          {roster && rows.length === 0 && (
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E7E5E4", padding: 16, marginTop: 12 }}>
              <Text style={{ color: "#57534E", fontSize: 13.5, textAlign: "center" }}>
                No prayer lights yet today — pray for someone and they'll appear here, ready to help around town.
              </Text>
            </View>
          )}

          {rows.map((row, index) => (
            <RosterRowCard
              key={row.personId}
              row={row}
              index={index}
              entranceEpoch={entranceEpoch}
              stampKey={stamps[row.personId] ?? 0}
              celebrateKey={celebrations[row.personId] ?? 0}
              statusColor={STATUS_COLORS[row.status]}
              canAssign={canAssignRow(row)}
              collectAmount={row.status === "collect" ? collectDisplay(row) : null}
              onAssign={openAssign}
              onCollect={handleCollect}
            />
          ))}
        </View>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Unlocking the office…</Text>}
      </ScrollView>

      {/* ---- assign sheet: the same job list as the on-map picker ---- */}
      <Modal
        visible={assignFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignFor(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setAssignFor(null)}
        >
          <Pressable
            style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, width: "100%", maxWidth: 360, maxHeight: "86%" }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ color: "#1C1917", fontSize: 18, fontWeight: "800", textAlign: "center" }}>
              {assignStep === "recipient" ? "Who is the meal for?" : `Send ${assignFor?.name} to work`}
            </Text>
            {assignStep === "kind" ? (
              <ScrollView style={{ marginTop: 12 }}>
                {jobOptions.map((job) => (
                  <Pressable
                    key={job.kind}
                    disabled={!job.available}
                    onPress={() => {
                      if (!assignFor) return;
                      if (job.kind === "deliver-meal") {
                        setAssignKind(job.kind);
                        setAssignStep("recipient");
                      } else {
                        handleAssign(assignFor, job.kind);
                      }
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#F8FAFC",
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: "#CBD5E1",
                      opacity: job.available ? 1 : 0.5,
                    }}
                  >
                    <View
                      style={{
                        width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9",
                        borderWidth: 1.5, borderColor: SLATE,
                        alignItems: "center", justifyContent: "center", marginRight: 12,
                      }}
                    >
                      <MaterialIcons name={job.badgeIcon as any} size={20} color={SLATE} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#1C1917", fontWeight: "700", fontSize: 15 }}>{job.label}</Text>
                      <Text style={{ color: "#78716C", fontSize: 12, marginTop: 2 }}>{job.blurb}</Text>
                      <Text style={{ color: AMBER, fontSize: 12, fontWeight: "700", marginTop: 4 }}>
                        {job.durationLabel} · {scaledCoins(job.rewardCoins).toFixed(2)} coins · {job.rewardXP} XP
                        {job.available && job.siteName ? ` · at ${job.siteName}` : ""}
                      </Text>
                      {!job.available && job.reason && (
                        <Text style={{ color: "#BE3455", fontSize: 11.5, fontWeight: "600", marginTop: 2 }}>{job.reason}</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setAssignFor(null)}
                  style={{ marginTop: 4, borderRadius: 12, paddingVertical: 10, alignItems: "center" }}
                >
                  <Text style={{ color: "#78716C", fontWeight: "600", fontSize: 14 }}>Cancel</Text>
                </Pressable>
              </ScrollView>
            ) : (
              <View style={{ marginTop: 12 }}>
                <ScrollView style={{ maxHeight: 320 }}>
                  {(roster?.people ?? [])
                    .filter((p) => String(p.id) !== assignFor?.personId)
                    .slice(0, 40)
                    .map((p) => (
                      <Pressable
                        key={String(p.id)}
                        onPress={() => {
                          if (assignFor && assignKind) handleAssign(assignFor, assignKind, p.name);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "#F8FAFC",
                          borderRadius: 12,
                          padding: 12,
                          marginBottom: 8,
                        }}
                      >
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: p.accentColor ?? "#F59E0B", marginRight: 10 }} />
                        <Text style={{ color: "#1C1917", fontWeight: "600", fontSize: 15 }}>{p.name}</Text>
                      </Pressable>
                    ))}
                </ScrollView>
                <Pressable
                  onPress={() => setAssignStep("kind")}
                  style={{ marginTop: 4, borderRadius: 12, paddingVertical: 10, alignItems: "center" }}
                >
                  <Text style={{ color: "#78716C", fontWeight: "600", fontSize: 14 }}>Back</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
