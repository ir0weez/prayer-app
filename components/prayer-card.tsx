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
  const height = width * 1.4;

  const body = (
    <View
      style={{
        width,
        height,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: earned ? rarityColor : colors.border,
        opacity: earned ? 1 : 0.55,
      }}
    >
      {/* Art */}
      <View style={{ height: height * 0.52, backgroundColor: colors.border }}>
        {earned ? (
          <Image source={card.art} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="help-outline" size={40} color={colors.muted} />
          </View>
        )}
        {/* HP badge */}
        {earned && (
          <View
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              backgroundColor: "rgba(0,0,0,0.65)",
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>{card.hp} HP</Text>
          </View>
        )}
      </View>

      {/* Name */}
      <View style={{ paddingHorizontal: 8, paddingTop: 6 }}>
        <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 13, fontWeight: "800" }}>
          {earned ? card.name : "???"}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 10, marginTop: 1 }}>
          {earned ? card.subtitle : card.moves ? "" : ""}
          {earned ? null : getHint(card)}
        </Text>
      </View>

      {/* Moves */}
      {earned && (
        <View style={{ paddingHorizontal: 8, paddingTop: 4, gap: 3 }}>
          {card.moves.map((move) => (
            <View key={move.name} style={{ flexDirection: "row", alignItems: "center" }}>
              <Text numberOfLines={1} style={{ flex: 1, color: colors.foreground, fontSize: 10, fontWeight: "600" }}>
                {move.name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700" }}>{move.damage}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Rarity */}
      <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 8, paddingBottom: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: earned ? rarityColor : colors.muted, marginRight: 4 }} />
          <Text style={{ color: earned ? rarityColor : colors.muted, fontSize: 9, fontWeight: "800", textTransform: "uppercase" }}>
            {RARITY_LABELS[card.rarity]}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 9, marginLeft: 4 }}>{card.type}</Text>
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
