import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  COINS_STORAGE_KEY,
  SHOP_ITEMS,
  SHOP_OWNED_KEY,
  parseCoins,
  parseOwnedItems,
  type HometownCoins,
  type ShopItem,
} from "@/lib/hometown";

export default function HometownShopScreen() {
  const router = useRouter();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [owned, setOwned] = useState<string[]>([]);
  const [tier] = useState(1); // TODO: derive from active fast day

  const saveCoins = useCallback((next: HometownCoins) => {
    setCoins(next);
    AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const saveOwned = useCallback((next: string[]) => {
    setOwned(next);
    AsyncStorage.setItem(SHOP_OWNED_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [coinsRaw, ownedRaw] = await Promise.all([
          AsyncStorage.getItem(COINS_STORAGE_KEY),
          AsyncStorage.getItem(SHOP_OWNED_KEY),
        ]);
        setCoins(parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {}));
        setOwned(parseOwnedItems(ownedRaw ? JSON.parse(ownedRaw) : []));
      } catch {}
    })();
  }, []);

  const handleBuy = (item: ShopItem) => {
    if (owned.includes(item.id)) return;
    if (tier < item.tier) {
      Alert.alert("Locked", `Unlocks at tier ${item.tier}.`);
      return;
    }
    if (coins.balance < item.cost) {
      Alert.alert("Not enough coins", `You need ${item.cost.toFixed(2)} coins.`);
      return;
    }
    Alert.alert(
      `Buy ${item.name}?`,
      `${item.description}\n\nCost: 🪙${item.cost}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Buy",
          onPress: () => {
            saveCoins({ balance: coins.balance - item.cost, lifetimeEarned: coins.lifetimeEarned });
            saveOwned([...owned, item.id]);
          },
        },
      ]
    );
  };

  const sections: { title: string; type: ShopItem["type"] }[] = [
    { title: "Monuments", type: "monument" },
    { title: "Decorations", type: "decoration" },
    { title: "Pawn Skins", type: "pawn-skin" },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FFFBEB" }} contentContainerStyle={{ padding: 16, paddingTop: 48 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>🛍️ Town Shop</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontSize: 16 }}>🪙</Text>
          <Text style={{ marginLeft: 6, fontWeight: "700" }}>{coins.balance.toFixed(2)}</Text>
        </View>
      </View>

      {sections.map((section) => {
        const items = SHOP_ITEMS.filter((i) => i.type === section.type);
        if (items.length === 0) return null;
        return (
          <View key={section.type} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 8 }}>{section.title}</Text>
            {items.map((item) => {
              const isOwned = owned.includes(item.id);
              const locked = tier < item.tier;
              const affordable = coins.balance >= item.cost;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleBuy(item)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                    opacity: isOwned || locked ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{item.icon}</Text>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ fontWeight: "700" }}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: "#78716C" }}>{item.description}</Text>
                    {locked && <Text style={{ fontSize: 11, color: "#F59E0B" }}>🔒 Tier {item.tier}</Text>}
                    {isOwned && <Text style={{ fontSize: 11, color: "#22C55E" }}>✓ Owned</Text>}
                  </View>
                  {!isOwned && !locked && (
                    <Text style={{ fontWeight: "700", color: affordable ? "#000" : "#999" }}>
                      🪙{item.cost.toFixed(2)}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}
