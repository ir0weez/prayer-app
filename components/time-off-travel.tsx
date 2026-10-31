/**
 * v294 — Time Off inside the schedule day.
 *
 * The trip band, the itinerary's travel cards, and claimed rest — the
 * pieces of a time-off day on the schedule page. One rule above all
 * (his, Oct 27): the time-off block is NEVER completable. Nothing here
 * toggles, checks, or collapses to a done bar; the band is a door —
 * tapping it opens the Time Off page.
 *
 * v385 — the boarding pass lives HERE, on the itinerary entries
 * placed in the schedule day (ItineraryEntryPass); the claimed
 * rest wears its pre-v384 dress again. See the pass machinery
 * note above PASS_STUB_WIDTH for the move and his words for it.
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
 * The boarding-pass machinery — built in v384 for the claimed
 * blocks, MOVED in v385 to its correct home (his correction,
 * Oct 31: "I wanted the time off events to be the tickets, not
 * the white spaces… Whatever I put into this time off creator
 * page" — narrowed further: "Not in the timeline of the time
 * off page itself. Just on the events placed in the schedule
 * from the time off timeline"). The pass now dresses the trip's
 * itinerary entries where they are placed in the schedule day
 * (ItineraryEntryPass, below); the claimed blocks wear their
 * pre-v384 dress again (restored below). The whole palette
 * derives from the trip's OWN chosen colour (lib/time-off
 * timeOffPassPalette): paper, band, print, stub — a purple
 * trip reads purple across the entire pass. NOTHING fake
 * prints on it (his explicit ruling): no scan codes, no
 * invented numbers of any kind — only the entry's real title,
 * its real time, the day's date, its kind, and its own note
 * as REMARKS. Height discipline (his core complaint, twice):
 * the plain pass stands at the drawing's ≈95px register —
 * band ≈19, name row ≈30, route ≈25, paddings trimmed; a
 * REMARKS line adds ≈17.
 */
export const PASS_STUB_WIDTH = 96;
/**
 * The keyword stamp's size — ONE modest footprint for every
 * kind (his correction, Oct 31: the drawing's palm sprawled
 * across most of the pass and stopped reading as a shape; "It
 * just needs to come down more"). ≈ a third of the plain
 * pass's height, a filled silhouette seated low in the paper's
 * body, clear of the stub seam. Presence comes from the
 * compact readable shape, not sprawl and not opacity.
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
 * the phase delay derives from the entry's own start time, so a
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
 * to fill; the trip claims them. A quiet tonal expanse in the trip's
 * colour family: no add rows, no cycling words, nothing to complete.
 * Tapping it opens the Time Off page, like the band.
 *
 * v385 (Oct 31): this dress is RESTORED exactly as v383 left it.
 * v384 put the boarding pass here; his correction the same day
 * ("I wanted the time off events to be the tickets, not the
 * white spaces") moved the pass to the itinerary entries placed
 * in the schedule — ItineraryEntryPass, at the foot of this
 * file — and the claimed blocks went back to this face.
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
  const { isSkinned } = useSkin();
  const base = tripBaseColor(timeOff);
  // v295 (Classic): the Friday drawing's claimed block — the trip's
  // icon and name CENTRED over the claimed range, in the trip's
  // colour family. Skins keep the left/right row.
  if (!isSkinned) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${timeOff.title}, time off. Tap to open Time Off.`}
        onPress={onPress}
        style={({ pressed }) => [{ marginHorizontal: 12, marginBottom: 12, opacity: pressed ? 0.75 : 1 }]}
      >
        <View
          style={{
            height,
            borderRadius: 22,
            backgroundColor: mix(colors.surface, base, 0.16),
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <MaterialIcons name={getTimeOffIcon(timeOff.type) as any} size={16} color={base} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: base }}>
              Time off — {timeOff.title}
            </Text>
          </View>
          <Text style={{ fontSize: 11.5, fontWeight: "500", color: mix(base, colors.muted, 0.4) }}>
            {format12HourTime(startTime)} → {format12HourTime(endTime)}
          </Text>
        </View>
      </Pressable>
    );
  }
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

/**
 * v314 — a run of ADJACENT claimed blocks as ONE connected group
 * (his ruling, Oct 28 14:35: "Time off blocks that are close to
 * each other should work the same as the white blocks… these two
 * should be connected to each other"). The geometry mirrors the
 * whites' group (TimeBlockGroup): ONE outer box in the trip's
 * tonal family, a hairline divider between blocks, and EACH block
 * still its own tap target opening the Time Off page — the blocks
 * are grouped by groupAdjacentClaimed (lib/whites) before they get
 * here, and a run of one renders the same box with no divider.
 * Never completable: nothing here toggles, checks, or collapses.
 *
 * v385 (Oct 31): the connected box is RESTORED with the rest of
 * the pre-v384 claimed dress — v384's separate passes on these
 * blocks were the wrong surface (his correction, same day: the
 * tickets belong to the itinerary entries placed in the
 * schedule). The grouping, per-block tap targets, and
 * never-completable behaviour stand exactly as v314 left them.
 */
export function ClaimedRestGroup({
  timeOff,
  blocks,
  onPressBlock,
}: {
  timeOff: TimeOff;
  blocks: Array<{ block: TimeBlock; height: number }>;
  onPressBlock: (block: TimeBlock) => void;
}) {
  const colors = useColors();
  const { isSkinned } = useSkin();
  const base = tripBaseColor(timeOff);
  if (blocks.length === 0) return null;
  // v295 (Classic): the claimed face — the trip's icon and name
  // CENTRED over the claimed range, as the single block renders it;
  // in the group the same face repeats per row inside the one box.
  if (!isSkinned) {
    return (
      <View
        style={{
          marginHorizontal: 12,
          marginBottom: 12,
          borderRadius: 22,
          backgroundColor: mix(colors.surface, base, 0.16),
          overflow: "hidden",
        }}
      >
        {blocks.map(({ block, height }, index) => (
          <Pressable
            key={block.id}
            accessibilityRole="button"
            accessibilityLabel={`${timeOff.title}, time off, ${format12HourTime(block.startTime)} to ${format12HourTime(block.endTime)}. Tap to open Time Off.`}
            onPress={() => onPressBlock(block)}
            style={({ pressed }) => [{
              height,
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              opacity: pressed ? 0.75 : 1,
              ...(index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: mix(colors.surface, base, 0.5) } : {}),
            }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <MaterialIcons name={getTimeOffIcon(timeOff.type) as any} size={16} color={base} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: base }}>
                Time off — {timeOff.title}
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, fontWeight: "500", color: mix(base, colors.muted, 0.4) }}>
              {format12HourTime(block.startTime)} → {format12HourTime(block.endTime)}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 22,
        backgroundColor: mix(colors.surface, base, hexLuminance(colors.surface) < 0.5 ? 0.26 : 0.16),
        overflow: "hidden",
      }}
    >
      {blocks.map(({ block, height }, index) => (
        <Pressable
          key={block.id}
          accessibilityRole="button"
          accessibilityLabel={`${timeOff.title}, time off, ${format12HourTime(block.startTime)} to ${format12HourTime(block.endTime)}. Tap to open Time Off.`}
          onPress={() => onPressBlock(block)}
          style={({ pressed }) => [{
            height,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: pressed ? 0.75 : 1,
            ...(index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border } : {}),
          }]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <MaterialIcons name={getTimeOffIcon(timeOff.type) as any} size={16} color={base} />
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.foreground }}>
              {timeOff.title} · Time off
            </Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: "500", color: colors.muted }}>
            {format12HourTime(block.startTime)} → {format12HourTime(block.endTime)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * v385 — one itinerary entry, placed in the schedule day, as a
 * BOARDING PASS. This is the pass's correct home (his corrected
 * spec, Oct 31: "I wanted the time off events to be the tickets,
 * not the white spaces… Whatever I put into this time off
 * creator page" — narrowed further: "Not in the timeline of
 * the time off page itself. Just on the events placed in the
 * schedule from the time off timeline"). The Time Off page's
 * own timeline keeps its artwork cards, untouched; the claimed
 * white spaces wear their restored dress, above.
 *
 * The anatomy is the v384 pass's, fed by the entry's real data:
 * NAME is the entry's title, DATE is the entry's day, the big
 * print is the entry's own time, REMARKS is the entry's own
 * detail line (composed the day card's way, season/episode
 * read included). An entry carries ONE time — no end, no
 * duration exists anywhere in its record — so the pass prints
 * a departure, never an invented arrival: FROM carries the
 * time, and the stub's big print is the entry's kind. The
 * trip dyes the pass (entries carry no colour of their own —
 * the palette derives from the parent Time Off record's
 * stored colour, the type default as fallback, exactly as
 * timeOffPassPalette has always resolved it). The stamp is
 * the entry KIND's icon — the same glyph the creator's
 * add-row chips and entry rows use — at the one modest size,
 * drifting as the pass stamps drift.
 *
 * Behaviour is the day card's own, unchanged: this card is
 * not a door and never completable — it renders inert,
 * exactly as ItineraryDayCard does today. An entry with NO
 * time cannot print a departure, so it keeps the ordinary
 * day card: the fallback below, mirrored at the schedule-tab
 * call site.
 */
export function ItineraryEntryPass({ entry, timeOff }: { entry: ItineraryEntry; timeOff: TimeOff }) {
  const colors = useColors();
  const { isSkinned, tokens: skinTokens } = useSkin();
  if (!entry.time) {
    return <ItineraryDayCard entry={entry} timeOff={timeOff} />;
  }
  const startTime = entry.time;
  const palette = timeOffPassPalette(timeOff, colors.surface);
  const pageBg = isSkinned ? skinTokens.background ?? colors.background : colors.background;
  const remarks = itineraryDetailLine(entry);
  const kindLabel = getItineraryKindLabel(entry.kind).toUpperCase();
  const day = tripDayNumber(timeOff, entry.date);
  const phaseDelay = (timeToMinutes(startTime) * 13) % 3500;
  const [fromTime, fromAmpm] = format12HourTime(startTime).split(" ");
  return (
    <View style={{ marginHorizontal: isSkinned ? 16 : 12, marginBottom: isSkinned ? 10 : 12 }}>
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
            <PassStamp icon={getItineraryKindIcon(entry.kind)} color={palette.stamp} phaseDelay={phaseDelay} />
            <View style={{ position: "relative" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <View style={{ flexShrink: 1, minWidth: 0 }}>
                  <Text style={{ ...passLabelStyle, color: palette.label }}>NAME</Text>
                  <Text style={{ fontSize: 15.5, lineHeight: 19, fontWeight: "800", letterSpacing: 0.4, color: palette.ink }} numberOfLines={1}>
                    {entry.title.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 14, flexShrink: 0 }}>
                  <View>
                    <Text style={{ ...passLabelStyle, color: palette.label }}>DATE</Text>
                    <Text style={{ fontSize: 12, lineHeight: 15, fontWeight: "700", color: palette.ink }}>
                      {formatPassDate(entry.date)}
                    </Text>
                  </View>
                  {day && (
                    <View>
                      <Text style={{ ...passLabelStyle, color: palette.label }}>TRIP</Text>
                      <Text style={{ fontSize: 12, lineHeight: 15, fontWeight: "700", color: palette.ink }}>
                        {`DAY ${day.day} OF ${day.total}`}
                      </Text>
                    </View>
                  )}
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
            <View style={{ marginTop: 3 }}>
              <Text style={{ fontSize: 8, lineHeight: 10, fontWeight: "800", letterSpacing: 1.6, color: palette.label }}>
                KIND
              </Text>
              <Text style={{ fontSize: 16.5, lineHeight: 19, fontWeight: "800", letterSpacing: -0.4, color: palette.print }} numberOfLines={1}>
                {kindLabel}
              </Text>
            </View>
          </View>
        </View>
        {/* The perforation's punched notches, seated on the seam. */}
        <View style={{ position: "absolute", right: PASS_STUB_WIDTH - 8, top: 12, width: 16, height: 16, borderRadius: 8, backgroundColor: pageBg, zIndex: 3 }} />
        <View style={{ position: "absolute", right: PASS_STUB_WIDTH - 8, bottom: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: pageBg, zIndex: 3 }} />
      </View>
    </View>
  );
}
