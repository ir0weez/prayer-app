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
// No emojis — SVG art and MaterialIcons only.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, G, Line, Rect } from "react-native-svg";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { getTimeOfDay } from "@/lib/daynight";
import {
  TOWN_STORAGE_KEY,
  emptyTownState,
  loadMissions,
  parseTown,
  prayedTodayPeople,
  scaledCoins,
  scaledXP,
  type FieldMission,
  type PlacedBuilding,
  type PrayedPerson,
} from "@/lib/hometown";
import {
  WORK_KINDS,
  collectWorkAssignment,
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
  jobOptionsFor,
  rosterSummary,
  rosterSummaryText,
  workSiteFor,
  type RosterRow,
} from "@/lib/villager-roster";
import { BLOODMOON_COIN_MULT, refreshBadgeCache } from "@/lib/badges";
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
const TEXT_DIM = "#A08B6D";

const STATUS_COLORS: Record<RosterRow["status"], string> = {
  idle: "#059669",
  collect: "#B45309",
  request: "#BE3455",
  working: "#2563EB",
  mission: "#7C3AED",
  sleeping: "#78716C",
};

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
      {/* service bell */}
      <Ellipse cx={140} cy={24} rx={8} ry={5} fill="#CBD5E1" />
      <Circle cx={140} cy={19} r={2.4} fill="#94A3B8" />
      {/* paper stack */}
      <Rect x={30} y={18} width={22} height={3.4} fill="#FFFFFF" stroke="#CBD5E1" />
      <Rect x={32} y={21.5} width={22} height={3.4} fill="#F8FAFC" stroke="#CBD5E1" />
    </Svg>
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

type RosterData = {
  people: PrayedPerson[];
  assignments: VillagerWorkAssignment[];
  fieldMissions: FieldMission[];
  villagerMissions: VillagerMission[];
  townBuildings: PlacedBuilding[];
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
      setRoster({
        people,
        assignments,
        fieldMissions,
        villagerMissions: vmState.missions,
        townBuildings: town.maps.town.buildings,
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
    });
  }, [roster, nowMs]);

  const summary = useMemo(() => rosterSummary(rows), [rows]);
  const jobOptions = useMemo(
    () => jobOptionsFor(roster?.townBuildings ?? []),
    [roster?.townBuildings]
  );

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
    refreshRoster();
    const def = WORK_KINDS[kind];
    Alert.alert("Work assigned", `${row.name} is on the way: ${def.label} (${def.durationLabel}).`);
  };

  /** Pay out a finished shift — identical to collecting on the map:
   *  scaled job reward + banked restock box bonus, with the Bloodmoon
   *  Badge's +10% on the grant when Jonathan holds it. */
  const handleCollect = async (row: RosterRow) => {
    if (!row.assignment) return;
    const fresh = await loadVillagerWorkState();
    const { state, assignment: done } = collectWorkAssignment(fresh, row.assignment.id);
    if (!done) {
      refreshRoster();
      return;
    }
    await saveVillagerWorkState(state);
    const def = WORK_KINDS[done.kind];
    let payout = scaledCoins(def.rewardCoins + (done.bonusCoins ?? 0));
    if (bloodmoon) payout = payout * BLOODMOON_COIN_MULT;
    addCoins(payout);
    await awardCustomXP(scaledXP(def.rewardXP), `villager-work:${done.id}`).catch(() => undefined);
    refreshRoster();
  };

  const collectDisplay = (row: RosterRow) => {
    const base = scaledCoins(row.collectCoins ?? 0);
    return (bloodmoon ? base * BLOODMOON_COIN_MULT : base).toFixed(2);
  };

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
              <FrontDesk />
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

          {rows.map((row) => (
            <View
              key={row.personId}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: row.status === "collect" ? "#F59E0B" : "#E7E5E4",
                padding: 12,
                marginTop: 10,
              }}
            >
              {/* initial tile */}
              <View
                style={{
                  width: 42, height: 42, borderRadius: 21,
                  backgroundColor: row.accentColor ?? "#F59E0B",
                  alignItems: "center", justifyContent: "center",
                  borderWidth: 2, borderColor: "#FDE68A",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 17 }}>
                  {row.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ color: "#1C1917", fontWeight: "700", fontSize: 15 }} numberOfLines={1}>
                    {row.name}
                  </Text>
                  {row.prayedToday && (
                    <View
                      style={{
                        marginLeft: 7, width: 15, height: 15, borderRadius: 8,
                        backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <MaterialIcons name="local-fire-department" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <Text style={{ color: STATUS_COLORS[row.status], fontWeight: "700", fontSize: 12.5, marginTop: 2 }}>
                  {row.statusLabel}
                </Text>
                {row.detail && (
                  <Text style={{ color: TEXT_DIM, fontSize: 11.5, marginTop: 1 }}>{row.detail}</Text>
                )}
              </View>

              {row.status === "collect" && (
                <Pressable
                  onPress={() => handleCollect(row)}
                  style={{ backgroundColor: AMBER, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9, alignItems: "center" }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13 }}>Collect</Text>
                  <Text style={{ color: "#FEF3C7", fontWeight: "700", fontSize: 11 }}>{collectDisplay(row)} coins</Text>
                </Pressable>
              )}
              {canAssignRow(row) && (
                <Pressable
                  onPress={() => { setAssignFor(row); setAssignStep("kind"); setAssignKind(null); }}
                  style={{ backgroundColor: SLATE, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10 }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13 }}>Assign</Text>
                </Pressable>
              )}
            </View>
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
