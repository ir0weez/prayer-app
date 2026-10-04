import { useEffect, useState } from "react";
import { Dimensions, FlatList, Modal, Pressable, SafeAreaView, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { PRAYER_CARDS, RARITY_LABELS, type CardRarity } from "@/lib/card-system";
import { loadAchievementState } from "@/lib/avatar-achievements";
import { type AchievementId } from "@/lib/avatar-system";
import { PrayerCardView } from "./prayer-card";
import { useColors } from "@/hooks/use-colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  showcaseCardId?: string;
  onSetShowcase?: (cardId: string) => void;
};

const RARITY_ORDER: CardRarity[] = ["common", "rare", "epic", "legendary"];

export function CardBinder({ visible, onClose, showcaseCardId, onSetShowcase }: Props) {
  const colors = useColors();
  const [unlockedIds, setUnlockedIds] = useState<AchievementId[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadAchievementState().then((state) => setUnlockedIds(state.unlockedAchievementIds));
    }
  }, [visible]);

  const selectedCard = PRAYER_CARDS.find((c) => c.id === selectedCardId);
  const earnedCount = PRAYER_CARDS.filter((c) => unlockedIds.includes(c.achievementId as AchievementId)).length;

  // Group by rarity.
  const grouped = RARITY_ORDER.map((rarity) => ({
    rarity,
    cards: PRAYER_CARDS.filter((c) => c.rarity === rarity),
  }));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Pressable onPress={onClose} style={{ marginRight: 12 }}>
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>Card Collection</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{earnedCount} of {PRAYER_CARDS.length} earned</Text>
          </View>
        </View>

        <FlatList
          data={grouped}
          keyExtractor={(g) => g.rarity}
          contentContainerStyle={{ padding: 16 }}
          removeClippedSubviews={false}
          renderItem={({ item: group }) => (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "800", marginBottom: 10, textTransform: "uppercase" }}>
                {RARITY_LABELS[group.rarity]}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {group.cards.map((card) => {
                  const earned = unlockedIds.includes(card.achievementId as AchievementId);
                  return (
                    <PrayerCardView
                      key={card.id}
                      card={card}
                      earned={earned}
                      width={110}
                      onPress={() => setSelectedCardId(card.id)}
                    />
                  );
                })}
              </View>
            </View>
          )}
        />

        {/* Card detail modal */}
        <Modal visible={!!selectedCard} transparent animationType="fade" onRequestClose={() => setSelectedCardId(null)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <Pressable style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} onPress={() => setSelectedCardId(null)} />
            {selectedCard && (
              <View style={{ alignItems: "center", maxHeight: "90%" }}>
                <PrayerCardView card={selectedCard} earned width={Dimensions.get("window").width * 0.85} />
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontStyle: "italic", textAlign: "center", marginTop: 16, paddingHorizontal: 16 }}>
                  "{selectedCard.flavor}"
                </Text>
                <Text style={{ color: "#FFFFFF", fontSize: 12, textAlign: "center", marginTop: 4, opacity: 0.7 }}>
                  {selectedCard.scripture}
                </Text>
                {onSetShowcase && (
                  <Pressable
                    onPress={() => { onSetShowcase(selectedCard.id); setSelectedCardId(null); }}
                    style={{ marginTop: 16, backgroundColor: showcaseCardId === selectedCard.id ? colors.border : colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, alignItems: "center" }}
                  >
                    <Text style={{ color: showcaseCardId === selectedCard.id ? colors.muted : "#FFFFFF", fontWeight: "800" }}>
                      {showcaseCardId === selectedCard.id ? "Showcased on Profile" : "Showcase on Profile"}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setSelectedCardId(null)}
                  style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 24 }}
                >
                  <Text style={{ color: colors.muted, fontWeight: "600" }}>Close</Text>
                </Pressable>
              </View>
            )}
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}
