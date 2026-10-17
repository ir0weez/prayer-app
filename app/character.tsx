import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  STAT_DEFS,
  PERKS,
  MAX_STAT,
  loadStats,
  allocateStatPoint,
  availableStatPoints,
  grantStatPointsForLevel,
  type CharacterStats,
  type StatId,
} from "@/lib/character-stats";
import { loadXPState } from "@/lib/xp-engine";

const BG = "#1E1B4B";
const CARD = "rgba(255,255,255,0.08)";
const LABEL = "#A78BFA";
const ACCENT = "#7C5CFF";

function StatRow({
  statId,
  value,
  canAllocate,
  onAllocate,
}: {
  statId: StatId;
  value: number;
  canAllocate: boolean;
  onAllocate: () => void;
}) {
  const def = STAT_DEFS.find((d) => d.id === statId)!;
  const maxed = value >= MAX_STAT;
  return (
    <View style={{ backgroundColor: CARD, borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: def.color + "22",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name={def.icon as any} size={22} color={def.color} />
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>{def.name}</Text>
          <Text style={{ color: LABEL, fontSize: 11 }}>{def.effectLabel}</Text>
        </View>
        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 20, marginRight: 8 }}>
          {value}
        </Text>
        <Pressable
          onPress={onAllocate}
          disabled={!canAllocate || maxed}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: canAllocate && !maxed ? ACCENT : "rgba(255,255,255,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="add" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
      {/* Pips */}
      <View style={{ flexDirection: "row", marginTop: 8, gap: 4 }}>
        {Array.from({ length: MAX_STAT }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              backgroundColor: i < value ? def.color : "rgba(255,255,255,0.12)",
            }}
          />
        ))}
      </View>
      <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 6 }}>
        {def.description}
      </Text>
    </View>
  );
}

export default function CharacterScreen() {
  const [stats, setStats] = useState<CharacterStats | null>(null);
  const [points, setPoints] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const xp = await loadXPState();
      // Backfill points for existing levels.
      await grantStatPointsForLevel(xp.level).catch(() => {});
      const [s, p] = await Promise.all([loadStats(), availableStatPoints()]);
      setStats(s);
      setPoints(p);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleAllocate = async (statId: StatId) => {
    const ok = await allocateStatPoint(statId);
    if (ok) refresh();
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginLeft: 4 }}>
            Character
          </Text>
        </View>
        <Text style={{ color: LABEL, fontSize: 13, marginBottom: 16 }}>
          Earn 1 stat point per level. Spend them to grow stronger.
        </Text>

        {/* Points banner */}
        <View
          style={{
            backgroundColor: points > 0 ? ACCENT : CARD,
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <MaterialIcons name="stars" size={24} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16, marginLeft: 10 }}>
            {points} {points === 1 ? "point" : "points"} available
          </Text>
        </View>

        {/* Stats */}
        {stats &&
          STAT_DEFS.map((def) => (
            <StatRow
              key={def.id}
              statId={def.id}
              value={stats[def.id]}
              canAllocate={points > 0}
              onAllocate={() => handleAllocate(def.id)}
            />
          ))}

        {/* Perks */}
        <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginTop: 12, marginBottom: 4 }}>
          Perks
        </Text>
        <Text style={{ color: LABEL, fontSize: 12, marginBottom: 12 }}>
          Unlock at stat thresholds 5 and 8.
        </Text>
        {stats &&
          PERKS.map((perk) => {
            const unlocked = (stats[perk.stat] || 1) >= perk.required;
            const statDef = STAT_DEFS.find((d) => d.id === perk.stat)!;
            return (
              <View
                key={perk.id}
                style={{
                  backgroundColor: CARD,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  opacity: unlocked ? 1 : 0.55,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: unlocked ? statDef.color + "33" : "rgba(255,255,255,0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons
                    name={unlocked ? (perk.icon as any) : "lock"}
                    size={20}
                    color={unlocked ? statDef.color : "rgba(255,255,255,0.5)"}
                  />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
                    {perk.name}
                  </Text>
                  <Text style={{ color: LABEL, fontSize: 11 }}>{perk.description}</Text>
                </View>
                <Text style={{ color: unlocked ? "#4ADE80" : "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700" }}>
                  {unlocked ? "UNLOCKED" : `${statDef.name} ${perk.required}`}
                </Text>
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
}
