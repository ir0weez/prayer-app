import Svg, { Circle, Path } from "react-native-svg";
import { Text, View } from "react-native";

import { moodById, type JournalMood } from "@/components/mood-picker";

// v194 (Journal, Zeitgeist): the mockup's mood smileys are DRAWN faces
// (SVG, never emoji). The app already had eight moods; here each mood
// id gets the mockup's face in its Zeitgeist palette — grateful green
// smile, joyful amber open grin, peaceful teal calm, hopeful violet
// smile, tired lavender flat, anxious pale-blue flat, heavy/sad slate
// frowns.

export const MOOD_FACE_COLORS: Record<string, string> = {
  grateful: "#43A673",
  joyful: "#F0A020",
  peaceful: "#38A3A5",
  hopeful: "#7C4DFF",
  tired: "#9B8EC4",
  anxious: "#8FB8D8",
  heavy: "#7A8699",
  sad: "#7A8699",
};

const INK = "#2E2A1A";
const STROKE = { stroke: INK, strokeWidth: 1.7, strokeLinecap: "round" as const, fill: "none" };

export function moodFaceColor(moodId?: string): string {
  return (moodId && MOOD_FACE_COLORS[moodId]) || "#8FB8D8";
}

function DotEyes() {
  return (
    <>
      <Circle cx={8.6} cy={10} r={1.35} fill={INK} />
      <Circle cx={15.4} cy={10} r={1.35} fill={INK} />
    </>
  );
}

function HappyEyes() {
  return (
    <>
      <Path d="M6.9 10.4c.5-1.1 1.2-1.6 1.7-1.6s1.2.5 1.7 1.6" {...STROKE} />
      <Path d="M13.7 10.4c.5-1.1 1.2-1.6 1.7-1.6s1.2.5 1.7 1.6" {...STROKE} />
    </>
  );
}

export function MoodFace({ moodId, size = 20 }: { moodId?: string; size?: number }) {
  const color = moodFaceColor(moodId);
  const id = moodId && MOOD_FACE_COLORS[moodId] ? moodId : "anxious";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10.5} fill={color} />
      {id === "grateful" || id === "hopeful" ? (
        <>
          <DotEyes />
          <Path d="M8.2 14.2c1.1 1.9 2.4 2.8 3.8 2.8s2.7-.9 3.8-2.8" {...STROKE} />
        </>
      ) : null}
      {id === "joyful" ? (
        <>
          <HappyEyes />
          <Path d="M8.4 13.8c.7 2.5 2 3.8 3.6 3.8s2.9-1.3 3.6-3.8c-1.2.5-2.4.7-3.6.7s-2.4-.2-3.6-.7z" fill={INK} />
        </>
      ) : null}
      {id === "peaceful" ? (
        <>
          <HappyEyes />
          <Path d="M9.6 14.6c.7.8 1.5 1.2 2.4 1.2s1.7-.4 2.4-1.2" {...STROKE} />
        </>
      ) : null}
      {id === "anxious" ? (
        <>
          <DotEyes />
          <Path d="M9.2 15.2h5.6" {...STROKE} />
        </>
      ) : null}
      {id === "tired" ? (
        <>
          <Path d="M7.2 10.2h2.8M14 10.2h2.8" {...STROKE} />
          <Path d="M10 15.8h4" {...STROKE} />
        </>
      ) : null}
      {id === "heavy" || id === "sad" ? (
        <>
          <DotEyes />
          <Path d="M8.6 16.6c1-1.7 2.1-2.5 3.4-2.5s2.4.8 3.4 2.5" {...STROKE} />
        </>
      ) : null}
    </Svg>
  );
}

// The mockup's quiet grey chip: drawn face + mood label.
export function MoodFaceChip({ mood, onDark }: { mood: JournalMood; onDark?: boolean }) {
  const def = moodById(mood.id);
  if (!def) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: onDark ? "rgba(255,255,255,0.22)" : "#F4F2FA",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <MoodFace moodId={mood.id} size={14} />
      {/* v195: the pale chip always carries the mockup's dark ink —
          v194's palette foreground is white under dark Classic,
          which made chip labels vanish on their own background. */}
      <Text style={{ color: onDark ? "#FFFFFF" : "#1D1830", fontSize: 12.5, fontWeight: "700" }}>{def.label}</Text>
    </View>
  );
}
