/**
 * v294 — Time Off inside the schedule day.
 *
 * The trip band, the itinerary's travel cards, and claimed rest — the
 * pieces of a time-off day on the schedule page. One rule above all
 * (his, Oct 27): the time-off block is NEVER completable. Nothing here
 * toggles, checks, or collapses to a done bar; the band is a door —
 * tapping it opens the Time Off page.
 */

import { View, Text, Pressable, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { useSkin } from "@/hooks/use-skin";
import { mix } from "@/lib/color-themes";
import { hexLuminance } from "@/lib/skin-themes";
import { format12HourTime } from "@/lib/utils";
import {
  getTimeOffIcon,
  getTimeOffLabel,
  tripDayNumber,
  type ItineraryEntry,
  type TimeOff,
} from "@/lib/time-off";

export function tripBaseColor(timeOff: TimeOff): string {
  // Stored colours range over the shared palette and the older pastels;
  // a pastel deepens toward itself so the band always reads as a colour.
  const stored = timeOff.color || "#3B82F6";
  return hexLuminance(stored) > 0.82 ? mix(stored, "#000000", 0.38) : stored;
}

function formatRange(startDate: string, endDate: string): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

/** The trip band at the head of a time-off day. A door, never a checkbox. */
export function TripBand({ timeOff, date, onPress }: { timeOff: TimeOff; date: string; onPress: () => void }) {
  const colors = useColors();
  const { tokens: skinTokens } = useSkin();
  const base = tripBaseColor(timeOff);
  const day = tripDayNumber(timeOff, date);
  const bandBg = skinTokens.isTerminal ? undefined : mix(colors.surface, base, hexLuminance(colors.surface) < 0.5 ? 0.34 : 0.22);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${timeOff.title}. Tap to open Time Off.`}
      onPress={onPress}
      style={({ pressed }) => [{ marginHorizontal: 16, marginBottom: 10, opacity: pressed ? 0.75 : 1 }]}
    >
      <View
        style={{
          backgroundColor: bandBg ?? colors.surface,
          borderRadius: 22,
          paddingHorizontal: 16,
          paddingVertical: 13,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderLeftWidth: 5,
          borderLeftColor: base,
          ...(skinTokens.frame ?? {}),
          ...(skinTokens.isEightBit || skinTokens.isTerminal ? skinTokens.cardShadow ?? {} : { shadowColor: base, shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 }),
        }}
      >
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: base, alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name={getTimeOffIcon(timeOff.type) as any} size={22} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.foreground }} numberOfLines={1}>
            {timeOff.title}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }} numberOfLines={1}>
            {getTimeOffLabel(timeOff.type)} · {formatRange(timeOff.startDate, timeOff.endDate)}
          </Text>
        </View>
        {day && (
          <View style={{ backgroundColor: base, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>
              Day {day.day} of {day.total}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const ROUTE_RE = /([A-Za-z]{3})\s*→\s*([A-Za-z]{3})/;

/** One itinerary entry as it appears in the day's flow — a travel card. */
export function ItineraryDayCard({ entry, timeOff }: { entry: ItineraryEntry; timeOff: TimeOff }) {
  const colors = useColors();
  const { tokens: skinTokens } = useSkin();
  const base = tripBaseColor(timeOff);
  const route = entry.kind === "travel" ? entry.detail?.match(ROUTE_RE) : null;
  const surface = mix(colors.surface, base, hexLuminance(colors.surface) < 0.5 ? 0.2 : 0.1);

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 10,
        backgroundColor: surface,
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 13,
        ...(skinTokens.frame ?? {}),
      }}
    >
      {route ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: 21, fontWeight: "800", color: colors.foreground, letterSpacing: 0.4 }}>{route[1].toUpperCase()}</Text>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: base }} />
              <View style={{ flex: 1, borderTopWidth: 2, borderStyle: "dotted", borderColor: base }} />
              <MaterialIcons name="flight" size={16} color={base} style={{ transform: [{ rotate: "90deg" }] }} />
              <View style={{ flex: 1, borderTopWidth: 2, borderStyle: "dotted", borderColor: base }} />
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: base }} />
            </View>
            <Text style={{ fontSize: 21, fontWeight: "800", color: colors.foreground, letterSpacing: 0.4 }}>{route[2].toUpperCase()}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 9 }}>
            {entry.time && (
              <View style={{ backgroundColor: base, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>{format12HourTime(entry.time)}</Text>
              </View>
            )}
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 }} numberOfLines={1}>
              {entry.title}
            </Text>
          </View>
          {entry.address && (
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 5 }} numberOfLines={1}>
              {entry.address}
            </Text>
          )}
          {entry.detail && (
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, marginTop: 2 }} numberOfLines={1}>
              {entry.detail}
            </Text>
          )}
        </>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialIcons
              name={entry.kind === "stay" ? "hotel" : entry.kind === "travel" ? "directions-car" : "place"}
              size={18}
              color={base}
            />
            {entry.time && (
              <View style={{ backgroundColor: base, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>{format12HourTime(entry.time)}</Text>
              </View>
            )}
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 }} numberOfLines={1}>
              {entry.title}
            </Text>
          </View>
          {entry.address && (
            <Text style={{ fontSize: 12.5, color: colors.foreground, marginTop: 7, fontWeight: "600" }} numberOfLines={2}>
              {entry.address}
            </Text>
          )}
          {entry.detail && (
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }} numberOfLines={1}>
              {entry.detail}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

/**
 * Claimed rest — on a time-off day the open stretches are not white blocks
 * to fill; the trip claims them. A quiet tonal expanse in the trip's
 * colour family: no add rows, no cycling words, nothing to complete.
 * Tapping it opens the Time Off page, like the band.
 */
export function ClaimedRestBlock({
  timeOff,
  startTime,
  endTime,
  height,
  onPress,
}: {
  timeOff: TimeOff;
  startTime: string;
  endTime: string;
  height: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const base = tripBaseColor(timeOff);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${timeOff.title}, time off. Tap to open Time Off.`}
      onPress={onPress}
      style={({ pressed }) => [{ marginHorizontal: 16, marginBottom: 10, opacity: pressed ? 0.75 : 1 }]}
    >
      <View
        style={{
          height,
          borderRadius: 22,
          backgroundColor: mix(colors.surface, base, hexLuminance(colors.surface) < 0.5 ? 0.26 : 0.16),
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <MaterialIcons name={getTimeOffIcon(timeOff.type) as any} size={16} color={base} />
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.foreground }}>
            {timeOff.title} · Time off
          </Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: "500", color: colors.muted }}>
          {format12HourTime(startTime)} → {format12HourTime(endTime)}
        </Text>
      </View>
    </Pressable>
  );
}

export const timeOffTravelStyles = StyleSheet.create({});
