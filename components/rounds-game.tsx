// Gentle Rounds — Hospital mini-game.
// Four patients rest in a quiet ward for 60 seconds. A bubble over a
// bed shows what that patient is asking for — water, medicine, a
// blanket, or prayer. Arm a supply on the tray at the bottom, then
// tap the patient who needs it. A wrong tap only whispers who is
// asking for what; nobody is ever in trouble in this ward.

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";
import { roundsReward } from "@/lib/mini-games";

const DURATION_S = 60;

type NeedKind = "water" | "medicine" | "blanket" | "prayer";

const NEEDS: { kind: NeedKind; icon: keyof typeof MaterialIcons.glyphMap; label: string }[] = [
  { kind: "water", icon: "water-drop", label: "Water" },
  { kind: "medicine", icon: "medication", label: "Medicine" },
  { kind: "blanket", icon: "bed", label: "Blanket" },
  { kind: "prayer", icon: "volunteer-activism", label: "Prayer" },
];

const NEED_LABEL: Record<NeedKind, string> = {
  water: "Water",
  medicine: "Medicine",
  blanket: "Blanket",
  prayer: "Prayer",
};

const NAMES = ["Ruth", "Amos", "Mabel", "Ezra", "June", "Silas"];
const BLANKETS = ["#5EEAD5", "#93C5FD", "#F9A8D4", "#FCD34D"];

type Patient = {
  name: string;
  need: NeedKind | null;
  thankYou: boolean;
};

function randomNeed(): NeedKind {
  return NEEDS[Math.floor(Math.random() * NEEDS.length)].kind;
}

function initialPatients(): Patient[] {
  const names = [...NAMES].sort(() => Math.random() - 0.5).slice(0, 4);
  const patients: Patient[] = names.map((name) => ({ name, need: null, thankYou: false }));
  // Two random patients are already asking for something at the start.
  const idxs = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, 2);
  for (const i of idxs) patients[i] = { ...patients[i], need: randomNeed() };
  return patients;
}

/** A small, warm patient: round head on a pillow, tucked under a blanket. */
function PatientArt({ blanket, index }: { blanket: string; index: number }) {
  return (
    <Svg width={64} height={54} viewBox="0 0 64 54">
      <Rect x={6} y={8} width={26} height={14} rx={6} fill="#FFFFFF" stroke="#D6D3D1" strokeWidth={1.4} />
      <Circle cx={20} cy={15} r={8} fill="#EFC3A0" />
      <Path d="M12 14 a8 8 0 0 1 16 0 l0 -2 a8 6 0 0 0 -16 0 Z" fill={index % 2 === 0 ? "#78716C" : "#A16207"} />
      <Circle cx={17} cy={15} r={0.9} fill="#44403C" />
      <Circle cx={23} cy={15} r={0.9} fill="#44403C" />
      <Path d="M17 19 q3 2 6 0" stroke="#B45309" strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <Rect x={8} y={26} width={48} height={20} rx={7} fill={blanket} />
      <Rect x={8} y={26} width={48} height={6} rx={3} fill="#FFFFFF" opacity={0.35} />
      <Rect x={4} y={44} width={56} height={4} rx={2} fill="#A8A29E" />
    </Svg>
  );
}

export function RoundsGame({ accent, onComplete, onExit }: MiniGameProps) {
  const [patients, setPatients] = useState<Patient[]>(() => initialPatients());
  const [armed, setArmed] = useState<NeedKind | null>(null);
  const [served, setServed] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(DURATION_S);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const patientsRef = useRef(patients);
  const servedRef = useRef(0);
  const completedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current = [...timeoutsRef.current, t];
    return t;
  }, []);

  const clearTimers = useCallback(() => {
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];
  }, []);

  const applyPatients = useCallback((next: Patient[]) => {
    patientsRef.current = next;
    setPatients(next);
  }, []);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearTimers();
    setGranted(onCompleteRef.current(roundsReward(servedRef.current)));
  }, [clearTimers]);

  // The 60-second round: a deadline finish plus a 1-second timeout
  // chain for the countdown text. State changes on events only.
  useEffect(() => {
    const deadline = Date.now() + DURATION_S * 1000;
    const finishTimer = setTimeout(finish, DURATION_S * 1000);
    let tickTimer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (completedRef.current) return;
      const rem = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(rem);
      if (rem > 0) tickTimer = setTimeout(tick, 1000);
    };
    tickTimer = setTimeout(tick, 1000);
    return () => {
      clearTimeout(finishTimer);
      if (tickTimer) clearTimeout(tickTimer);
    };
  }, [finish]);

  useEffect(() => clearTimers, [clearTimers]);

  const tapSupply = (kind: NeedKind) => {
    if (completedRef.current) return;
    setArmed(kind);
    setHint(null);
  };

  const tapPatient = (index: number) => {
    if (completedRef.current) return;
    const patient = patientsRef.current[index];
    if (!patient) return;
    if (!patient.need) {
      setHint(`${patient.name} is resting quietly.`);
      return;
    }
    if (armed !== patient.need) {
      setHint(`${patient.name} is asking for ${NEED_LABEL[patient.need]}.`);
      return;
    }
    // Served: the bubble clears into a thank-you, then a fresh need
    // appears on a random patient who has none.
    servedRef.current += 1;
    setServed(servedRef.current);
    setArmed(null);
    setHint(null);
    applyPatients(
      patientsRef.current.map((p, i) => (i === index ? { ...p, need: null, thankYou: true } : p))
    );
    later(() => {
      if (completedRef.current) return;
      const cleared = patientsRef.current.map((p, i) =>
        i === index ? { ...p, thankYou: false } : p
      );
      const candidates = cleared
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => !p.need && !p.thankYou);
      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        cleared[pick.i] = { ...cleared[pick.i], need: randomNeed() };
      }
      applyPatients(cleared);
    }, 900);
  };

  if (granted) {
    return (
      <GameCard title="Gentle Rounds" accent={accent}>
        <GameResults
          title="Rounds complete"
          flavor={`You served ${served} need${served === 1 ? "" : "s"} on the ward — every glass of water and whispered prayer landed where it was asked for.`}
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  return (
    <GameCard title="Gentle Rounds" accent={accent}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>Served: {served}</Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>{secondsLeft}s left</Text>
        </View>

        {/* the ward */}
        <View style={{ marginTop: 12, borderRadius: 14, backgroundColor: "#F0FDF9", padding: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {patients.map((patient, i) => (
              <Pressable
                key={patient.name}
                onPressIn={() => tapPatient(i)}
                style={{
                  width: "47.5%",
                  flexGrow: 1,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1.5,
                  borderColor: patient.need && armed === patient.need ? "#0F766E" : "#CCFBF1",
                  borderRadius: 14,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  alignItems: "center",
                }}
              >
                <View style={{ height: 26, alignItems: "center", justifyContent: "center" }}>
                  {patient.need ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#ECFDF5",
                        borderWidth: 1.4,
                        borderColor: "#0F766E",
                        borderRadius: 999,
                        paddingVertical: 3,
                        paddingHorizontal: 9,
                      }}
                    >
                      <MaterialIcons
                        name={NEEDS.find((n) => n.kind === patient.need)?.icon ?? "favorite"}
                        size={15}
                        color="#0F766E"
                      />
                      <Text style={{ marginLeft: 4, color: "#115E59", fontSize: 11, fontWeight: "800" }}>
                        {NEED_LABEL[patient.need]}
                      </Text>
                    </View>
                  ) : patient.thankYou ? (
                    <Text style={{ color: "#0F766E", fontSize: 12, fontWeight: "800" }}>Thank you!</Text>
                  ) : null}
                </View>
                <PatientArt blanket={BLANKETS[i % BLANKETS.length]} index={i} />
                <Text style={{ color: "#1C1917", fontWeight: "800", fontSize: 13.5, marginTop: 2 }}>{patient.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 10 }}>
          {hint ?? "Pick a supply, then tap the patient asking for it."}
        </Text>

        {/* the supply tray */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          {NEEDS.map((need) => {
            const isArmed = armed === need.kind;
            return (
              <Pressable
                key={need.kind}
                onPressIn={() => tapSupply(need.kind)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 11,
                  borderRadius: 14,
                  backgroundColor: isArmed ? "#CCFBF1" : "#FFFFFF",
                  borderWidth: isArmed ? 3 : 1.5,
                  borderColor: isArmed ? "#0F766E" : "#D6D3D1",
                }}
              >
                <MaterialIcons name={need.icon} size={23} color={isArmed ? "#0F766E" : accent} />
                <Text style={{ color: "#1C1917", fontWeight: "800", fontSize: 11.5, marginTop: 3 }}>{need.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={onExit} style={{ alignSelf: "center", marginTop: 8, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
export { RoundsGame as GentleRoundsGame };
