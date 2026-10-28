/**
 * v294 — Time Off, rebuilt to the approved blend (his pick, Oct 27:
 * Style 2 Expressive's voice carrying Style 3 Journey's insides).
 *
 * Three faces over the same lib/time-off data:
 * - LIST: the next trip is the hero — a saturated colour field with an
 *   oversized countdown and the route read across it; other trips are
 *   strong cards; past trips collapse under "Earlier".
 * - BOOK: range-first — an M3 date-range calendar with a live coverage
 *   summary, then the details (title, type, the SHARED seven colours,
 *   the Notify toggle every creator carries, notes).
 * - TRIP: the itinerary timeline — big date numerals, a flight drawn as
 *   a route card, a stay set as a booking block, plans as simple rows —
 *   with Add to timeline at the foot.
 *
 * Nothing here completes anything: time off is booked, edited, and
 * planned — never checked off.
 *
 * v314 — the LIST rebuilt to the blend DRAWING itself (artifact
 * "time-off-style-concepts", the blend frame at the top), after his
 * Oct 28 verdict that the v294 build "doesn't look even close to
 * the mockup I agreed to": the hero takes the drawing's asymmetric
 * shape (36px corners, one 14px corner), its kind PILL (a warm step
 * of the trip's colour, not bare text), the 96/900 countdown with
 * NO second count anywhere on the card (one number story per trip:
 * what, when, how long), and the sun/hills scenic band across its
 * foot with the route read standing on it ("The route, at a
 * glance"). The other trips are SOLID trip-colour cards in the
 * drawing's mirrored shape, each carrying its own single number
 * (its days). Book time off is the drawing's solid seed pill at
 * the foot of the list. The TRIP face drops its colour header card
 * and its caption ("the whole trip, in order" — captions are not
 * UI) for the drawing's title block (32/900 on the surface, the
 * facts as one sub-line) and its day heads (44/900 numeral, weekday,
 * month, a rule) — the entries themselves keep the v302/v303
 * mechanics untouched.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Svg, { Circle, Path } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";
import { useSkin } from "@/hooks/use-skin";
import { PaperSettle } from "./paper-motion";
import { BitSettle } from "./bit-motion";
import { DateTimePicker } from "./date-time-picker";
import { TimeOffExport } from "./time-off-export";
import { mix } from "@/lib/color-themes";
import { scheduleMaterialTones } from "@/lib/schedule-material";
import {
  SCHEDULE_COLOR_PALETTE,
  SCHEDULE_EVENTS_KEY,
  SCHEDULE_MINISTRIES_KEY,
  SCHEDULE_TODOS_KEY,
  EVENT_KEYWORD_MAP,
  detectEventKeyword,
} from "@/lib/schedule-data";
import {
  createTimeOff,
  deleteTimeOff,
  deriveRouteRead,
  getAllTimeOff,
  getItineraryForDate,
  getItineraryKindIcon,
  getItineraryKindLabel,
  getTimeOffIcon,
  getTimeOffLabel,
  itineraryKindColor,
  itineraryDetailLine,
  resolveItineraryKeyword,
  ITINERARY_KINDS as ALL_ITINERARY_KINDS,
  groupItineraryByDate,
  heroTrip,
  pastTrips,
  sortItinerary,
  tripDayNumber,
  upcomingTrips,
  updateTimeOff,
  daysUntilTrip,
  calculateTimeOffDuration,
  type ItineraryEntry,
  type ItineraryKind,
  type TimeOff,
  type TimeOffType,
} from "@/lib/time-off";
import { detectShowFont } from "@/lib/show-fonts";
import { showNameSegments } from "./show-sub-line";
import { generateId } from "@/lib/schedule-data";
import { format12HourTime } from "@/lib/utils";
import { tripBaseColor } from "./time-off-travel";
import { KeywordAmbientAnimation } from "./schedule-tab";

const TIME_OFF_TYPES: TimeOffType[] = ["vacation", "sick", "personal", "sabbatical", "other"];
// v302: the six kinds come from the model (lib/time-off) — one source
// for the list, the labels, and the icons, chips and cards alike.
const ITINERARY_KINDS: Array<{ kind: ItineraryKind; label: string; icon: string }> =
  ALL_ITINERARY_KINDS.map((kind) => ({ kind, label: getItineraryKindLabel(kind), icon: getItineraryKindIcon(kind) }));

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDay(iso: string): string {
  return parseISO(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtRange(t: TimeOff): string {
  const end = parseISO(t.endDate);
  const endStr = end.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  return `${fmtDay(t.startDate)} – ${endStr}`;
}

type ExperienceView = "list" | "book" | "trip" | "entry";

interface TimeOffExperienceProps {
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
  initialTripId?: string | null;
}

export function TimeOffExperience({ visible, onClose, onChanged, initialTripId = null }: TimeOffExperienceProps) {
  const colors = useColors();
  const { isPaper, tokens: skinTokens } = useSkin();
  const tones = scheduleMaterialTones(colors.primary, colors.surface);
  const [view, setView] = useState<ExperienceView>("list");
  const [trips, setTrips] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [earlierOpen, setEarlierOpen] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // Book form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fTitle, setFTitle] = useState("");
  const [fType, setFType] = useState<TimeOffType>("vacation");
  const [fStart, setFStart] = useState(todayISO());
  const [fEnd, setFEnd] = useState(todayISO());
  const [fColor, setFColor] = useState(SCHEDULE_COLOR_PALETTE[5].hex); // Blue
  const [fNotify, setFNotify] = useState(true);
  const [fNotes, setFNotes] = useState("");
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [scheduledDates, setScheduledDates] = useState<Set<string>>(new Set());
  const [coverageItems, setCoverageItems] = useState<{ events: Array<{ date: string }>; ministries: Array<{ date: string }> }>({ events: [], ministries: [] });

  // Itinerary entry form state
  const [entryKind, setEntryKind] = useState<ItineraryKind>("travel");
  const [entryDate, setEntryDate] = useState(todayISO());
  const [entryTime, setEntryTime] = useState("");
  const [entryTitle, setEntryTitle] = useState("");
  const [entryAddress, setEntryAddress] = useState("");
  const [entryDetail, setEntryDetail] = useState("");
  // v303: the entry form speaks the event keyword system — a picked
  // keyword label binds to the entry (as events store theirs), and a
  // TV Show entry trades its address box for Season + Episode.
  const [entryKeyword, setEntryKeyword] = useState<string | undefined>(undefined);
  const [entrySeason, setEntrySeason] = useState("");
  const [entryEpisode, setEntryEpisode] = useState("");
  const [entryTitleFocused, setEntryTitleFocused] = useState(false);

  // The event form's TV Show test, mirrored: a picked label wins,
  // else the title is keyword-detected; the bare title counts too.
  const entryDetectedKeyword = entryKeyword
    ? EVENT_KEYWORD_MAP.find((k) => k.label === entryKeyword)
    : detectEventKeyword(entryTitle);
  const entryIsTVShow =
    entryDetectedKeyword?.label === "TV Show" || entryTitle.trim().toLowerCase() === "tv show";
  // The event form's title autocomplete, same rules: focused, 2+
  // chars, label or keyword matches, label matches first, top five.
  const entryTitleSuggestions = (() => {
    const q = entryTitle.trim().toLowerCase();
    if (q.length < 2 || !entryTitleFocused) return [];
    const matches = EVENT_KEYWORD_MAP.filter((k) => {
      if (k.label.toLowerCase().includes(q)) return true;
      return k.keywords.some((kw) => kw.toLowerCase().includes(q));
    });
    matches.sort((a, b) => {
      const aLabel = a.label.toLowerCase().includes(q) ? 0 : 1;
      const bLabel = b.label.toLowerCase().includes(q) ? 0 : 1;
      return aLabel - bLabel;
    });
    return matches.slice(0, 5);
  })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, eventsRaw, ministriesRaw, todosRaw] = await Promise.all([
        getAllTimeOff(),
        AsyncStorage.getItem(SCHEDULE_EVENTS_KEY),
        AsyncStorage.getItem(SCHEDULE_MINISTRIES_KEY),
        AsyncStorage.getItem(SCHEDULE_TODOS_KEY),
      ]);
      setTrips(data);
      const parse = (raw: string | null): Array<{ date: string }> => {
        try { return raw ? JSON.parse(raw) : []; } catch { return []; }
      };
      const events = parse(eventsRaw);
      const ministries = parse(ministriesRaw);
      const todos = parse(todosRaw);
      setCoverageItems({ events, ministries });
      setScheduledDates(new Set([...events, ...ministries, ...todos].map((i) => i.date).filter(Boolean)));
    } catch (error) {
      console.error("Error loading time-off:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    load();
    if (initialTripId) {
      setActiveTripId(initialTripId);
      setView("trip");
    } else {
      setView("list");
      setActiveTripId(null);
    }
  }, [visible, initialTripId, load]);

  const activeTrip = useMemo(() => trips.find((t) => t.id === activeTripId) ?? null, [trips, activeTripId]);
  const today = todayISO();
  const hero = useMemo(() => heroTrip(trips, today), [trips, today]);
  const rest = useMemo(() => upcomingTrips(trips, today).filter((t) => t.id !== hero?.id), [trips, today, hero]);
  const earlier = useMemo(() => pastTrips(trips, today), [trips, today]);

  const openBook = (trip?: TimeOff) => {
    if (trip) {
      setEditingId(trip.id);
      setFTitle(trip.title);
      setFType(trip.type);
      setFStart(trip.startDate);
      setFEnd(trip.endDate);
      setFColor(trip.color || SCHEDULE_COLOR_PALETTE[5].hex);
      setFNotify(trip.notify !== false);
      setFNotes(trip.notes || "");
      const s = parseISO(trip.startDate);
      setCalMonth({ y: s.getFullYear(), m: s.getMonth() });
    } else {
      setEditingId(null);
      setFTitle("");
      setFType("vacation");
      setFStart(today);
      setFEnd(today);
      setFColor(SCHEDULE_COLOR_PALETTE[5].hex);
      setFNotify(true);
      setFNotes("");
      const n = new Date();
      setCalMonth({ y: n.getFullYear(), m: n.getMonth() });
    }
    setView("book");
  };

  const handleSaveBook = async () => {
    if (!fTitle.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }
    if (fStart > fEnd) {
      Alert.alert("Error", "End date must be after start date");
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await updateTimeOff(editingId, {
          title: fTitle.trim(), type: fType, startDate: fStart, endDate: fEnd,
          notes: fNotes || undefined, color: fColor, notify: fNotify,
        });
      } else {
        await createTimeOff(fTitle.trim(), fType, fStart, fEnd, fNotes || undefined, fColor, { notify: fNotify });
      }
      await load();
      onChanged?.();
      setView("list");
    } catch (error) {
      console.error("Error saving time-off:", error);
      Alert.alert("Error", "Failed to save time-off");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = (trip: TimeOff) => {
    Alert.alert("Delete Time-Off", `Delete "${trip.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTimeOff(trip.id);
          await load();
          onChanged?.();
          setView("list");
        },
      },
    ]);
  };

  const handleSaveEntry = async () => {
    if (!activeTrip) return;
    if (!entryTitle.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }
    const entry: ItineraryEntry = {
      id: generateId(),
      kind: entryKind,
      date: entryDate,
      time: entryTime || undefined,
      title: entryTitle.trim(),
      address: entryAddress.trim() || undefined,
      detail: entryDetail.trim() || undefined,
      // v303: the keyword binds at save the way createScheduleEvent
      // binds an event's — a picked label first, else the title's own
      // detection. Season/episode ride only for TV Show entries,
      // exactly as the event form saves them.
      keyword: entryKeyword ?? detectEventKeyword(entryTitle.trim())?.label,
      season: entryIsTVShow && entrySeason ? parseInt(entrySeason, 10) || undefined : undefined,
      episode: entryIsTVShow && entryEpisode ? parseInt(entryEpisode, 10) || undefined : undefined,
    };
    const itinerary = sortItinerary([...(activeTrip.itinerary ?? []), entry]);
    await updateTimeOff(activeTrip.id, { itinerary });
    await load();
    onChanged?.();
    setView("trip");
  };

  const handleDeleteEntry = async (entry: ItineraryEntry) => {
    if (!activeTrip) return;
    const itinerary = (activeTrip.itinerary ?? []).filter((e) => e.id !== entry.id);
    await updateTimeOff(activeTrip.id, { itinerary });
    await load();
    onChanged?.();
  };

  const pickCalDay = (iso: string) => {
    // Range picking: while the range is a single day, a later tap extends
    // it to that day; any other tap starts a fresh single-day range there.
    if (fStart === fEnd && iso > fStart) {
      setFEnd(iso);
    } else {
      setFStart(iso);
      setFEnd(iso);
    }
  };

  const coverage = useMemo(() => {
    const inRange = (items: Array<{ date: string }>) => items.filter((i) => i.date >= fStart && i.date <= fEnd).length;
    return { events: inRange(coverageItems.events), ministries: inRange(coverageItems.ministries) };
  }, [coverageItems, fStart, fEnd]);
  const bookDays = calculateTimeOffDuration(fStart, fEnd);
  const bookColor = tripBaseColor({ color: fColor } as TimeOff);

  // v314: the blend's app bar — 38px rounded-square tonal tiles with
  // deep-seed glyphs and a 22/900 title; the trip face's back button
  // is the drawing's filled seed circle instead (backFilled).
  const header = (title: string, opts?: { back?: () => void; right?: React.ReactNode; backFilled?: boolean }) => (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={opts?.back ? "Back" : "Close"}
        onPress={opts?.back ?? onClose}
        style={({ pressed }) => [{ width: 38, height: 38, borderRadius: opts?.backFilled ? 19 : 14, alignItems: "center", justifyContent: "center", backgroundColor: opts?.backFilled ? colors.primary : tones.containerLow, opacity: pressed ? 0.7 : 1 }]}
      >
        <MaterialIcons name={opts?.back ? "arrow-back" : "close"} size={21} color={opts?.backFilled ? "#FFFFFF" : tones.primaryDeep} />
      </Pressable>
      <Text style={{ flex: 1, fontSize: 22, fontWeight: "900", color: colors.foreground }}>
        {title}
      </Text>
      {opts?.right}
    </View>
  );

  const renderList = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 11, fontWeight: "900", letterSpacing: 1.5, color: colors.muted, marginBottom: 10 }}>UPCOMING</Text>
      {hero ? (
        <>
          <Pressable onPress={() => { setActiveTripId(hero.id); setView("trip"); }} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            {(() => {
              const base = tripBaseColor(hero);
              const until = daysUntilTrip(hero, today);
              const ongoing = until <= 0;
              const dayNum = tripDayNumber(hero, today);
              const big = ongoing ? (dayNum?.day ?? 1) : until;
              const route = deriveRouteRead(hero);
              // v314: the kind pill — the drawing's warm accent,
              // derived as a step of the trip's own colour toward
              // it, its ink a dark warm mix of the pill itself.
              // Never the drawing's pinned hexes.
              const pillBg = mix(base, "#FFD60A", 0.82);
              const pillInk = mix(pillBg, "#000000", 0.78);
              return (
                <View style={{ backgroundColor: base, borderTopLeftRadius: 36, borderTopRightRadius: 36, borderBottomRightRadius: 36, borderBottomLeftRadius: 14, paddingTop: 20, paddingHorizontal: 20, overflow: "hidden", marginBottom: 14 }}>
                  <View style={{ alignSelf: "flex-start", backgroundColor: pillBg, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}>
                    <Text style={{ color: pillInk, fontSize: 12, fontWeight: "900", letterSpacing: 0.4 }}>
                      {getTimeOffLabel(hero.type).toUpperCase()}
                    </Text>
                  </View>
                  {/* v314: ONE number story — the countdown (or the
                      day count, once the trip is on). No duration
                      rides anywhere else on this card. */}
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 4 }}>
                    <Text style={{ color: "#FFFFFF", fontSize: 96, lineHeight: 88, fontWeight: "900", letterSpacing: -2 }}>{big}</Text>
                    <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700", lineHeight: 20, marginTop: 12 }}>
                      {ongoing ? `of ${dayNum?.total ?? ""}\ndays` : "days\nto go"}
                    </Text>
                  </View>
                  <Text style={{ color: "#FFFFFF", fontSize: 27, fontWeight: "900", marginTop: 10 }}>{hero.title}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "500", marginTop: 2 }}>
                    {fmtRange(hero)}
                  </Text>
                  {/* v314: the scenic band — a sun and two hill
                      steps of the trip's own colour across the
                      card's foot; the route read stands on it when
                      the itinerary yields one. */}
                  <View style={{ marginHorizontal: -20, marginTop: 14, height: 64 }}>
                    <Svg width="100%" height="100%" viewBox="0 0 354 64" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
                      <Circle cx={292} cy={20} r={15} fill={mix(base, "#FFD60A", 0.85)} />
                      <Path d="M0 44 Q 70 22 150 40 T 354 34 V64 H0 Z" fill={mix(base, "#000000", 0.22)} />
                      <Path d="M0 54 Q 90 36 190 50 T 354 48 V64 H0 Z" fill={mix(base, "#000000", 0.38)} />
                    </Svg>
                    {route && (
                      <View style={{ position: "absolute", left: 20, bottom: 12 }}>
                        <Text style={{ color: "#FFFFFF", fontSize: 13.5, fontWeight: "700", letterSpacing: 0.3, textShadowColor: "rgba(0,0,0,0.35)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>{route}</Text>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, fontWeight: "500", marginTop: 1 }}>The route, at a glance</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })()}
          </Pressable>
          {rest.map((t) => {
            const base = tripBaseColor(t);
            const days = calculateTimeOffDuration(t.startDate, t.endDate);
            return (
              <Pressable
                key={t.id}
                onPress={() => { setActiveTripId(t.id); setView("trip"); }}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                {/* v314: the drawing's trip card — SOLID trip
                    colour in the hero's mirrored shape (the small
                    corner travels to the top-left), title, kind
                    pill in a deep step of the same colour, dates,
                    and the trip's ONE number at the right: its
                    days, display size, with DAYS under it. */}
                <View style={{ backgroundColor: base, borderTopLeftRadius: 14, borderTopRightRadius: 36, borderBottomRightRadius: 36, borderBottomLeftRadius: 36, paddingVertical: 18, paddingHorizontal: 20, marginBottom: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 23, fontWeight: "900", color: "#FFFFFF" }}>{t.title}</Text>
                    <View style={{ alignSelf: "flex-start", backgroundColor: mix(base, "#000000", 0.42), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 8 }}>
                      <Text style={{ color: mix(base, "#FFFFFF", 0.82), fontSize: 11, fontWeight: "900", letterSpacing: 0.5 }}>
                        {getTimeOffLabel(t.type).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13.5, fontWeight: "500", color: "rgba(255,255,255,0.88)", marginTop: 8 }}>{fmtRange(t)}</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 58, lineHeight: 54, fontWeight: "900", color: "#FFFFFF" }}>{days}</Text>
                    <Text style={{ fontSize: 11, fontWeight: "900", letterSpacing: 1.5, color: "#FFFFFF" }}>DAYS</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <MaterialIcons name="event-available" size={48} color={colors.muted} />
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginTop: 12 }}>No time-off scheduled</Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, textAlign: "center" }}>
            Book a vacation, sick day, or personal time.
          </Text>
        </View>
      )}

      {earlier.length > 0 && (
        <>
          <Pressable
            onPress={() => setEarlierOpen((o) => !o)}
            style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 16, paddingHorizontal: 6, paddingBottom: earlierOpen ? 10 : 0, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>Earlier</Text>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.muted }}>
              · {earlier.length} trip{earlier.length !== 1 ? "s" : ""}
            </Text>
            <View style={{ flex: 1 }} />
            <MaterialIcons name={earlierOpen ? "expand-less" : "expand-more"} size={20} color={colors.muted} />
          </Pressable>
          {earlierOpen && earlier.map((t) => (
            <Pressable key={t.id} onPress={() => { setActiveTripId(t.id); setView("trip"); }} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
              <View style={{ backgroundColor: tones.containerLow, borderRadius: 18, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>{t.title}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    {getTimeOffLabel(t.type)} · {fmtRange(t)}
                  </Text>
                </View>
                <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.muted }}>
                  {calculateTimeOffDuration(t.startDate, t.endDate)} days
                </Text>
              </View>
            </Pressable>
          ))}
        </>
      )}

      {/* v314: the drawing's Book time off — a solid seed pill at
          the foot of the list, in flow (the v294 floating pill is
          retired with the rest of that build). */}
      <Pressable
        onPress={() => openBook()}
        style={({ pressed }) => [{
          marginTop: 18,
          flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9,
          backgroundColor: colors.primary, borderRadius: 999,
          paddingHorizontal: 22, paddingVertical: 16,
          shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5,
          opacity: pressed ? 0.85 : 1,
        }]}
      >
        <MaterialIcons name="add" size={20} color="#FFFFFF" />
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>Book time off</Text>
      </Pressable>
    </ScrollView>
  );

  const renderCalendar = () => {
    const first = new Date(calMonth.y, calMonth.m, 1);
    const startPad = first.getDay(); // Sunday-first, matching the app's week strip
    const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
    const cells: Array<string | null> = [
      ...Array.from({ length: startPad }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => toISO(new Date(calMonth.y, calMonth.m, i + 1))),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const move = (delta: number) => {
      const next = new Date(calMonth.y, calMonth.m + delta, 1);
      setCalMonth({ y: next.getFullYear(), m: next.getMonth() });
    };
    return (
      <View style={{ backgroundColor: tones.containerLow, borderRadius: 24, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: colors.foreground }}>{monthLabel}</Text>
          <Pressable onPress={() => move(-1)} style={{ padding: 6 }} accessibilityLabel="Previous month">
            <MaterialIcons name="chevron-left" size={24} color={colors.foreground} />
          </Pressable>
          <Pressable onPress={() => move(1)} style={{ padding: 6 }} accessibilityLabel="Next month">
            <MaterialIcons name="chevron-right" size={24} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", marginBottom: 4 }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <Text key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: colors.muted }}>{d}</Text>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, row) => (
          <View key={row} style={{ flexDirection: "row" }}>
            {cells.slice(row * 7, row * 7 + 7).map((iso, col) => {
              if (!iso) return <View key={col} style={{ flex: 1, height: 44 }} />;
              const isStart = iso === fStart;
              const isEnd = iso === fEnd;
              const inBand = iso > fStart && iso < fEnd;
              const isTodayCell = iso === today;
              const hasDot = scheduledDates.has(iso);
              return (
                <Pressable key={col} onPress={() => pickCalDay(iso)} style={{ flex: 1, height: 44, alignItems: "center", justifyContent: "center" }}>
                  {inBand && <View style={{ position: "absolute", left: 0, right: 0, height: 36, backgroundColor: mix(colors.surface, bookColor, 0.3) }} />}
                  {(isStart || isEnd) && (
                    <View style={{ position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: bookColor }} />
                  )}
                  <Text style={{ fontSize: 14, fontWeight: isStart || isEnd ? "800" : "600", color: isStart || isEnd ? "#FFFFFF" : colors.foreground }}>
                    {Number(iso.split("-")[2])}
                  </Text>
                  {isTodayCell && !(isStart || isEnd) && (
                    <View style={{ position: "absolute", width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: bookColor }} />
                  )}
                  {hasDot && (
                    <View style={{ position: "absolute", bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: isStart || isEnd ? "#FFFFFF" : colors.muted }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderBook = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 13, fontWeight: "800", color: colors.foreground, marginBottom: 10 }}>Step 1 · Pick your dates</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1, backgroundColor: tones.containerLow, borderRadius: 16, padding: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>Start date</Text>
          <Text style={{ fontSize: 14.5, fontWeight: "800", color: colors.foreground, marginTop: 2 }}>{fmtDay(fStart)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: tones.containerLow, borderRadius: 16, padding: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>End date</Text>
          <Text style={{ fontSize: 14.5, fontWeight: "800", color: colors.foreground, marginTop: 2 }}>{fmtDay(fEnd)}</Text>
        </View>
      </View>
      {renderCalendar()}
      <View style={{ backgroundColor: mix(colors.surface, bookColor, 0.16), borderRadius: 16, padding: 14, marginTop: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "800", color: colors.foreground }}>
          {bookDays} day{bookDays !== 1 ? "s" : ""}
          {(coverage.events > 0 || coverage.ministries > 0) && (
            <Text style={{ fontWeight: "600", color: colors.muted }}>
              {` · covers ${coverage.events} event${coverage.events !== 1 ? "s" : ""} and ${coverage.ministries} ${coverage.ministries === 1 ? "ministry" : "ministries"} already scheduled`}
            </Text>
          )}
        </Text>
      </View>

      <Text style={{ fontSize: 13, fontWeight: "800", color: colors.foreground, marginTop: 22, marginBottom: 10 }}>Step 2 · Details</Text>
      <View style={{ backgroundColor: tones.containerLow, borderRadius: 24, padding: 16, gap: 16 }}>
        <View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6 }}>Title</Text>
          <TextInput
            value={fTitle}
            onChangeText={setFTitle}
            placeholder="e.g., Family trip"
            placeholderTextColor={colors.muted}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: colors.foreground, fontSize: 15, backgroundColor: colors.surface }}
          />
        </View>
        <View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 8 }}>Type</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TIME_OFF_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setFType(t)}
                style={({ pressed }) => [{
                  paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999,
                  backgroundColor: fType === t ? bookColor : colors.surface,
                  borderWidth: 1, borderColor: fType === t ? bookColor : colors.border,
                  opacity: pressed ? 0.8 : 1,
                }]}
              >
                <Text style={{ fontSize: 12.5, fontWeight: "700", color: fType === t ? "#FFFFFF" : colors.foreground }}>
                  {getTimeOffLabel(t)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 8 }}>Colour</Text>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            {SCHEDULE_COLOR_PALETTE.map((c) => (
              <Pressable
                key={c.hex}
                onPress={() => setFColor(c.hex)}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.hex, borderWidth: fColor === c.hex ? 3 : 0, borderColor: colors.foreground }}
              />
            ))}
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>Notify</Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>Get a reminder when it starts</Text>
          </View>
          <Switch
            value={fNotify}
            onValueChange={setFNotify}
            trackColor={{ false: colors.border, true: bookColor }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6 }}>Notes (Optional)</Text>
          <TextInput
            value={fNotes}
            onChangeText={setFNotes}
            placeholder="Add notes..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: colors.foreground, fontSize: 14, backgroundColor: colors.surface, textAlignVertical: "top", minHeight: 68 }}
          />
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
        <Pressable
          onPress={() => setView("list")}
          style={({ pressed }) => [{ flex: 1, paddingVertical: 14, borderRadius: 999, backgroundColor: tones.container, alignItems: "center", opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={{ fontSize: 14.5, fontWeight: "700", color: colors.foreground }}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleSaveBook}
          disabled={loading}
          style={({ pressed }) => [{ flex: 1, paddingVertical: 14, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", opacity: pressed || loading ? 0.75 : 1 }]}
        >
          <Text style={{ fontSize: 14.5, fontWeight: "800", color: "#FFFFFF" }}>{editingId ? "Save" : "Save time off"}</Text>
        </Pressable>
      </View>
      {editingId && (
        <Pressable onPress={() => { const t = trips.find((x) => x.id === editingId); if (t) handleDeleteTrip(t); }} style={{ alignItems: "center", paddingVertical: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.error }}>Delete this time off</Text>
        </Pressable>
      )}
    </ScrollView>
  );

  const renderTrip = () => {
    if (!activeTrip) return null;
    const base = tripBaseColor(activeTrip);
    const groups = groupItineraryByDate(activeTrip);
    const duration = calculateTimeOffDuration(activeTrip.startDate, activeTrip.endDate);
    const until = daysUntilTrip(activeTrip, today);
    const dayNum = tripDayNumber(activeTrip, today);
    // v314: the sub-line's state read — the facts only (range,
    // length, where today sits in it), no caption.
    const stateRead = until > 0
      ? ` · starts in ${until} day${until !== 1 ? "s" : ""}`
      : dayNum
        ? ` · Day ${dayNum.day} of ${dayNum.total}`
        : "";
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* v314: the drawing's trip head — the title at display
            weight on the surface and the facts as ONE sub-line.
            The v294 colour header card (and its caption) is gone. */}
        <Text style={{ fontSize: 32, fontWeight: "900", letterSpacing: -0.5, color: colors.foreground, marginTop: 2 }}>{activeTrip.title}</Text>
        <Text style={{ fontSize: 14, fontWeight: "500", color: colors.muted, marginTop: 2 }}>
          {fmtRange(activeTrip)} · {duration} day{duration !== 1 ? "s" : ""}{stateRead}
        </Text>

        {groups.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 26 }}>
            <Text style={{ fontSize: 14.5, fontWeight: "700", color: colors.foreground }}>Nothing on the timeline yet</Text>
            <Text style={{ fontSize: 12.5, color: colors.muted, marginTop: 4, textAlign: "center" }}>
              Add the flight, the stay, and the plans — they land in your schedule on their days.
            </Text>
          </View>
        )}

        {groups.map((group) => {
          const d = parseISO(group.date);
          return (
            <View key={group.date} style={{ marginBottom: 6 }}>
              {/* v314: the drawing's day head — a 44/900 numeral in
                  the seed, the weekday at full weight, the month
                  quiet under it, and a rule running to the edge.
                  The v294 left rail is gone. */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24, marginBottom: 12 }}>
                <Text style={{ fontSize: 44, fontWeight: "900", lineHeight: 46, letterSpacing: -0.5, color: colors.primary }}>{d.getDate()}</Text>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: colors.foreground }}>
                    {d.toLocaleDateString("en-US", { weekday: "long" })}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: colors.muted }}>
                    {d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </Text>
                </View>
                <View style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: tones.container }} />
              </View>
              <View style={{ gap: 12, paddingBottom: 4 }}>
                {group.entries.map((entry) => (
                  <TimelineEntry key={entry.id} entry={entry} base={base} onDelete={() => handleDeleteEntry(entry)} />
                ))}
              </View>
            </View>
          );
        })}

        <View style={{ backgroundColor: tones.containerLow, borderRadius: 22, padding: 16, marginTop: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.foreground, marginBottom: 10 }}>Add to the timeline</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {ITINERARY_KINDS.map(({ kind, label, icon }) => {
              // v302: a chip wears its KIND's colour (a step of the
              // trip's own colour) — picked, it fills with it; unpicked,
              // its icon still carries it. Never six grey chips.
              const kindColor = itineraryKindColor(kind, base);
              const picked = entryKind === kind;
              return (
                <Pressable
                  key={kind}
                  onPress={() => setEntryKind(kind)}
                  style={({ pressed }) => [{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999,
                    backgroundColor: picked ? kindColor : colors.surface,
                    borderWidth: 1, borderColor: picked ? kindColor : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  }]}
                >
                  <MaterialIcons name={icon as any} size={15} color={picked ? "#FFFFFF" : kindColor} />
                  <Text style={{ fontSize: 12.5, fontWeight: "700", color: picked ? "#FFFFFF" : colors.foreground }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => {
              setEntryDate(activeTrip.startDate);
              setEntryTime("");
              setEntryTitle("");
              setEntryAddress("");
              setEntryDetail("");
              setEntryKeyword(undefined);
              setEntrySeason("");
              setEntryEpisode("");
              setEntryTitleFocused(false);
              setView("entry");
            }}
            style={({ pressed }) => [{ backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 13, alignItems: "center", opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 14.5, fontWeight: "800" }}>Add to timeline</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
          <Pressable
            onPress={() => openBook(activeTrip)}
            style={({ pressed }) => [{ flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: tones.container, alignItems: "center", opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>Edit trip</Text>
          </Pressable>
          <Pressable
            onPress={() => handleDeleteTrip(activeTrip)}
            style={({ pressed }) => [{ flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: tones.container, alignItems: "center", opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.error }}>Delete trip</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  const renderEntryForm = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: tones.containerLow, borderRadius: 24, padding: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ITINERARY_KINDS.map(({ kind, label, icon }) => {
            // v302: same kind dressing as the trip's add row, stepped
            // from the app's seed here (the form speaks the app's colour).
            const kindColor = itineraryKindColor(kind, colors.primary);
            const picked = entryKind === kind;
            return (
              <Pressable
                key={kind}
                onPress={() => setEntryKind(kind)}
                style={({ pressed }) => [{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999,
                  backgroundColor: picked ? kindColor : colors.surface,
                  borderWidth: 1, borderColor: picked ? kindColor : colors.border,
                  opacity: pressed ? 0.8 : 1,
                }]}
              >
                <MaterialIcons name={icon as any} size={15} color={picked ? "#FFFFFF" : kindColor} />
                <Text style={{ fontSize: 12.5, fontWeight: "700", color: picked ? "#FFFFFF" : colors.foreground }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6 }}>DATE</Text>
          <DateTimePicker value={entryDate} onChange={setEntryDate} mode="date" label="Select Date" />
        </View>
        <View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6 }}>TIME (optional)</Text>
          <DateTimePicker value={entryTime} onChange={setEntryTime} mode="time" label="Select Time" />
        </View>
        <View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6 }}>TITLE</Text>
          <TextInput
            value={entryTitle}
            onChangeText={setEntryTitle}
            onFocus={() => setEntryTitleFocused(true)}
            onBlur={() => setTimeout(() => setEntryTitleFocused(false), 150)}
            placeholder={entryKind === "travel" ? "e.g., Flight to Denver" : entryKind === "stay" ? "e.g., Check in — Canyon Inn" : entryKind === "food" ? "e.g., Dinner at Carmine's" : entryKind === "ride" ? "e.g., Ride to the airport" : entryKind === "view" ? "e.g., Sunset over the canyon" : "e.g., Arches National Park"}
            placeholderTextColor={colors.muted}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: colors.foreground, fontSize: 15, backgroundColor: colors.surface }}
          />
          {entryTitleSuggestions.length > 0 && (
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden", backgroundColor: colors.surface, marginTop: 8 }}>
              {entryTitleSuggestions.map((s) => (
                <Pressable
                  key={s.label}
                  onPress={() => {
                    setEntryTitle(s.label);
                    setEntryKeyword(s.label);
                    setEntryTitleFocused(false);
                  }}
                  style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, opacity: pressed ? 0.7 : 1 }]}
                >
                  <MaterialIcons name={s.icon as any} size={18} color={colors.primary} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, flex: 1 }}>{s.label}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <MaterialIcons name="auto-awesome" size={12} color={colors.primary} />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: colors.primary }}>Animated</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        {!entryIsTVShow && (
          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6 }}>ADDRESS (optional)</Text>
            <TextInput
              value={entryAddress}
              onChangeText={setEntryAddress}
              placeholder="e.g., 412 Mesa Rd, Moab, UT"
              placeholderTextColor={colors.muted}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: colors.foreground, fontSize: 15, backgroundColor: colors.surface }}
            />
          </View>
        )}
        {entryIsTVShow && (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6 }}>SEASON</Text>
              <TextInput
                value={entrySeason}
                onChangeText={(t) => setEntrySeason(t.replace(/[^0-9]/g, ""))}
                placeholder="e.g. 2"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: colors.foreground, fontSize: 15, backgroundColor: colors.surface }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6 }}>EPISODE</Text>
              <TextInput
                value={entryEpisode}
                onChangeText={(t) => setEntryEpisode(t.replace(/[^0-9]/g, ""))}
                placeholder="e.g. 5"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: colors.foreground, fontSize: 15, backgroundColor: colors.surface }}
              />
            </View>
          </View>
        )}
        <View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6 }}>DETAIL (optional)</Text>
          <TextInput
            value={entryDetail}
            onChangeText={setEntryDetail}
            placeholder={entryIsTVShow ? "e.g., The Bear" : entryKind === "travel" ? "e.g., LAX → DEN · Flight UA 1847" : entryKind === "stay" ? "e.g., Check-out Mon, Nov 23 · Conf. #A7K2Q" : entryKind === "food" ? "e.g., Reservation for 4 · Conf. #D221" : entryKind === "ride" ? "e.g., Pickup at the lobby · 6 seats" : entryKind === "view" ? "e.g., Best light before 7 PM" : "e.g., Timed-entry pass in the app"}
            placeholderTextColor={colors.muted}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: colors.foreground, fontSize: 15, backgroundColor: colors.surface }}
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
        <Pressable
          onPress={() => setView("trip")}
          style={({ pressed }) => [{ flex: 1, paddingVertical: 14, borderRadius: 999, backgroundColor: tones.container, alignItems: "center", opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={{ fontSize: 14.5, fontWeight: "700", color: colors.foreground }}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleSaveEntry}
          style={({ pressed }) => [{ flex: 1, paddingVertical: 14, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={{ fontSize: 14.5, fontWeight: "800", color: "#FFFFFF" }}>Add entry</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  return (
    <Modal visible={visible} transparent animationType={isPaper ? "fade" : "slide"} onRequestClose={onClose}>
      <PaperSettle style={{ flex: 1 }}>
        <BitSettle style={{ flex: 1 }}>
          <SafeAreaView edges={["left", "right", "bottom", "top"]} style={{ flex: 1, backgroundColor: tones.page }}>
            {view === "list" && header("Time Off", {
              right: trips.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share or export time off"
                  onPress={() => setShowExport(true)}
                  style={({ pressed }) => [{ width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: tones.containerLow, opacity: pressed ? 0.7 : 1 }]}
                >
                  <MaterialIcons name="share" size={19} color={tones.primaryDeep} />
                </Pressable>
              ) : undefined,
            })}
            {view === "book" && header(editingId ? "Edit time off" : "Book time off", { back: () => setView("list") })}
            {view === "trip" && header(activeTrip?.title ?? "Trip", { back: () => setView("list"), backFilled: true })}
            {view === "entry" && header("Add to timeline", { back: () => setView("trip") })}

            {loading && trips.length === 0 ? (
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : view === "list" ? renderList()
              : view === "book" ? renderBook()
              : view === "trip" ? renderTrip()
              : renderEntryForm()}

            <TimeOffExport visible={showExport} onClose={() => setShowExport(false)} timeOffList={trips} />
          </SafeAreaView>
        </BitSettle>
      </PaperSettle>
    </Modal>
  );
}

const ROUTE_RE = /([A-Za-z]{3})\s*→\s*([A-Za-z]{3})/;

function TimelineEntry({ entry, base, onDelete }: { entry: ItineraryEntry; base: string; onDelete: () => void }) {
  const colors = useColors();
  const route = entry.kind === "travel" ? entry.detail?.match(ROUTE_RE) : null;
  // v302: the entry's kind identity — its icon on a tonal tile of its
  // own colour step, its label in that same colour.
  const kindColor = itineraryKindColor(entry.kind, base);
  const kindLabel = getItineraryKindLabel(entry.kind).toUpperCase();
  // v303: the entry's keyword artwork, resolved as an event's is. It
  // shows in a media band at the entry's head; the kind tile and label
  // below are preserved untouched, and an entry with no keyword keeps
  // its plain card exactly. The detail line speaks the composed read
  // ("S1 E6 · The Bear") when the entry carries one.
  const keyword = resolveItineraryKeyword(entry);
  const detailLine = itineraryDetailLine(entry);
  // v308: the show's name in the composed read ("S1 E6 · The Bear")
  // wears its title font, as on the day-page cards — segments only
  // when the name is present, else the plain line renders as today.
  const showFont = keyword?.label === "TV Show" ? detectShowFont(entry.detail, entry.title) : null;
  const detailSegments = showFont && detailLine ? showNameSegments(detailLine, showFont) : null;
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 20, ...(keyword ? { overflow: "hidden" as const } : { padding: 15 }), shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
      {keyword && (
        <View style={{ height: 96 }}>
          <KeywordAmbientAnimation label={keyword.label} title={entry.title} location={entry.address} notes={entry.detail} />
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.22)" }} />
        </View>
      )}
      <View style={keyword ? { padding: 15 } : undefined}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: mix(colors.surface, kindColor, 0.16), alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name={getItineraryKindIcon(entry.kind) as any} size={15} color={kindColor} />
        </View>
        {entry.time && (
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.foreground }}>{format12HourTime(entry.time)}</Text>
        )}
        <Text style={{ fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: kindColor }}>{kindLabel}</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onDelete} accessibilityLabel={`Remove ${entry.title}`} style={({ pressed }) => [{ padding: 2, opacity: pressed ? 0.5 : 1 }]}>
          <MaterialIcons name="close" size={16} color={colors.muted} />
        </Pressable>
      </View>
      {route ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
          <Text style={{ fontSize: 23, fontWeight: "800", color: colors.foreground }}>{route[1].toUpperCase()}</Text>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: base }} />
            <View style={{ flex: 1, borderTopWidth: 2, borderStyle: "dotted", borderColor: base }} />
            <MaterialIcons name="flight" size={16} color={base} style={{ transform: [{ rotate: "90deg" }] }} />
            <View style={{ flex: 1, borderTopWidth: 2, borderStyle: "dotted", borderColor: base }} />
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: base }} />
          </View>
          <Text style={{ fontSize: 23, fontWeight: "800", color: colors.foreground }}>{route[2].toUpperCase()}</Text>
        </View>
      ) : null}
      <Text style={{ fontSize: 15.5, fontWeight: "700", color: colors.foreground, marginTop: route ? 8 : 6 }}>{entry.title}</Text>
      {entry.address && (
        <View style={{ backgroundColor: mix(colors.surface, base, 0.1), borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8 }}>
          <Text style={{ fontSize: 12.5, fontWeight: "600", color: colors.foreground }}>{entry.address}</Text>
        </View>
      )}
      {detailLine && (
        <Text style={{ fontSize: 12.5, color: colors.muted, marginTop: 7 }}>{Array.isArray(detailSegments) ? detailSegments : detailLine}</Text>
      )}
      </View>
    </View>
  );
}
