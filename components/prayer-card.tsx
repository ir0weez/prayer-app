import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { RARITY_COLORS, RARITY_LABELS, type PrayerCard } from "@/lib/card-system";
import { useColors } from "@/hooks/use-colors";

type Props = {
  card: PrayerCard;
  earned: boolean;
  width?: number;
  onPress?: () => void;
};

export function PrayerCardView({ card, earned, width = 160, onPress }: Props) {
  const colors = useColors();
  const rarityColor = RARITY_COLORS[card.rarity];
  const height = width * 1.45;

  // Premium dark card design.
  const cardBg = "#141414";
  const goldText = "#D4AF37";
  const mutedText = "#888888";

  const body = (
    <View
      style={{
        width,
        height,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: cardBg,
        borderWidth: 2,
        borderColor: earned ? rarityColor : "#333333",
        opacity: earned ? 1 : 0.5,
        padding: 8,
      }}
    >
      {/* Name + HP */}
      <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 6 }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, color: earned ? goldText : mutedText, fontSize: 13, fontWeight: "700", fontFamily: "serif" }}
        >
          {earned ? card.name : "???"}
        </Text>
        {earned && (
          <Text style={{ color: mutedText, fontSize: 10, fontWeight: "600", marginLeft: 4 }}>
            {card.hp} HP
          </Text>
        )}
      </View>

      {/* Art */}
      <View
        style={{
          height: height * 0.48,
          borderRadius: 6,
          overflow: "hidden",
          backgroundColor: "#0a0a0a",
          borderWidth: 1,
          borderColor: earned ? rarityColor : "#333333",
        }}
      >
        {earned ? (
          <Image source={card.art} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="help-outline" size={36} color={mutedText} />
          </View>
        )}
      </View>

      {/* Moves */}
      {earned ? (
        <View style={{ marginTop: 8 }}>
          {card.moves.map((move, i) => (
            <View
              key={move.name}
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                paddingVertical: 4,
                borderBottomWidth: i === 0 ? 1 : 0,
                borderBottomColor: "#2a2a2a",
              }}
            >
              <Text numberOfLines={1} style={{ flex: 1, color: "#CCCCCC", fontSize: 11, fontFamily: "serif" }}>
                {move.name}
              </Text>
              <Text style={{ color: goldText, fontSize: 12, fontWeight: "700" }}>{move.damage}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: mutedText, fontSize: 10, textAlign: "center", lineHeight: 14 }}>
            {getHint(card)}
          </Text>
        </View>
      )}

      {/* Rarity + Type */}
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: earned ? rarityColor : mutedText, fontSize: 9, fontWeight: "800", letterSpacing: 1 }}>
            {RARITY_LABELS[card.rarity].toUpperCase()}
          </Text>
          {earned && (
            <Text style={{ color: mutedText, fontSize: 9 }}>{card.type}</Text>
          )}
        </View>
      </View>
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
    "streak-7": "Reach a 7-day prayer streak",
    "fast-7": "Complete a 7-day fast",
    "streak-21": "Reach a 21-day prayer streak",
    "fast-21": "Complete a 21-day fast",
    "fast-40": "Complete a 40-day fast",
    "streak-50": "Reach a 50-day prayer streak",
    "fast-100": "Complete a 100-day fast",
    "streak-100": "Reach a 100-day prayer streak",
    "fast-365": "Complete a 365-day fast",
  };
  return hints[card.achievementId] || "";
}
