/**
 * v294 — Time Off inside the schedule day.
 *
 * The trip band, the itinerary's travel cards, and claimed rest — the
 * pieces of a time-off day on the schedule page. One rule above all
 * (his, Oct 27): the time-off block is NEVER completable. Nothing here
 * toggles, checks, or collapses to a done bar; the band is a door —
 * tapping it opens the Time Off page.
 */

import { useEffect, useRef } from "react";
import { Animated, Easing, View, Text, Pressable, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { useSkin } from "@/hooks/use-skin";
import { mix } from "@/lib/color-themes";
import { hexLuminance } from "@/lib/skin-themes";
import { format12HourTime } from "@/lib/utils";
import { timeToMinutes, type TimeBlock } from "@/lib/time-blocks";
import {
  formatPassDate,
  formatPassDuration,
  getItineraryKindIcon,
  getItineraryKindLabel,
  getTimeOffIcon,
  getTimeOffLabel,
  itineraryKindColor,
  itineraryDetailLine,
  resolveItineraryKeyword,
  timeOffPassPalette,
  tripDayNumber,
  type ItineraryEntry,
  type TimeOff,
} from "@/lib/time-off";
import { KeywordAmbientAnimation } from "./schedule-tab";
import { detectShowFont } from "@/lib/show-fonts";
import { showNameSegments } from "./show-sub-line";

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

/**
 * v384 — the claimed block as a BOARDING PASS (his pick, Oct 31:
 * Depth A — Slim from time-off-ticket-concepts-v4.html; the v3
 * FINAL drawing underneath it). The whole palette derives from
 * the trip's OWN chosen colour (lib/time-off timeOffPassPalette):
 * paper, band, print, stub — a purple trip reads purple across
 * the entire pass. NOTHING fake prints on it (his explicit
 * ruling): no scan codes, no seat/gate/flight/serial numbers —
 * only the trip's real title, the block's real times, the day's
 * date, the block's duration, and the trip's note as REMARKS.
 * Height discipline (his core complaint, twice): the plain pass
 * stands at the drawing's ≈95px register — band ≈19, name row
 * ≈30, route ≈25, paddings trimmed; a REMARKS line adds ≈17.
 * Each block is its OWN pass — the v314 connected box is gone.
 */
export const PASS_STUB_WIDTH = 96;
/**
 * The keyword stamp's size — ONE modest footprint for every type
 * (his correction, Oct 31: the drawing's palm sprawled across
 * most of the pass and stopped reading as a shape; "It just
 * needs to come down more"). ≈ a third of the plain pass's
 * height, a filled silhouette seated low in the paper's body,
 * clear of the stub seam. Presence comes from the compact
 * readable shape, not sprawl and not opacity.
 */
export const PASS_STAMP_SIZE = 36;
export const PASS_STAMP_OPACITY_MIN = 0.13;
export const PASS_STAMP_OPACITY_MAX = 0.2;

/**
 * The stamp's slow drift (his "Shadow animations" note): the
 * house keyword-scene pattern — RN Animated, Animated.timing
 * with Easing.inOut(Easing.sin), transform/opacity only,
 * useNativeDriver, a start delay, cleanup on unmount (TwinkleStar
 * / RisingDot in schedule-tab are the models). One ≈9.2s loop;
 * the phase delay derives from the block's own start time, so a
 * wall of passes never pulses in sync. The print never moves.
 */
function PassStamp({ icon, color, phaseDelay }: { icon: string; color: string; phaseDelay: number }) {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 4600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 4600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => loop.start(), phaseDelay);
    return () => {
      clearTimeout(startTimeout);
      loop.stop();
    };
  }, [drift, phaseDelay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        right: 4,
        bottom: -8,
        opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [PASS_STAMP_OPACITY_MIN, PASS_STAMP_OPACITY_MAX] }),
        transform: [
          { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
          { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
        ],
      }}
    >
      <MaterialIcons name={icon as any} size={PASS_STAMP_SIZE} color={color} />
    </Animated.View>
  );
}

const passLabelStyle = { fontSize: 8.5, lineHeight: 11, fontWeight: "800" as const, letterSpacing: 1.6 };

/** One claimed block as its own boarding pass. A door, never a checkbox. */
function ClaimedRestPass({
  timeOff,
  date,
  startTime,
  endTime,
  durationMinutes,
  accessibilityLabel,
  onPress,
}: {
  timeOff: TimeOff;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const { isSkinned, tokens: skinTokens } = useSkin();
  const palette = timeOffPassPalette(timeOff, colors.surface);
  const pageBg = isSkinned ? skinTokens.background ?? colors.background : colors.background;
  const remarks = timeOff.notes?.trim() ? timeOff.notes.trim() : null;
  const duration = formatPassDuration(durationMinutes);
  const phaseDelay = (timeToMinutes(startTime) * 13) % 3500;
  const [fromTime, fromAmpm] = format12HourTime(startTime).split(" ");
  const [toTime, toAmpm] = format12HourTime(endTime).split(" ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
    >
      <View
        style={{
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: palette.border,
          backgroundColor: palette.paper,
          overflow: "hidden",
        }}
      >
        <View style={{ backgroundColor: palette.band, paddingTop: 3, paddingBottom: 4, paddingHorizontal: 14 }}>
          <Text style={{ fontSize: 9.5, lineHeight: 12, fontWeight: "800", letterSpacing: 4, color: "#FFFFFF" }}>
            BOARDING PASS
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1, minWidth: 0, paddingTop: 5, paddingBottom: 4, paddingLeft: 14, paddingRight: 12, position: "relative", overflow: "hidden" }}>
            <PassStamp icon={getTimeOffIcon(timeOff.type)} color={palette.stamp} phaseDelay={phaseDelay} />
            <View style={{ position: "relative" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <View style={{ flexShrink: 1, minWidth: 0 }}>
                  <Text style={{ ...passLabelStyle, color: palette.label }}>NAME</Text>
                  <Text style={{ fontSize: 15.5, lineHeight: 19, fontWeight: "800", letterSpacing: 0.4, color: palette.ink }} numberOfLines={1}>
                    {timeOff.title.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 14, flexShrink: 0 }}>
                  <View>
                    <Text style={{ ...passLabelStyle, color: palette.label }}>DATE</Text>
                    <Text style={{ fontSize: 12, lineHeight: 15, fontWeight: "700", color: palette.ink }}>
                      {formatPassDate(date)}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ ...passLabelStyle, color: palette.label }}>DURATION</Text>
                    <Text style={{ fontSize: 12, lineHeight: 15, fontWeight: "700", color: palette.ink }}>
                      {duration}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 7, marginTop: 4 }}>
                <View>
                  <Text style={{ ...passLabelStyle, color: palette.label }}>FROM</Text>
                  <Text style={{ fontSize: 17, lineHeight: 21, fontWeight: "800", letterSpacing: -0.4, color: palette.print }}>
                    {fromTime} <Text style={{ fontSize: 10, fontWeight: "800", letterSpacing: 0.2 }}>{fromAmpm}</Text>
                  </Text>
                </View>
                <View style={{ paddingBottom: 3 }}>
                  <MaterialIcons name="flight" size={13} color={palette.band} style={{ transform: [{ rotate: "90deg" }] }} />
                </View>
                <View>
                  <Text style={{ ...passLabelStyle, color: palette.label }}>TO</Text>
                  <Text style={{ fontSize: 17, lineHeight: 21, fontWeight: "800", letterSpacing: -0.4, color: palette.print }}>
                    {toTime} <Text style={{ fontSize: 10, fontWeight: "800", letterSpacing: 0.2 }}>{toAmpm}</Text>
                  </Text>
                </View>
              </View>
              {remarks && (
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 7, marginTop: 3 }}>
                  <Text style={{ ...passLabelStyle, color: palette.label }}>REMARKS</Text>
                  <Text style={{ fontSize: 11.5, lineHeight: 14, fontWeight: "700", color: palette.ink, flexShrink: 1 }} numberOfLines={1}>
                    {remarks}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View
            style={{
              width: PASS_STUB_WIDTH,
              backgroundColor: palette.stub,
              borderLeftWidth: 2,
              borderLeftColor: palette.seam,
              borderStyle: "dashed",
              paddingTop: 5,
              paddingBottom: 4,
              paddingLeft: 10,
              paddingRight: 8,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 10.5, lineHeight: 13, fontWeight: "800", color: palette.print }}>
              {format12HourTime(startTime)}
            </Text>
            <Text style={{ fontSize: 8, lineHeight: 10, color: palette.band, marginLeft: 1 }}>▼</Text>
            <Text style={{ fontSize: 10.5, lineHeight: 13, fontWeight: "800", color: palette.print }}>
              {format12HourTime(endTime)}
            </Text>
            <View style={{ marginTop: 3 }}>
              <Text style={{ fontSize: 8, lineHeight: 10, fontWeight: "800", letterSpacing: 1.6, color: palette.label }}>
                DURATION
              </Text>
              <Text style={{ fontSize: 16.5, lineHeight: 19, fontWeight: "800", letterSpacing: -0.4, color: palette.print }}>
                {duration}
              </Text>
            </View>
          </View>
        </View>
        {/* The perforation's punched notches, seated on the seam. */}
        <View style={{ position: "absolute", right: PASS_STUB_WIDTH - 8, top: 12, width: 16, height: 16, borderRadius: 8, backgroundColor: pageBg, zIndex: 3 }} />
        <View style={{ position: "absolute", right: PASS_STUB_WIDTH - 8, bottom: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: pageBg, zIndex: 3 }} />
      </View>
    </Pressable>
  );
}

/** The trip band at the head of a time-off day. A door, never a checkbox. */
export function TripBand({ timeOff, date, onPress }: { timeOff: TimeOff; date: string; onPress: () => void }) {
  const colors = useColors();
  const { isSkinned, tokens: skinTokens } = useSkin();
  const base = tripBaseColor(timeOff);
  const day = tripDayNumber(timeOff, date);
  const bandBg = skinTokens.isTerminal ? undefined : mix(colors.surface, base, hexLuminance(colors.surface) < 0.5 ? 0.34 : 0.22);
  // v317 (his device verdict on v314, Oct 28 18:28, screenshot
  // 10859, confirmed by his correction Oct 28 18:35): "did you
  // make the time-off card bigger? It was better skinnier..." /
  // "I said I wanted the day-off thing smaller... I liked the
  // time-off" — the v314 proper tonal card is DELETED and the
  // v308 slim band below is restored exactly. (v314 had applied
  // his Oct 28 14:54 correction — the same one he gave the Up
  // Next line — to this band too; on device he reversed it for
  // the band. Up Next he did NOT reverse — see schedule-tab.)
  // v308 (his Oct 28 verdict on the v295 band: too big, "just
  // looks like another event card", and its eyebrow doubled —
  // "TIME OFF · TIME OFF"): the slim day-state band from
  // schedule-upnext-timeoff-v1.html, measured — height 46, radius
  // 12 (the day's cards are 22), solid trip colour, ONE line: a
  // sun-glyph chip, the trip's title, a dot, the day's own short
  // date with the day count, and a chevron. The eyebrow is
  // deleted entirely. Still a door, never a checkbox. (The
  // in-flow claimed-block chips below are a different element he
  // likes — untouched here.)
  if (!isSkinned) {
    const [dy, dm, dd] = date.split("-").map(Number);
    const dayLabel = new Date(dy, dm - 1, dd).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${timeOff.title}. Tap to open Time Off.`}
        onPress={onPress}
        style={({ pressed }) => [{ marginHorizontal: 12, marginBottom: 12, opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={{ height: 46, borderRadius: 12, backgroundColor: base, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 11, paddingRight: 13, shadowColor: base, shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
          <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.20)", alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="wb-sunny" size={15} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.15 }} numberOfLines={1}>
            {timeOff.title}
          </Text>
          <View style={{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.55)" }} />
          <Text style={{ fontSize: 12.5, fontWeight: "600", color: "rgba(255,255,255,0.88)", flex: 1 }} numberOfLines={1}>
            {dayLabel}{day ? ` · Day ${day.day} of ${day.total}` : ""}
          </Text>
          <MaterialIcons name="chevron-right" size={16} color="rgba(255,255,255,0.85)" />
        </View>
      </Pressable>
    );
  }
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
  const { isSkinned, tokens: skinTokens } = useSkin();
  const base = tripBaseColor(timeOff);
  const route = entry.kind === "travel" ? entry.detail?.match(ROUTE_RE) : null;
  const surface = mix(colors.surface, base, hexLuminance(colors.surface) < 0.5 ? 0.2 : 0.1);
  // v302: the kind's own icon + colour step ride the day card too, so a
  // Food stop reads as Food here exactly as it does on the timeline.
  const kindIcon = getItineraryKindIcon(entry.kind);
  const kindColor = itineraryKindColor(entry.kind, base);
  // v303 (his ask, Oct 28): the entry's keyword, resolved exactly as an
  // event's is — a stored label wins, else detection over title +
  // address + detail (the detail line is the notes surface: a show
  // named there picks its own scene, like event notes do). The card
  // STAYS a time-off card: the trip-colour band and the kind label
  // ride untouched above; the artwork fills the BODY beneath them,
  // never the whole card. No keyword → the card renders as it always
  // has, byte for byte.
  const keyword = resolveItineraryKeyword(entry);
  const detailLine = itineraryDetailLine(entry);
  // The artwork body's one sub-line, composed the event way:
  // [S/E read · detail · address].
  const artSubLine = keyword ? [detailLine, entry.address].filter(Boolean).join(" · ") : "";
  // v308: the show's name in that sub-line wears its title font,
  // exactly as on the event card (lib/show-fonts.ts). Detection
  // runs over the detail (the notes surface) + title; the segments
  // engage only when the name is present in the composed line —
  // otherwise the node below is the plain string, byte-identical.
  const showFont = keyword?.label === "TV Show" ? detectShowFont(entry.detail, entry.title) : null;
  const detailSegments = showFont && detailLine ? showNameSegments(detailLine, showFont) : null;
  const hasShowSegments = Array.isArray(detailSegments);
  const artSubLineNode = hasShowSegments ? <>{detailSegments}{entry.address ? ` · ${entry.address}` : ""}</> : artSubLine;
  const inkShadow = keyword
    ? { textShadowColor: "rgba(0,0,0,0.35)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }
    : {};

  // v295 (Classic): the Friday drawing's travel card — a white card
  // whose head is a 38px band in the trip's colour: the time pill at
  // its left (translucent white), the kind label at its right; the
  // route read or the plan row in the body below.
  if (!isSkinned) {
    return (
      <View
        style={{
          marginHorizontal: 12,
          marginBottom: 12,
          backgroundColor: colors.surface,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: mix(colors.primary, colors.surface, 0.85),
          overflow: "hidden",
        }}
      >
        <View style={{ height: 38, backgroundColor: base, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
          {entry.time && (
            <View style={{ backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>{format12HourTime(entry.time)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <MaterialIcons name={kindIcon as any} size={13} color="rgba(255,255,255,0.9)" />
          <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }}>
            {getItineraryKindLabel(entry.kind).toUpperCase()}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 14, paddingVertical: 11, ...(keyword ? { position: "relative" as const } : {}) }}>
          {keyword && (
            <>
              <KeywordAmbientAnimation label={keyword.label} title={entry.title} location={entry.address} notes={entry.detail} />
              <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.22)" }} />
            </>
          )}
          {route ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 21, fontWeight: "800", color: keyword ? "#FFFFFF" : colors.foreground, letterSpacing: 0.4, ...inkShadow }}>{route[1].toUpperCase()}</Text>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: keyword ? "rgba(255,255,255,0.9)" : base }} />
                  <View style={{ flex: 1, borderTopWidth: 2, borderStyle: "dotted", borderColor: keyword ? "rgba(255,255,255,0.7)" : base }} />
                  <MaterialIcons name="flight" size={16} color={keyword ? "#FFFFFF" : base} style={{ transform: [{ rotate: "90deg" }] }} />
                  <View style={{ flex: 1, borderTopWidth: 2, borderStyle: "dotted", borderColor: keyword ? "rgba(255,255,255,0.7)" : base }} />
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: keyword ? "rgba(255,255,255,0.9)" : base }} />
                </View>
                <Text style={{ fontSize: 21, fontWeight: "800", color: keyword ? "#FFFFFF" : colors.foreground, letterSpacing: 0.4, ...inkShadow }}>{route[2].toUpperCase()}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: keyword ? "#FFFFFF" : colors.foreground, marginTop: 8, ...inkShadow }} numberOfLines={1}>
                {entry.title}
              </Text>
            </>
          ) : keyword ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialIcons name={kindIcon as any} size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF", flex: 1, ...inkShadow }} numberOfLines={1}>
                  {entry.title}
                </Text>
              </View>
              {artSubLine ? (
                <Text style={{ fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.92)", marginTop: 3, textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} numberOfLines={1}>
                  {artSubLineNode}
                </Text>
              ) : null}
            </>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialIcons name={kindIcon as any} size={18} color={kindColor} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 }} numberOfLines={1}>
                {entry.title}
              </Text>
            </View>
          )}
          {!keyword && entry.address && (
            <Text style={{ fontSize: 12.5, color: colors.foreground, marginTop: 7, fontWeight: "600" }} numberOfLines={2}>
              {entry.address}
            </Text>
          )}
          {!keyword && entry.detail && (
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }} numberOfLines={1}>
              {entry.detail}
            </Text>
          )}
          {keyword && route && entry.address ? (
            <Text style={{ fontSize: 12.5, color: "rgba(255,255,255,0.95)", marginTop: 7, fontWeight: "600", ...inkShadow }} numberOfLines={2}>
              {entry.address}
            </Text>
          ) : null}
          {keyword && route && detailLine ? (
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 3, ...inkShadow }} numberOfLines={1}>
              {detailLine}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

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
        ...(keyword ? { overflow: "hidden" as const } : {}),
      }}
    >
      {keyword && (
        <>
          <KeywordAmbientAnimation label={keyword.label} title={entry.title} location={entry.address} notes={entry.detail} />
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.22)" }} />
        </>
      )}
      {route ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: 21, fontWeight: "800", color: keyword ? "#FFFFFF" : colors.foreground, letterSpacing: 0.4, ...inkShadow }}>{route[1].toUpperCase()}</Text>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: keyword ? "rgba(255,255,255,0.9)" : base }} />
              <View style={{ flex: 1, borderTopWidth: 2, borderStyle: "dotted", borderColor: keyword ? "rgba(255,255,255,0.7)" : base }} />
              <MaterialIcons name="flight" size={16} color={keyword ? "#FFFFFF" : base} style={{ transform: [{ rotate: "90deg" }] }} />
              <View style={{ flex: 1, borderTopWidth: 2, borderStyle: "dotted", borderColor: keyword ? "rgba(255,255,255,0.7)" : base }} />
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: keyword ? "rgba(255,255,255,0.9)" : base }} />
            </View>
            <Text style={{ fontSize: 21, fontWeight: "800", color: keyword ? "#FFFFFF" : colors.foreground, letterSpacing: 0.4, ...inkShadow }}>{route[2].toUpperCase()}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 9 }}>
            {entry.time && (
              <View style={{ backgroundColor: base, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>{format12HourTime(entry.time)}</Text>
              </View>
            )}
            <Text style={{ fontSize: 14, fontWeight: "700", color: keyword ? "#FFFFFF" : colors.foreground, flex: 1, ...inkShadow }} numberOfLines={1}>
              {entry.title}
            </Text>
          </View>
          {entry.address && (
            <Text style={{ fontSize: 12, color: keyword ? "rgba(255,255,255,0.95)" : colors.muted, marginTop: 5, ...inkShadow }} numberOfLines={1}>
              {entry.address}
            </Text>
          )}
          {(keyword ? detailLine : entry.detail) && (
            <Text style={{ fontSize: 12, fontWeight: "600", color: keyword ? "rgba(255,255,255,0.85)" : colors.muted, marginTop: 2, ...inkShadow }} numberOfLines={1}>
              {hasShowSegments ? detailSegments : (keyword ? detailLine : entry.detail)}
            </Text>
          )}
        </>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialIcons name={kindIcon as any} size={18} color={keyword ? "#FFFFFF" : kindColor} />
            {entry.time && (
              <View style={{ backgroundColor: base, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>{format12HourTime(entry.time)}</Text>
              </View>
            )}
            <Text style={{ fontSize: 14, fontWeight: "700", color: keyword ? "#FFFFFF" : colors.foreground, flex: 1, ...inkShadow }} numberOfLines={1}>
              {entry.title}
            </Text>
          </View>
          {entry.address && (
            <Text style={{ fontSize: 12.5, color: keyword ? "rgba(255,255,255,0.95)" : colors.foreground, marginTop: 7, fontWeight: "600", ...inkShadow }} numberOfLines={2}>
              {entry.address}
            </Text>
          )}
          {(keyword ? detailLine : entry.detail) && (
            <Text style={{ fontSize: 12, color: keyword ? "rgba(255,255,255,0.85)" : colors.muted, marginTop: 3, ...inkShadow }} numberOfLines={1}>
              {hasShowSegments ? detailSegments : (keyword ? detailLine : entry.detail)}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

/**
 * Claimed rest — on a time-off day the open stretches are not white blocks
 * to fill; the trip claims them. v384: the claimed block renders as
 * its own boarding pass (see ClaimedRestPass above) — no add rows,
 * no cycling words, nothing to complete. Tapping it opens the
 * Time Off page, like the band. The pass's height is its own
 * (≈95px register); the old proportional white-block height no
 * longer applies, so the prop is gone.
 */
export function ClaimedRestBlock({
  timeOff,
  date,
  startTime,
  endTime,
  onPress,
}: {
  timeOff: TimeOff;
  date?: string;
  startTime: string;
  endTime: string;
  onPress: () => void;
}) {
  const { isSkinned } = useSkin();
  return (
    <View style={{ marginHorizontal: isSkinned ? 16 : 12, marginBottom: isSkinned ? 10 : 12 }}>
      <ClaimedRestPass
        timeOff={timeOff}
        date={date ?? timeOff.startDate}
        startTime={startTime}
        endTime={endTime}
        durationMinutes={timeToMinutes(endTime) - timeToMinutes(startTime)}
        accessibilityLabel={`${timeOff.title}, time off. Tap to open Time Off.`}
        onPress={onPress}
      />
    </View>
  );
}

export const timeOffTravelStyles = StyleSheet.create({});

/**
 * v314 — a run of ADJACENT claimed blocks, grouped by
 * groupAdjacentClaimed (lib/whites) before they get here.
 * v384 (supersedes the v314 dress): the ONE connected box with
 * hairline dividers is GONE — each block in the run renders as
 * its OWN boarding pass with a gap between passes (the approved
 * drawing shows separate passes). The grouping still arrives
 * here as a run; EACH block keeps its own tap target opening
 * the Time Off page. The entries' `height` (the whites'
 * proportional sizing) no longer drives anything — a pass
 * stands at its own ≈95px register. Never completable: nothing
 * here toggles, checks, or collapses.
 */
export function ClaimedRestGroup({
  timeOff,
  date,
  blocks,
  onPressBlock,
}: {
  timeOff: TimeOff;
  date: string;
  blocks: Array<{ block: TimeBlock; height: number }>;
  onPressBlock: (block: TimeBlock) => void;
}) {
  const { isSkinned } = useSkin();
  if (blocks.length === 0) return null;
  return (
    <View style={{ marginHorizontal: isSkinned ? 16 : 12, marginBottom: isSkinned ? 10 : 12 }}>
      {blocks.map(({ block }, index) => (
        <View key={block.id} style={index < blocks.length - 1 ? { marginBottom: 10 } : undefined}>
          <ClaimedRestPass
            timeOff={timeOff}
            date={date}
            startTime={block.startTime}
            endTime={block.endTime}
            durationMinutes={block.durationMinutes}
            accessibilityLabel={`${timeOff.title}, time off, ${format12HourTime(block.startTime)} to ${format12HourTime(block.endTime)}. Tap to open Time Off.`}
            onPress={() => onPressBlock(block)}
          />
        </View>
      ))}
    </View>
  );
}
