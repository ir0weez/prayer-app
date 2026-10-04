import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Image, Modal, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { getCardByAchievementId, RARITY_COLORS } from "@/lib/card-system";
import { useColors } from "@/hooks/use-colors";

type Props = {
  achievementIds: string[];
  onClose: () => void;
  onViewCollection: () => void;
};

export function CardPackOpening({ achievementIds, onClose, onViewCollection }: Props) {
  const colors = useColors();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const achievementId = achievementIds[index] || null;
  const card = achievementId ? getCardByAchievementId(achievementId) : undefined;
  const hasMore = index < achievementIds.length - 1;

  useEffect(() => {
    setIndex(0);
    setRevealed(false);
    scaleAnim.setValue(0.8);
    fadeAnim.setValue(0);
  }, [achievementIds.join(",")]);

  const resetForCard = () => {
    setRevealed(false);
    scaleAnim.setValue(0.8);
    fadeAnim.setValue(0);
  };

  const handleReveal = () => {
    if (revealed) return;
    setRevealed(true);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const handleNext = () => {
    if (hasMore) {
      setIndex(index + 1);
      resetForCard();
    } else {
      onClose();
    }
  };

  if (!card || achievementIds.length === 0) return null;

  return (
    <Modal transparent visible={achievementIds.length > 0} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(10,8,20,0.92)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        {achievementIds.length > 1 && (
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 12 }}>
            Card {index + 1} of {achievementIds.length}
          </Text>
        )}
        {!revealed ? (
          <Pressable onPress={handleReveal} style={{ alignItems: "center" }}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "900", letterSpacing: 1.5, marginBottom: 16 }}>
              NEW CARD EARNED!
            </Text>
            <View
              style={{
                width: 200,
                height: 300,
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
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: "center", maxHeight: "85%" }}>
            <Text style={{ color: RARITY_COLORS[card.rarity], fontSize: 14, fontWeight: "900", letterSpacing: 1.5, marginBottom: 12 }}>
              {card.rarity.toUpperCase()} CARD!
            </Text>
            <Image
              source={card.fullArt}
              style={{ width: Dimensions.get("window").width * 0.8, height: Dimensions.get("window").width * 0.8 * 1.5, borderRadius: 8 }}
              resizeMode="contain"
            />
            <Text style={{ color: "#FFFFFF", fontSize: 13, fontStyle: "italic", textAlign: "center", marginTop: 12, paddingHorizontal: 20 }}>
              "{card.flavor}"
            </Text>
            <Text style={{ color: "#FFFFFF", fontSize: 11, textAlign: "center", marginTop: 4, opacity: 0.6 }}>
              {card.scripture}
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              {hasMore ? (
                <Pressable
                  onPress={handleNext}
                  style={{ backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 12 }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Next Card</Text>
                </Pressable>
              ) : (
                <>
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
                </>
              )}
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}
