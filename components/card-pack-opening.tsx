import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { getCardByAchievementId, RARITY_COLORS } from "@/lib/card-system";
import { PrayerCardView } from "./prayer-card";
import { useColors } from "@/hooks/use-colors";

type Props = {
  achievementId: string | null;
  onClose: () => void;
  onViewCollection: () => void;
};

export function CardPackOpening({ achievementId, onClose, onViewCollection }: Props) {
  const colors = useColors();
  const [revealed, setRevealed] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const card = achievementId ? getCardByAchievementId(achievementId) : undefined;

  useEffect(() => {
    if (achievementId) {
      setRevealed(false);
      flipAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [achievementId]);

  const handleReveal = () => {
    if (revealed) return;
    setRevealed(true);
    Animated.parallel([
      Animated.timing(flipAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  };

  const flipInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  if (!card) return null;

  return (
    <Modal transparent visible={!!achievementId} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(10,8,20,0.85)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        {!revealed ? (
          <Pressable onPress={handleReveal} style={{ alignItems: "center" }}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "900", letterSpacing: 1.5, marginBottom: 16 }}>
              NEW CARD EARNED!
            </Text>
            {/* Card back */}
            <View
              style={{
                width: 200,
                height: 280,
                borderRadius: 14,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: "#FFFFFF",
              }}
            >
              <MaterialIcons name="style" size={64} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800", marginTop: 12 }}>Tap to reveal</Text>
            </View>
          </Pressable>
        ) : (
          <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: "center" }}>
            <Text style={{ color: RARITY_COLORS[card.rarity], fontSize: 14, fontWeight: "900", letterSpacing: 1.5, marginBottom: 16 }}>
              {card.rarity.toUpperCase()} CARD!
            </Text>
            <Animated.View style={{ transform: [{ rotateY: flipInterpolate }] }}>
              <PrayerCardView card={card} earned width={220} />
            </Animated.View>
            <Text style={{ color: "#FFFFFF", fontSize: 13, fontStyle: "italic", textAlign: "center", marginTop: 16, paddingHorizontal: 20 }}>
              "{card.flavor}"
            </Text>
            <Text style={{ color: "#FFFFFF", fontSize: 11, textAlign: "center", marginTop: 4, opacity: 0.6 }}>
              {card.scripture}
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <Pressable
                onPress={onClose}
                style={{ backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
              >
                <Text style={{ color: colors.foreground, fontWeight: "800" }}>Close</Text>
              </Pressable>
              <Pressable
                onPress={() => { onClose(); onViewCollection(); }}
                style={{ backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>View Collection</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}
