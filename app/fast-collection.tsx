import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { FASTS_STORAGE_KEY } from "@/lib/prayercircle-storage";
import {
  FAST_TYPES,
  calculateFastStreak,
  formatIsoToMmDdYyyy,
  getFastCalendarDays,
  getFastCompletionPercentage,
  getFastDateRangeLabel,
  getFastProgress,
  type PersonalFast,
} from "@/lib/prayercircle-fasting";
import { getTodayISOString } from "@/lib/prayercircle-data";

function typeMeta(fast: PersonalFast) {
  return (
    FAST_TYPES.find((t) => t.type === fast.type) ?? {
      type: fast.type,
      icon: "edit",
      color: "#8557D9",
    }
  );
}

function isActiveFast(fast: PersonalFast): boolean {
  const today = getTodayISOString();
  const days = getFastCalendarDays(fast);
  const end = days[days.length - 1];
  return !!end && fast.startDate <= today && end >= today;
}

function CompletionRing({
  percentage,
  color,
  size = 56,
}: {
  percentage: number;
  color: string;
  size?: number;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 5,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 5,
          borderColor: "transparent",
          borderTopColor: color,
          borderRightColor: percentage > 25 ? color : "transparent",
          borderBottomColor: percentage > 50 ? color : "transparent",
          borderLeftColor: percentage > 75 ? color : "transparent",
          transform: [{ rotate: "-45deg" }],
        }}
      />
      <Text style={{ fontSize: 12, fontWeight: "800", color: colors.foreground }}>
        {percentage}%
      </Text>
    </View>
  );
}

function FastTrophyCard({
  fast,
  expanded,
  onToggle,
}: {
  fast: PersonalFast;
  expanded: boolean;
  onToggle: () => void;
}) {
  const colors = useColors();
  const meta = typeMeta(fast);
  const progress = getFastProgress(fast);
  const percentage = getFastCompletionPercentage(fast);
  const streak = calculateFastStreak(fast);
  const active = isActiveFast(fast);
  const fullyComplete = percentage === 100;
  const days = useMemo(() => getFastCalendarDays(fast), [fast]);
  const notes = fast.dailyNotes ?? {};
  const noteDates = useMemo(
    () => days.filter((d) => notes[d]?.trim()),
    [days, notes]
  );

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 28,
        marginBottom: 12,
        borderWidth: fullyComplete ? 2 : 1,
        borderColor: fullyComplete ? "#D4AF37" : colors.border,
        overflow: "hidden",
      }}
    >
      <Pressable onPress={onToggle} style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: meta.color + "1A",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: fullyComplete ? 2 : 0,
              borderColor: "#D4AF37",
            }}
          >
            <MaterialIcons name={meta.icon as any} size={26} color={meta.color} />
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{ fontSize: 16, fontWeight: "800", color: colors.foreground, flex: 1 }}
                numberOfLines={1}
              >
                {fast.name}
              </Text>
              {fullyComplete && (
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#B8860B", marginLeft: 6 }}>
                  ★ COLLECTED
                </Text>
              )}
              {active && !fullyComplete && (
                <View
                  style={{
                    backgroundColor: "#22C55E1A",
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    marginLeft: 6,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#16A34A" }}>
                    IN PROGRESS
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              {fast.durationDays} days • {getFastDateRangeLabel(fast)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              {progress.completed}/{progress.total} completed
              {streak > 0 ? ` • 🔥 ${streak} streak` : ""}
            </Text>
          </View>
          <CompletionRing percentage={percentage} color={meta.color} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8 }}>
          <MaterialIcons
            name={expanded ? "expand-less" : "expand-more"}
            size={20}
            color={colors.muted}
          />
        </View>
      </Pressable>

      {expanded && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            padding: 16,
            paddingTop: 12,
          }}
        >
          {/* Key stats */}
          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            {[
              { label: "Completed", value: progress.completed, color: "#16A34A" },
              { label: "Skipped", value: progress.skipped, color: "#CA8A04" },
              { label: "Missed", value: progress.missed, color: "#DC2626" },
              { label: "Best streak", value: streak, color: meta.color },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: s.color }}>
                  {s.value}
                </Text>
                <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>
                  {s.label.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>

          {/* AI summary */}
          {fast.summary?.trim() ? (
            <View
              style={{
                backgroundColor: meta.color + "12",
                borderRadius: 14,
                padding: 14,
                marginBottom: 12,
                borderLeftWidth: 3,
                borderLeftColor: meta.color,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: meta.color,
                  marginBottom: 6,
                  letterSpacing: 1,
                }}
              >
                FAST SUMMARY
              </Text>
              <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 21 }}>
                {fast.summary}
              </Text>
            </View>
          ) : null}

          {/* Daily notes timeline */}
          {noteDates.length > 0 ? (
            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: colors.muted,
                  marginBottom: 8,
                  letterSpacing: 1,
                }}
              >
                DAILY NOTES
              </Text>
              {noteDates.map((date) => {
                const status = fast.dayStatuses[date];
                const dotColor =
                  status === "completed"
                    ? "#16A34A"
                    : status === "missed"
                      ? "#DC2626"
                      : "#CA8A04";
                return (
                  <View
                    key={date}
                    style={{ flexDirection: "row", marginBottom: 10, alignItems: "flex-start" }}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: dotColor,
                        marginTop: 4,
                        marginRight: 10,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>
                        {formatIsoToMmDdYyyy(date)}
                      </Text>
                      <Text
                        style={{ fontSize: 14, color: colors.foreground, marginTop: 2, lineHeight: 20 }}
                      >
                        {notes[date]}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.muted, fontStyle: "italic" }}>
              No daily notes recorded for this fast.
            </Text>
          )}

          {/* Focus items */}
          {fast.focusItems.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: colors.muted,
                  marginBottom: 6,
                  letterSpacing: 1,
                }}
              >
                FOCUS
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {fast.focusItems.map((item) => (
                  <View
                    key={item}
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      marginRight: 6,
                      marginBottom: 6,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: colors.foreground }}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function FastCollectionScreen() {
  const router = useRouter();
  const colors = useColors();
  const [fasts, setFasts] = useState<PersonalFast[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FASTS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const list: PersonalFast[] = Array.isArray(parsed) ? parsed : [];
        list.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
        setFasts(list);
      } catch {
        setFasts([]);
      }
    })();
  }, []);

  const collectedCount = fasts.filter(
    (f) => getFastCompletionPercentage(f) === 100
  ).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 48 }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
        >
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ fontSize: 24, color: colors.foreground }}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>
              Fast Collection
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              {collectedCount} of {fasts.length} fully collected
            </Text>
          </View>
          <MaterialIcons name="emoji-events" size={28} color="#D4AF37" />
        </View>

        {fasts.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <MaterialIcons name="emoji-events" size={64} color={colors.border} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.muted,
                marginTop: 12,
                textAlign: "center",
              }}
            >
              No fasts in your collection yet.{"\n"}Complete a fast to collect your first trophy.
            </Text>
          </View>
        ) : (
          fasts.map((fast) => (
            <FastTrophyCard
              key={fast.id}
              fast={fast}
              expanded={expandedId === fast.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === fast.id ? null : fast.id))
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
