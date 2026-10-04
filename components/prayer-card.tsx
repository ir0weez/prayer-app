import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { type PrayerCard } from "@/lib/card-system";

type Props = {
  card: PrayerCard;
  earned: boolean;
  width?: number;
  onPress?: () => void;
};

export function PrayerCardView({ card, earned, width = 160, onPress }: Props) {
  // Full card images are 3:4.5 ratio (tall). Use contain to avoid cropping.
  const height = width * 1.5;

  // Locked: dark silhouette with hint.
  if (!earned) {
    const body = (
      <View
        style={{
          width,
          height,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: "#1a1a1a",
          borderWidth: 2,
          borderColor: "#333333",
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
        }}
      >
        <MaterialIcons name="help-outline" size={32} color="#555555" />
        <Text style={{ color: "#555555", fontSize: 10, textAlign: "center", marginTop: 8, lineHeight: 14 }}>
          {getHint(card)}
        </Text>
      </View>
    );
    if (onPress) {
      return (
        <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}>
          {body}
        </Pressable>
      );
    }
    return body;
  }

  // Earned: show the full premium card image (frame + text baked in).
  const body = (
    <View
      style={{
        width,
        height,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#0a0a0a",
      }}
    >
      <Image
        source={card.art}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
      />
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}>
        {body}
      </Pressable>
    );
  }
  return body;
}

function getHint(card: PrayerCard): string {
  const hints: Record<string, string> = {
    "first-task": "Schedule your first task",
    "curator": "Save your first album",
    "full-set": "Schedule one task of each type",
    "streak-5": "Reach a 5-day prayer streak",
    "streak-7": "Reach a 7-day prayer streak",
    "streak-10": "Reach a 10-day prayer streak",
    "streak-15": "Reach a 15-day prayer streak",
    "streak-20": "Reach a 20-day prayer streak",
    "streak-21": "Reach a 21-day prayer streak",
    "streak-25": "Reach a 25-day prayer streak",
    "streak-30": "Reach a 30-day prayer streak",
    "streak-50": "Reach a 50-day prayer streak",
    "streak-75": "Reach a 75-day prayer streak",
    "streak-100": "Reach a 100-day prayer streak",
    "fast-5": "Complete a 5-day fast",
    "fast-7": "Complete a 7-day fast",
    "fast-10": "Complete a 10-day fast",
    "fast-15": "Complete a 15-day fast",
    "fast-20": "Complete a 20-day fast",
    "fast-21": "Complete a 21-day fast",
    "fast-25": "Complete a 25-day fast",
    "fast-30": "Complete a 30-day fast",
    "fast-40": "Complete a 40-day fast",
    "fast-60": "Complete a 60-day fast",
    "fast-100": "Complete a 100-day fast",
    "fast-365": "Complete a 365-day fast",
    "evo-david-1": "Reach a 5-day prayer streak",
    "evo-david-2": "Reach a 15-day prayer streak",
    "evo-david-3": "Reach a 30-day prayer streak",
    "evo-peter-1": "Complete a 5-day fast",
    "evo-peter-2": "Complete a 15-day fast",
    "evo-peter-3": "Complete a 30-day fast",
    "evo-paul-1": "Reach a 10-day prayer streak",
    "evo-paul-2": "Reach a 20-day prayer streak",
    "evo-paul-3": "Reach a 50-day prayer streak",
  };
  return hints[card.achievementId] || "";
}
