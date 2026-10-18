import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Ellipse, Path, Polygon, Rect } from "react-native-svg";
import {
  MISSION_DURATIONS,
  MISSION_DURATION_ORDER,
  missionCountdown,
  missionStatus,
  type FieldMission,
  type MissionDurationId,
} from "@/lib/hometown";
import type { PageTheme, TimeOfDay } from "@/lib/daynight";

export type MissionFieldProps = {
  missions: FieldMission[];
  /** Prayer lights available to send (prayed for today, not already out). */
  availableLights: { personId: string; name: string; accentColor?: string }[];
  timeOfDay: TimeOfDay;
  pt: PageTheme;
  onSend: (personId: string, duration: MissionDurationId) => void;
  onCollect: (mission: FieldMission) => void;
};

const SCENE_W = 360;
const SCENE_H = 300;

/** Sky colors by time of day. */
function skyColors(timeOfDay: TimeOfDay): { top: string; bottom: string; sun: string } {
  switch (timeOfDay) {
    case "morning": return { top: "#FDE68A", bottom: "#FEF3C7", sun: "#F59E0B" };
    case "afternoon": return { top: "#7DD3FC", bottom: "#E0F2FE", sun: "#FBBF24" };
    case "evening": return { top: "#FDBA74", bottom: "#FFEDD5", sun: "#EA580C" };
    case "night": return { top: "#1E1B4B", bottom: "#312E81", sun: "#E0E7FF" };
  }
}

/** A simple tree. */
function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Rect x={-3} y={0} width={6} height={18} fill="#78350F" rx={2} />
      <Circle cx={0} cy={-8} r={16} fill="#15803D" />
      <Circle cx={-10} cy={-2} r={11} fill="#16A34A" />
      <Circle cx={10} cy={-2} r={11} fill="#16A34A" />
    </g>
  );
}

/** A small golden figure walking the path (a light out on mission). */
function MissionWalker({ x, y, returning }: { x: number; y: number; returning: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {returning && <Circle cx={0} cy={-14} r={16} fill="#FBBF24" opacity={0.3} />}
      <Circle cx={0} cy={-18} r={7} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5} />
      <Rect x={-6} y={-12} width={12} height={16} rx={6} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5} />
    </g>
  );
}

function MissionScene({
  missions,
  timeOfDay,
}: {
  missions: FieldMission[];
  timeOfDay: TimeOfDay;
}) {
  const sky = skyColors(timeOfDay);
  const now = useMemo(() => new Date(), []);
  const out = missions.filter((m) => !m.collected && missionStatus(m, now) === "out");
  const returned = missions.filter((m) => !m.collected && missionStatus(m, now) === "returned");

  // Path winds from bottom-center to the horizon.
  const pathD = "M150 300 C 160 240, 200 220, 180 170 C 165 135, 175 110, 180 90";

  return (
    <View style={{ borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
      <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
        {/* sky */}
        <Rect x={0} y={0} width={SCENE_W} height={150} fill={sky.top} />
        <Rect x={0} y={90} width={SCENE_W} height={60} fill={sky.bottom} opacity={0.9} />
        {/* sun / moon */}
        <Circle cx={300} cy={45} r={22} fill={sky.sun} opacity={0.9} />
        {/* distant hills */}
        <Ellipse cx={80} cy={155} rx={110} ry={28} fill="#86EFAC" opacity={0.7} />
        <Ellipse cx={290} cy={158} rx={130} ry={32} fill="#6EE7B7" opacity={0.6} />
        {/* field */}
        <Rect x={0} y={150} width={SCENE_W} height={150} fill={timeOfDay === "night" ? "#14532D" : "#4ADE80"} />
        <Rect x={0} y={150} width={SCENE_W} height={150} fill="#000000" opacity={timeOfDay === "night" ? 0.45 : 0} />
        {/* winding dirt path to the horizon */}
        <Path d={pathD} fill="none" stroke="#D6A85C" strokeWidth={26} strokeLinecap="round" opacity={0.95} />
        <Path d={pathD} fill="none" stroke="#E8C87E" strokeWidth={18} strokeLinecap="round" opacity={0.9} />
        {/* trees */}
        <Tree x={52} y={215} s={1.1} />
        <Tree x={312} y={230} s={0.9} />
        <Tree x={95} y={262} s={1.25} />
        <Tree x={268} y={272} s={1.05} />
        {/* horizon glow — the far edge they're walking toward */}
        <Ellipse cx={180} cy={95} rx={46} ry={16} fill="#FEF3C7" opacity={timeOfDay === "night" ? 0.25 : 0.75} />
        {/* walkers: out on the path, returned near the bottom */}
        {out.slice(0, 6).map((m, i) => (
          <MissionWalker
            key={m.id}
            x={168 + (i % 3) * 22 - 20}
            y={150 + Math.floor(i / 3) * 36 + (i % 2) * 8}
            returning={false}
          />
        ))}
        {returned.slice(0, 6).map((m, i) => (
          <MissionWalker
            key={m.id}
            x={120 + i * 48}
            y={282}
            returning={true}
          />
        ))}
      </Svg>
    </View>
  );
}

function formatDurationLabel(d: MissionDurationId): string {
  const def = MISSION_DURATIONS[d];
  return `${def.label} · ${def.hours}h`;
}

export function MissionField(props: MissionFieldProps) {
  const { missions, availableLights, timeOfDay, pt, onSend, onCollect } = props;
  const [sendVisible, setSendVisible] = useState(false);
  const [collectMission, setCollectMission] = useState<FieldMission | null>(null);
  const [pickedPersonId, setPickedPersonId] = useState<string | null>(null);
  const [pickedDuration, setPickedDuration] = useState<MissionDurationId>("day");

  const now = new Date();
  const active = missions.filter((m) => !m.collected);
  const out = active.filter((m) => missionStatus(m, now) === "out");
  const returned = active.filter((m) => missionStatus(m, now) === "returned");

  const openSend = () => {
    if (availableLights.length === 0) {
      Alert.alert(
        "No lights to send",
        "Pray for someone today and they'll appear here as a light you can send out."
      );
      return;
    }
    setPickedPersonId(availableLights[0]?.personId ?? null);
    setPickedDuration("day");
    setSendVisible(true);
  };

  const confirmSend = () => {
    if (!pickedPersonId) return;
    onSend(pickedPersonId, pickedDuration);
    setSendVisible(false);
    setPickedPersonId(null);
  };

  const openCollect = (m: FieldMission) => {
    setCollectMission(m);
  };

  const confirmCollect = () => {
    if (!collectMission) return;
    onCollect(collectMission);
    setCollectMission(null);
  };

  return (
    <View>
      <MissionScene missions={missions} timeOfDay={timeOfDay} />

      <Text style={{ color: pt.subtext, marginBottom: 12, fontSize: 13 }}>
        Send your prayer lights out into the field. They'll return with a blessing — coins, XP, sometimes a verse.
      </Text>

      {/* Send button */}
      <Pressable
        onPress={openSend}
        style={{
          backgroundColor: "#1D4ED8",
          borderRadius: 12,
          padding: 14,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>
          Send a light on mission
        </Text>
      </Pressable>

      {/* Returned — waiting to be welcomed home */}
      {returned.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: "800", fontSize: 14, color: pt.text, marginBottom: 8, letterSpacing: 1 }}>
            WELCOME HOME
          </Text>
          {returned.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => openCollect(m)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#FFFBEB",
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                borderWidth: 1.5,
                borderColor: "#F59E0B",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#FDE68A",
                  borderWidth: 2,
                  borderColor: "#F59E0B",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 18 }}>✦</Text>
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 14, color: "#92400E" }}>{m.name}</Text>
                <Text style={{ fontSize: 12, color: "#B45309" }}>
                  Back from {MISSION_DURATIONS[m.duration].label.toLowerCase()} — tap to receive their blessing
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Out in the field */}
      {out.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: "800", fontSize: 14, color: pt.text, marginBottom: 8, letterSpacing: 1 }}>
            OUT IN THE FIELD
          </Text>
          {out.map((m) => (
            <View
              key={m.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: pt.card,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: pt.border,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: m.accentColor ?? "#FDE68A",
                  opacity: 0.85,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 16, color: "#92400E", fontWeight: "800" }}>
                  {m.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 14, color: pt.text }}>{m.name}</Text>
                <Text style={{ fontSize: 12, color: pt.subtext }}>
                  {formatDurationLabel(m.duration)} · back in {missionCountdown(m, now)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {active.length === 0 && (
        <View
          style={{
            backgroundColor: pt.card,
            borderRadius: 12,
            padding: 20,
            alignItems: "center",
            borderWidth: 1,
            borderColor: pt.border,
          }}
        >
          <Text style={{ color: pt.subtext, textAlign: "center", fontSize: 13 }}>
            The field is quiet. Send a light out and watch the path — they'll walk toward the horizon and return with a blessing.
          </Text>
        </View>
      )}

      {/* Send modal */}
      <Modal visible={sendVisible} transparent animationType="fade" onRequestClose={() => setSendVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: pt.card, borderRadius: 20, padding: 20, maxHeight: "85%" }}>
            <Text style={{ fontWeight: "800", fontSize: 18, color: pt.text, marginBottom: 4 }}>
              Send on mission
            </Text>
            <Text style={{ fontSize: 12, color: pt.subtext, marginBottom: 12 }}>
              Who goes, and for how long?
            </Text>

            <Text style={{ fontWeight: "700", fontSize: 13, color: pt.text, marginBottom: 6 }}>Who</Text>
            <ScrollView style={{ maxHeight: 150, marginBottom: 12 }} nestedScrollEnabled>
              {availableLights.map((p) => (
                <Pressable
                  key={p.personId}
                  onPress={() => setPickedPersonId(p.personId)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 10,
                    borderRadius: 10,
                    marginBottom: 6,
                    backgroundColor: pickedPersonId === p.personId ? "#FEF3C7" : "transparent",
                    borderWidth: pickedPersonId === p.personId ? 1.5 : 1,
                    borderColor: pickedPersonId === p.personId ? "#F59E0B" : pt.border,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: "#FDE68A",
                      borderWidth: 1.5,
                      borderColor: "#F59E0B",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>✦</Text>
                  </View>
                  <Text style={{ marginLeft: 10, fontWeight: "600", fontSize: 14, color: pt.text }}>
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={{ fontWeight: "700", fontSize: 13, color: pt.text, marginBottom: 6 }}>How long</Text>
            {MISSION_DURATION_ORDER.map((id) => {
              const d = MISSION_DURATIONS[id];
              const selected = pickedDuration === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setPickedDuration(id)}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    marginBottom: 8,
                    backgroundColor: selected ? "#EFF6FF" : "transparent",
                    borderWidth: selected ? 1.5 : 1,
                    borderColor: selected ? "#1D4ED8" : pt.border,
                  }}
                >
                  <Text style={{ fontWeight: "700", fontSize: 14, color: pt.text }}>
                    {d.label} · {d.hours}h
                  </Text>
                  <Text style={{ fontSize: 12, color: pt.subtext, marginTop: 2 }}>{d.blurb}</Text>
                  <Text style={{ fontSize: 12, color: pt.subtext, marginTop: 2 }}>
                    Blessing: {d.coinsMin}–{d.coinsMax} coins{d.xp > 0 ? ` + ${d.xp} XP` : ""}
                    {d.verseChance > 0 ? " · may carry a verse" : ""}
                  </Text>
                </Pressable>
              );
            })}

            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
              <Pressable onPress={() => setSendVisible(false)} style={{ padding: 12 }}>
                <Text style={{ color: pt.subtext, fontWeight: "700" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmSend}
                disabled={!pickedPersonId}
                style={{
                  padding: 12,
                  opacity: pickedPersonId ? 1 : 0.4,
                }}
              >
                <Text style={{ color: "#1D4ED8", fontWeight: "800" }}>Send out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Collect modal — the blessing */}
      <Modal visible={!!collectMission} transparent animationType="fade" onRequestClose={() => setCollectMission(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: pt.card, borderRadius: 20, padding: 24, alignItems: "center" }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#FDE68A",
                borderWidth: 2,
                borderColor: "#F59E0B",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 30 }}>✦</Text>
            </View>
            <Text style={{ fontWeight: "800", fontSize: 18, color: pt.text, textAlign: "center" }}>
              {collectMission?.name} is home
            </Text>
            <Text style={{ fontSize: 13, color: pt.subtext, textAlign: "center", marginTop: 6, fontStyle: "italic" }}>
              Visited someone who needed prayer.
            </Text>
            <View
              style={{
                marginTop: 14,
                backgroundColor: "#FFFBEB",
                borderRadius: 12,
                padding: 14,
                width: "100%",
                borderWidth: 1,
                borderColor: "#FDE68A",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "800", fontSize: 16, color: "#92400E" }}>
                +{collectMission?.coins} coins{collectMission && collectMission.xp > 0 ? ` · +${collectMission.xp} XP` : ""}
              </Text>
              {collectMission?.verse && (
                <Text style={{ fontSize: 12, color: "#B45309", textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
                  "{collectMission.verse.text}"{"\n"}— {collectMission.verse.ref}
                </Text>
              )}
            </View>
            <Pressable
              onPress={confirmCollect}
              style={{
                marginTop: 16,
                backgroundColor: "#1D4ED8",
                borderRadius: 12,
                paddingHorizontal: 28,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>Receive blessing</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
