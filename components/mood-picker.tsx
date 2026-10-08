import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";

export type MoodId = "grateful" | "peaceful" | "hopeful" | "joyful" | "tired" | "anxious" | "heavy" | "sad";

export type JournalMood = { id: MoodId; intensity: 1 | 2 | 3 };

export const MOODS: { id: MoodId; label: string; icon: string; color: string }[] = [
  { id: "grateful", label: "Grateful", icon: "favorite", color: "#EC4899" },
  { id: "peaceful", label: "Peaceful", icon: "spa", color: "#10B981" },
  { id: "hopeful", label: "Hopeful", icon: "wb-sunny", color: "#F59E0B" },
  { id: "joyful", label: "Joyful", icon: "celebration", color: "#8B5CF6" },
  { id: "tired", label: "Tired", icon: "bedtime", color: "#6B7280" },
  { id: "anxious", label: "Anxious", icon: "psychology", color: "#F97316" },
  { id: "heavy", label: "Heavy", icon: "cloud", color: "#3B82F6" },
  { id: "sad", label: "Sad", icon: "water-drop", color: "#6366F1" },
];

export function moodById(id?: string) {
  return MOODS.find((m) => m.id === id);
}

function MoodButton({
  mood,
  selected,
  index,
  onPress,
}: {
  mood: (typeof MOODS)[number];
  selected: boolean;
  index: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const phase = Animated.sequence([
      Animated.delay(index * 300),
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ),
    ]);
    phase.start();
    return () => phase.stop();
  }, [breathe, index]);

  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glow = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={mood.label}
      style={{ alignItems: "center", width: 64, paddingVertical: 6 }}
    >
      <Animated.View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: mood.color + "22",
          borderWidth: selected ? 2.5 : 0,
          borderColor: mood.color,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale }],
          shadowColor: mood.color,
          shadowOpacity: selected ? 0.5 : 0,
          shadowRadius: selected ? 10 : 0,
          elevation: selected ? 4 : 0,
        }}
      >
        <Animated.View style={{ opacity: glow }}>
          <View
            style={{
              position: "absolute",
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: mood.color + "30",
              top: -14,
              left: -14,
            }}
          />
        </Animated.View>
        <MaterialIcons name={mood.icon as any} size={26} color={mood.color} />
      </Animated.View>
      <Text
        style={{
          color: selected ? mood.color : colors.muted,
          fontSize: 11,
          fontWeight: selected ? "700" : "500",
          marginTop: 4,
        }}
      >
        {mood.label}
      </Text>
    </Pressable>
  );
}

export function MoodPicker({
  value,
  onChange,
}: {
  value?: JournalMood;
  onChange: (mood: JournalMood | undefined) => void;
}) {
  const colors = useColors();

  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        {MOODS.map((mood, i) => (
          <MoodButton
            key={mood.id}
            mood={mood}
            index={i}
            selected={value?.id === mood.id}
            onPress={() => onChange(value?.id === mood.id ? undefined : { id: mood.id, intensity: value?.intensity ?? 2 })}
          />
        ))}
      </View>
      {value && (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600" }}>INTENSITY</Text>
          {([1, 2, 3] as const).map((level) => (
            <Pressable
              key={level}
              onPress={() => onChange({ id: value.id, intensity: level })}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 14,
                backgroundColor: value.intensity === level ? colors.primary : colors.surface,
              }}
            >
              <Text
                style={{
                  color: value.intensity === level ? "#FFFFFF" : colors.muted,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {level === 1 ? "Mild" : level === 2 ? "Medium" : "Strong"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function MoodChip({ mood, small }: { mood: JournalMood; small?: boolean }) {
  const def = moodById(mood.id);
  if (!def) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: def.color + "1E",
        borderRadius: 12,
        paddingHorizontal: small ? 8 : 10,
        paddingVertical: small ? 3 : 5,
        gap: 5,
      }}
    >
      <MaterialIcons name={def.icon as any} size={small ? 13 : 15} color={def.color} />
      <Text style={{ color: def.color, fontSize: small ? 11 : 12, fontWeight: "700" }}>{def.label}</Text>
      <View style={{ flexDirection: "row", gap: 2, marginLeft: 2 }}>
        {[1, 2, 3].map((d) => (
          <View
            key={d}
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: d <= mood.intensity ? def.color : def.color + "40",
            }}
          />
        ))}
      </View>
    </View>
  );
}
