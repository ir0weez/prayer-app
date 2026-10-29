// Collections book — fish species, demon bestiary, flower types.
// Caught entries show in color; uncaught show as silhouettes.

import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { WavyProgress } from "@/components/wavy-progress";
import { MaterialIcons } from "@expo/vector-icons";
import {
  COLLECTION_SETS,
  FISH_SPECIES,
  FLOWER_KINDS,
  RARITY_COLORS,
  SHELL_SPECIES,
  loadCollections,
  type CollectionSetId,
  type CollectionState,
} from "@/lib/collections";
import { ShellArt } from "@/components/shell-art";
import { RoadBadgesSection } from "@/components/road-badges";
import { ALL_DEMON_NAMES } from "@/lib/dark-forest";

type Props = {
  visible: boolean;
  onClose: () => void;
  pt: { card: string; text: string; subtext: string };
};

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  // v339: the set bars wear the wavy fill (his Oct 29 ruling) —
  // same seat, colours, and clamp.
  return (
    <View style={{ marginTop: 6 }}>
      <WavyProgress value={Math.min(100, Math.max(0, pct)) / 100} color={color} trackColor="rgba(0,0,0,0.08)" height={8} />
    </View>
  );
}

export function CollectionsBook({ visible, onClose, pt }: Props) {
  const [state, setState] = useState<CollectionState | null>(null);
  // v331: "The Road" (the era badges) is its own section of the book —
  // a fifth tab beside the four collection sets, drawn by its own
  // component; it is NOT a collection set (no coins, no title).
  const [tab, setTab] = useState<CollectionSetId | "road">("fish");

  useEffect(() => {
    if (visible) {
      loadCollections().then(setState).catch(() => setState(null));
    }
  }, [visible ]);

  const isRoad = tab === "road";
  // Only read in the sets branch below; "fish" stands in while the
  // Road tab is up so the value is never null.
  const meta = COLLECTION_SETS[isRoad ? "fish" : (tab as CollectionSetId)];
  const caughtCount = isRoad
    ? 0
    : tab === "fish"
      ? state?.fish.length ?? 0
      : tab === "demons"
        ? state?.demons.length ?? 0
        : tab === "shells"
          ? state?.shells.length ?? 0
          : state?.flowers.length ?? 0;
  const isComplete = !isRoad && (state?.completedSets ?? []).includes(tab as CollectionSetId);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
        onPress={onClose}
      >
        <Pressable
          style={{ backgroundColor: pt.card, borderRadius: 16, padding: 16, width: "100%", maxWidth: 380, maxHeight: "85%" }}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <MaterialIcons name="collections-bookmark" size={24} color="#6D28D9" />
            <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: "800", color: pt.text }}>Collections</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={22} color={pt.subtext} />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            {(Object.keys(COLLECTION_SETS) as CollectionSetId[]).map((id) => {
              const m = COLLECTION_SETS[id];
              const active = tab === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setTab(id)}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    paddingVertical: 8,
                    alignItems: "center",
                    backgroundColor: active ? "#EDE9FE" : "rgba(0,0,0,0.04)",
                    borderWidth: 1,
                    borderColor: active ? "#7C3AED" : "transparent",
                  }}
                >
                  <MaterialIcons name={m.icon as any} size={20} color={active ? "#6D28D9" : pt.subtext} />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "#6D28D9" : pt.subtext, marginTop: 2, textAlign: "center" }}>
                    {m.name}
                  </Text>
                </Pressable>
              );
            })}
            {/* v331: The Road — the era badges' own tab. */}
            <Pressable
              onPress={() => setTab("road")}
              style={{
                flex: 1,
                borderRadius: 10,
                paddingVertical: 8,
                alignItems: "center",
                backgroundColor: isRoad ? "#FBF3DC" : "rgba(0,0,0,0.04)",
                borderWidth: 1,
                borderColor: isRoad ? "#C9963C" : "transparent",
              }}
            >
              <MaterialIcons name="route" size={20} color={isRoad ? "#A67C1B" : pt.subtext} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: isRoad ? "#A67C1B" : pt.subtext, marginTop: 2, textAlign: "center" }}>
                The Road
              </Text>
            </Pressable>
          </View>

          {isRoad ? (
            <RoadBadgesSection pt={pt} />
          ) : (
            <>
          {/* Progress */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: pt.text }}>
                {caughtCount}/{meta.total} collected
              </Text>
              {isComplete && (
                <View style={{ marginLeft: 8, backgroundColor: "#FEF3C7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#92400E" }}>COMPLETE</Text>
                </View>
              )}
            </View>
            <ProgressBar pct={(caughtCount / meta.total) * 100} color="#7C3AED" />
            <Text style={{ fontSize: 12, color: pt.subtext, marginTop: 6 }}>
              Complete the set: +{meta.rewardCoins} coins, +{meta.rewardXp} XP, title "{meta.rewardTitle}"
            </Text>
          </View>

          {/* Entries */}
          <ScrollView style={{ maxHeight: 320 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {tab === "fish" &&
                FISH_SPECIES.map((f) => {
                  const caught = state?.fish.includes(f.id) ?? false;
                  return (
                    <View
                      key={f.id}
                      style={{
                        width: "31%",
                        borderRadius: 10,
                        padding: 8,
                        alignItems: "center",
                        backgroundColor: caught ? "#F0FDF4" : "rgba(0,0,0,0.04)",
                        borderWidth: 1,
                        borderColor: caught ? RARITY_COLORS[f.rarity] : "transparent",
                        opacity: caught ? 1 : 0.55,
                      }}
                    >
                      <MaterialIcons
                        name="phishing"
                        size={26}
                        color={caught ? f.color : "#9CA3AF"}
                      />
                      <Text style={{ fontSize: 11, fontWeight: "700", color: caught ? pt.text : "#9CA3AF", marginTop: 4, textAlign: "center" }}>
                        {caught ? f.name : "???"}
                      </Text>
                      <Text style={{ fontSize: 10, color: caught ? RARITY_COLORS[f.rarity] : "#9CA3AF", textTransform: "capitalize" }}>
                        {f.rarity}
                      </Text>
                    </View>
                  );
                })}
              {tab === "demons" &&
                ALL_DEMON_NAMES.map((name) => {
                  const caught = state?.demons.includes(name) ?? false;
                  return (
                    <View
                      key={name}
                      style={{
                        width: "31%",
                        borderRadius: 10,
                        padding: 8,
                        alignItems: "center",
                        backgroundColor: caught ? "#FEF2F2" : "rgba(0,0,0,0.04)",
                        borderWidth: 1,
                        borderColor: caught ? "#DC2626" : "transparent",
                        opacity: caught ? 1 : 0.55,
                      }}
                    >
                      <MaterialIcons name="bug-report" size={26} color={caught ? "#DC2626" : "#9CA3AF"} />
                      <Text style={{ fontSize: 11, fontWeight: "700", color: caught ? pt.text : "#9CA3AF", marginTop: 4, textAlign: "center" }}>
                        {caught ? name : "???"}
                      </Text>
                    </View>
                  );
                })}
              {tab === "shells" &&
                SHELL_SPECIES.map((s) => {
                  const caught = state?.shells.includes(s.id) ?? false;
                  return (
                    <View
                      key={s.id}
                      style={{
                        width: "31%",
                        borderRadius: 10,
                        padding: 8,
                        alignItems: "center",
                        backgroundColor: caught ? "#F0F9FF" : "rgba(0,0,0,0.04)",
                        borderWidth: 1,
                        borderColor: caught ? RARITY_COLORS[s.rarity] : "transparent",
                        opacity: caught ? 1 : 0.55,
                      }}
                    >
                      <ShellArt icon={s.icon} color={caught ? s.color : "#9CA3AF"} size={28} />
                      <Text style={{ fontSize: 11, fontWeight: "700", color: caught ? pt.text : "#9CA3AF", marginTop: 4, textAlign: "center" }}>
                        {caught ? s.name : "???"}
                      </Text>
                      <Text style={{ fontSize: 10, color: caught ? RARITY_COLORS[s.rarity] : "#9CA3AF", textTransform: "capitalize" }}>
                        {s.rarity}
                      </Text>
                    </View>
                  );
                })}
              {tab === "flowers" &&
                FLOWER_KINDS.map((f) => {
                  const caught = state?.flowers.includes(f.kind) ?? false;
                  return (
                    <View
                      key={f.kind}
                      style={{
                        width: "31%",
                        borderRadius: 10,
                        padding: 8,
                        alignItems: "center",
                        backgroundColor: caught ? "#FDF2F8" : "rgba(0,0,0,0.04)",
                        borderWidth: 1,
                        borderColor: caught ? "#EC4899" : "transparent",
                        opacity: caught ? 1 : 0.55,
                      }}
                    >
                      <MaterialIcons name="local-florist" size={26} color={caught ? "#EC4899" : "#9CA3AF"} />
                      <Text style={{ fontSize: 11, fontWeight: "700", color: caught ? pt.text : "#9CA3AF", marginTop: 4, textAlign: "center" }}>
                        {caught ? f.name : "???"}
                      </Text>
                    </View>
                  );
                })}
            </View>
          </ScrollView>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
