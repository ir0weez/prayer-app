import React, { useEffect, useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type ViewStyle,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { useSkin } from "@/hooks/use-skin";
import { format12HourTime } from "@/lib/utils";
import { mix } from "@/lib/color-themes";
import { hexLuminance } from "@/lib/skin-themes";
import { scheduleMaterialTones, schedulePaperSurface } from "@/lib/schedule-material";
import {
  calendarCells,
  daysInMonth,
  dialAngleForHour12,
  dialAngleForMinute,
  dialPointAngle,
  formatDateValue,
  formatTimeValue,
  hour12FromAngle,
  minuteFromAngle,
  parseDateValue,
  parseTimeValue,
  type CalendarCell,
} from "@/lib/picker-maths";

/**
 * v366 — the selectors unfurl (Jonathan, Oct 30, on the wheel sheet:
 * "They are so difficult to use and they don't really feel material
 * either... I'd want it directly in the screen, unfurling from the
 * time or date box"). The bottom sheet and its drum wheels are GONE.
 * The picker opens out of the field itself, carrying the approved
 * drawing's anatomy
 * (selector-unfurl-v5 + the v4 dial): the date is a real Material
 * calendar — headline band in primary-container, month row with
 * tonal chevrons, today ringed, the chosen day filled — and the
 * time is the Material clock dial (tap or drag to the hour, the
 * face flips to minutes), with typed entry behind the pencil /
 * keyboard buttons for both.
 *
 * Both of the old sheet's notorious defects die here: the calendar
 * OPENS ON THE VALUE'S MONTH (never Jan 1900 again) and the dial
 * OPENS ON THE VALUE (never 4 PM highlighted against a 6 PM field).
 *
 * The contract is the old component's, byte for byte: value is a
 * string ("YYYY-MM-DD" / "HH:mm", "" = unset), opening stages a
 * draft, OK commits it through onChange, Cancel — or another
 * picker opening, or tapping the field again — discards it, and an
 * untouched OK on an unset value commits "" (the picker never
 * invents a time for an optional field). Every tone derives from
 * the Settings seed × appearance through schedule-material —
 * nothing pinned, light and dark alike.
 *
 * v377 — the panel is a PLAIN VIEW (Jonathan, Oct 30 16:46, on
 * v376 which carries the v374 fix: a screenshot of the New Event
 * editor, START TIME sitting in its pink open tint with no panel
 * under it — "selecting times and dates still doesn't work...").
 * Twice this panel's visibility hung on an animated window that
 * measured its own child: v366's definite-height window (the
 * child reported 0 forever) and v374's maxHeight-cap window (the
 * v275 roster shape — it passed its source-model pins and still
 * never reached pixels on his phone). The roster learned this in
 * v282 and the People unfurl again in v367: on his device the
 * animated measured window loses, and plain conditional rendering
 * wins. So the window is GONE. Phase "open" mounts the panel as a
 * plain View in normal layout flow — one frame, no Animated
 * height or maxHeight, no onLayout measurement gating it, no
 * fold on close — and "closed" unmounts it. Function over motion,
 * per his standing ruling for these panels; the calendar, the
 * dial, the tones and the contract above are untouched.
 */

/** Cross-instance seat-keeping: only one picker is open at a time;
 * opening one folds (and discards) whichever was open before it. */
let activePickerClose: (() => void) | null = null;

/**
 * v377: there is deliberately NO window component here any more.
 * v366 wrapped the panel in an Animated definite-height clipping
 * window; v374 swapped the definite height for an animated
 * maxHeight cap. Both took the panel's only measurement from an
 * onLayout inside the window, and both failed on Jonathan's
 * phone — the field painted its open tint and no panel ever
 * appeared (v366's recording Oct 30 14:24; v374's, carried in
 * v376, Oct 30 16:46). The panel below now renders as a plain
 * View the moment the phase is "open": its height is its
 * children's layout height in the same pass as the rest of the
 * form, the same plain-View ruling that fixed the People roster
 * in v282 and the family unfurl in v367. Do not reintroduce an
 * animated height, maxHeight, or measurement gate on this path.
 */

interface DateTimePickerProps {
  value: string; // ISO date string or time string (HH:mm)
  onChange: (value: string) => void;
  mode: "date" | "time";
  label: string;
  compact?: boolean;
}

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DIAL_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export function DateTimePicker({
  value,
  onChange,
  mode,
  label,
  compact = false,
}: DateTimePickerProps) {
  const colors = useColors();
  const { isSkinned, tokens: skinTokens } = useSkin();
  const { width: windowWidth } = useWindowDimensions();

  // Derived Material tones (seed × appearance) — the same steps the
  // creator pages take; the panel sits on the palette's paper
  // surface, the band and the selection states on the seed's steps.
  const tones = scheduleMaterialTones(colors.primary, colors.surface);
  const dark = hexLuminance(colors.surface) < 0.5;
  const panelBg = isSkinned
    ? skinTokens.surface ?? schedulePaperSurface(colors.primary, colors.surface)
    : schedulePaperSurface(colors.primary, colors.surface);
  const onPrimaryContainer = dark ? mix(colors.primary, "#FFFFFF", 0.82) : tones.primaryDeep;
  const actionInk = dark ? mix(colors.primary, "#FFFFFF", 0.35) : tones.primaryDeep;
  const chevronBg = mix(panelBg, colors.primary, dark ? 0.32 : 0.1);
  const dialFace = mix(panelBg, colors.primary, dark ? 0.22 : 0.06);
  const boxBg = mix(panelBg, colors.primary, dark ? 0.18 : 0.05);
  const switchOutline = mix(panelBg, colors.primary, 0.28);

  const [phase, setPhase] = useState<"closed" | "open">("closed");
  const phaseRef = useRef(phase);
  const setPhaseBoth = (next: "closed" | "open") => {
    phaseRef.current = next;
    setPhase(next);
  };
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);
  const setDraftBoth = (next: string) => {
    draftRef.current = next;
    setDraft(next);
  };
  const [seat, setSeat] = useState<{ x: number; width: number } | null>(null);
  const [panelWidth, setPanelWidth] = useState(0);
  const rootRef = useRef<View>(null);

  // Date staging.
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [dateEntry, setDateEntry] = useState<"cal" | "type">("cal");
  const [typedDate, setTypedDate] = useState({ mm: "", dd: "", yyyy: "" });
  const [dateFocus, setDateFocus] = useState<"mm" | "dd" | "yyyy" | null>(null);

  // Time staging.
  const [unit, setUnit] = useState<"hour" | "minute">("hour");
  const [timeEntry, setTimeEntry] = useState<"dial" | "type">("dial");
  const [typedTime, setTypedTime] = useState({ hh: "", mm: "" });
  const [timeFocus, setTimeFocus] = useState<"hour" | "minute">("hour");

  const requestCloseRef = useRef<(commit: boolean) => void>(() => {});
  requestCloseRef.current = (commit: boolean) => {
    if (phaseRef.current !== "open") return;
    if (commit) onChange(draftRef.current);
    if (activePickerClose === myCloserRef.current) activePickerClose = null;
    // v377: the close is the unmount — same pass, no fold, no
    // sweep timer. The panel was never animated into visibility,
    // so there is nothing to animate out of it.
    setPhaseBoth("closed");
  };
  const myCloserRef = useRef(() => requestCloseRef.current(false));
  useEffect(() => {
    return () => {
      if (activePickerClose === myCloserRef.current) activePickerClose = null;
    };
  }, []);

  const openPicker = () => {
    // Another picker's open folds (and discards) whichever was open.
    if (activePickerClose && activePickerClose !== myCloserRef.current) {
      activePickerClose();
    }
    activePickerClose = myCloserRef.current;
    setDraftBoth(value);
    const parsed = mode === "date" ? parseDateValue(value) : null;
    const now = new Date();
    // The calendar opens on the value's month — today's only when
    // the value is unset.
    setViewYear(parsed?.year ?? now.getFullYear());
    setViewMonth(parsed?.month ?? now.getMonth());
    setDateEntry("cal");
    setTimeEntry("dial");
    setUnit("hour");
    setPhaseBoth("open");
  };

  const handleFieldPress = () => {
    if (phase === "closed") openPicker();
    else requestCloseRef.current(false);
  };

  const formatDisplay = () => {
    if (mode === "date") {
      if (!value) return "Select date";
      const parsed = parseDateValue(value);
      if (parsed) {
        const date = new Date(parsed.year, parsed.month, parsed.day);
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      return "Select date";
    }
    return value ? format12HourTime(value) : "Select time";
  };

  const getCompactDateParts = () => {
    const parsed = parseDateValue(value);
    if (!parsed) return null;
    const date = new Date(parsed.year, parsed.month, parsed.day);
    return {
      monthDay: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      year: String(parsed.year),
    };
  };

  // ─── Date body ─────────────────────────────────────────────────

  const todayDate = new Date();
  const todayParts = {
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
    day: todayDate.getDate(),
  };
  const draftDate = parseDateValue(draft);
  const headlineParts = draftDate ?? todayParts;
  const headline = new Date(headlineParts.year, headlineParts.month, headlineParts.day)
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const viewTitle = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const stepMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const tapDay = (cell: CalendarCell) => {
    setDraftBoth(formatDateValue(cell.year, cell.month, cell.day));
    if (!cell.inMonth) {
      setViewYear(cell.year);
      setViewMonth(cell.month);
    }
  };

  const typedDateParts = {
    mm: parseInt(typedDate.mm, 10),
    dd: parseInt(typedDate.dd, 10),
    yyyy: parseInt(typedDate.yyyy, 10),
  };
  const typedDateValid =
    typedDate.mm.length > 0 &&
    typedDate.yyyy.length === 4 &&
    typedDateParts.mm >= 1 &&
    typedDateParts.mm <= 12 &&
    typedDateParts.yyyy >= 1900 &&
    typedDateParts.yyyy <= 2199 &&
    typedDateParts.dd >= 1 &&
    typedDateParts.dd <= daysInMonth(typedDateParts.yyyy, typedDateParts.mm - 1);

  const handleTypedDate = (field: "mm" | "dd" | "yyyy", text: string) => {
    const clean = text.replace(/[^0-9]/g, "").slice(0, field === "yyyy" ? 4 : 2);
    const next = { ...typedDate, [field]: clean };
    setTypedDate(next);
    const mm = parseInt(next.mm, 10);
    const dd = parseInt(next.dd, 10);
    const yyyy = parseInt(next.yyyy, 10);
    if (
      next.mm.length > 0 &&
      next.yyyy.length === 4 &&
      mm >= 1 && mm <= 12 &&
      yyyy >= 1900 && yyyy <= 2199 &&
      dd >= 1 && dd <= daysInMonth(yyyy, mm - 1)
    ) {
      setDraftBoth(formatDateValue(yyyy, mm - 1, dd));
      setViewYear(yyyy);
      setViewMonth(mm - 1);
    }
  };

  const enterTypedDate = () => {
    const parsed = parseDateValue(draft);
    setTypedDate(
      parsed
        ? {
            mm: String(parsed.month + 1),
            dd: String(parsed.day),
            yyyy: String(parsed.year),
          }
        : { mm: "", dd: "", yyyy: "" }
    );
    setDateEntry("type");
  };

  const renderDateCalendar = () => {
    const cells = calendarCells(viewYear, viewMonth);
    const weeks: CalendarCell[][] = [];
    for (let i = 0; i < 6; i++) weeks.push(cells.slice(i * 7, i * 7 + 7));
    return (
      <View>
        <View style={pickerStyles.monthRow}>
          <Text style={[pickerStyles.monthTitle, { color: colors.foreground }]}>{viewTitle}</Text>
          <View style={pickerStyles.monthNavs}>
            <Pressable
              onPress={() => stepMonth(-1)}
              style={[pickerStyles.navButton, { backgroundColor: chevronBg }]}
              accessibilityLabel="Previous month"
            >
              <MaterialIcons name="chevron-left" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable
              onPress={() => stepMonth(1)}
              style={[pickerStyles.navButton, { backgroundColor: chevronBg }]}
              accessibilityLabel="Next month"
            >
              <MaterialIcons name="chevron-right" size={18} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
        <View style={pickerStyles.weekRow}>
          {WEEKDAY_LETTERS.map((letter, i) => (
            <Text key={i} style={[pickerStyles.weekday, { color: colors.muted }]}>
              {letter}
            </Text>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={pickerStyles.weekRow}>
            {week.map((cell) => {
              const isSelected =
                !!draftDate &&
                draftDate.year === cell.year &&
                draftDate.month === cell.month &&
                draftDate.day === cell.day;
              const isToday =
                todayParts.year === cell.year &&
                todayParts.month === cell.month &&
                todayParts.day === cell.day;
              return (
                <Pressable key={`${cell.year}-${cell.month}-${cell.day}`} style={pickerStyles.dayCell} onPress={() => tapDay(cell)}>
                  <View
                    style={[
                      pickerStyles.dayCircle,
                      isSelected
                        ? { backgroundColor: colors.primary }
                        : isToday
                          ? { borderWidth: 1.5, borderColor: actionInk }
                          : null,
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: isSelected
                          ? colors.background
                          : isToday
                            ? actionInk
                            : cell.inMonth
                              ? colors.foreground
                              : colors.muted,
                        fontWeight: isSelected || isToday ? "600" : "400",
                        opacity: cell.inMonth ? 1 : 0.55,
                      }}
                    >
                      {cell.day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderDateTyped = () => {
    const fieldBox = (field: "mm" | "dd" | "yyyy", fieldLabel: string, flex: number) => (
      <View style={{ flex }}>
        <TextInput
          value={typedDate[field]}
          onChangeText={(text) => handleTypedDate(field, text)}
          onFocus={() => setDateFocus(field)}
          onBlur={() => setDateFocus(null)}
          keyboardType="number-pad"
          maxLength={field === "yyyy" ? 4 : 2}
          placeholder={field === "yyyy" ? "YYYY" : field === "mm" ? "MM" : "DD"}
          placeholderTextColor={colors.muted}
          style={[
            pickerStyles.typedBox,
            {
              color: colors.foreground,
              backgroundColor: dateFocus === field ? tones.primaryContainer : boxBg,
              borderColor: colors.primary,
              borderWidth: dateFocus === field ? 2 : 0,
              fontSize: 18,
              paddingVertical: 10,
            },
          ]}
        />
        <Text style={[pickerStyles.typedLabel, { color: colors.muted }]}>{fieldLabel}</Text>
      </View>
    );
    return (
      <View style={{ paddingTop: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
          {fieldBox("mm", "Month", 1)}
          <Text style={[pickerStyles.typedSlash, { color: colors.muted }]}>/</Text>
          {fieldBox("dd", "Day", 1)}
          <Text style={[pickerStyles.typedSlash, { color: colors.muted }]}>/</Text>
          {fieldBox("yyyy", "Year", 1.4)}
        </View>
      </View>
    );
  };

  const renderDateBody = () => (
    <View>
      <View
        style={{
          backgroundColor: tones.primaryContainer,
          marginHorizontal: -16,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 10,
        }}
      >
        <Text style={[pickerStyles.eyebrow, { color: onPrimaryContainer }]}>{label.toUpperCase()}</Text>
        <Text style={[pickerStyles.headline, { color: onPrimaryContainer }]}>{headline}</Text>
      </View>
      {dateEntry === "cal" ? renderDateCalendar() : renderDateTyped()}
      <View style={pickerStyles.footer}>
        {dateEntry === "cal" ? (
          <Pressable onPress={enterTypedDate} style={pickerStyles.iconButton} accessibilityLabel="Type the date instead">
            <MaterialIcons name="edit" size={19} color={colors.muted} />
          </Pressable>
        ) : (
          <Pressable onPress={() => setDateEntry("cal")} style={pickerStyles.iconButton} accessibilityLabel="Back to the calendar">
            <MaterialIcons name="date-range" size={19} color={colors.muted} />
          </Pressable>
        )}
        <View style={pickerStyles.footerActs}>
          <Pressable onPress={() => requestCloseRef.current(false)}>
            <Text style={[pickerStyles.footerButton, { color: actionInk }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => requestCloseRef.current(true)}
            disabled={dateEntry === "type" && !typedDateValid}
          >
            <Text
              style={[
                pickerStyles.footerButton,
                { color: dateEntry === "type" && !typedDateValid ? colors.muted : actionInk },
              ]}
            >
              OK</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  // ─── Time body ─────────────────────────────────────────────────

  // The dial and readout show the staged time; an unset value shows
  // 12:00 AM on the face but stages nothing — the draft stays ""
  // until the first touch, so an untouched OK still commits "".
  const shownTime = parseTimeValue(draft) ?? { hour24: 0, minute: 0 };
  const shownHour12 = shownTime.hour24 % 12 || 12;
  const shownPm = shownTime.hour24 >= 12;

  const applyTime = (hour24: number, minute: number) => {
    setDraftBoth(formatTimeValue(hour24, minute));
  };

  const setPeriod = (pm: boolean) => {
    applyTime((shownHour12 % 12) + (pm ? 12 : 0), shownTime.minute);
  };

  // Dial geometry follows the measured panel; the face is capped at
  // the drawing's size and shrinks with a narrow seat.
  const dialSize = Math.max(168, Math.min(252, (panelWidth || 320) - 48));
  const dialLabelSize = Math.max(28, Math.min(38, dialSize * (36 / 252)));
  const dialRadius = dialSize / 2 - dialLabelSize * 0.78;

  const dialStateRef = useRef({ unit, hour24: shownTime.hour24, minute: shownTime.minute, size: dialSize });
  dialStateRef.current = { unit, hour24: shownTime.hour24, minute: shownTime.minute, size: dialSize };
  const handleDialPointRef = useRef((x: number, y: number, isRelease: boolean) => {});
  handleDialPointRef.current = (x: number, y: number, isRelease: boolean) => {
    const state = dialStateRef.current;
    const angle = dialPointAngle(x, y, state.size);
    if (state.unit === "hour") {
      const hour12 = hour12FromAngle(angle);
      applyTime((hour12 % 12) + (state.hour24 >= 12 ? 12 : 0), state.minute);
      // Material behaviour: once the hour lands, the face flips to
      // minutes.
      if (isRelease) setUnit("minute");
    } else {
      applyTime(state.hour24, minuteFromAngle(angle));
    }
  };
  const dialResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event: GestureResponderEvent) =>
        handleDialPointRef.current(event.nativeEvent.locationX, event.nativeEvent.locationY, false),
      onPanResponderMove: (event: GestureResponderEvent) =>
        handleDialPointRef.current(event.nativeEvent.locationX, event.nativeEvent.locationY, false),
      onPanResponderRelease: (event: GestureResponderEvent) =>
        handleDialPointRef.current(event.nativeEvent.locationX, event.nativeEvent.locationY, true),
      onPanResponderTerminate: () => {
        if (dialStateRef.current.unit === "hour") setUnit("minute");
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const renderAmPm = () => (
    <View style={[pickerStyles.amPm, { borderColor: switchOutline }]}>
      <Pressable
        onPress={() => setPeriod(false)}
        style={{ backgroundColor: !shownPm ? tones.primaryContainer : panelBg }}
      >
        <Text style={[pickerStyles.amPmText, { color: !shownPm ? actionInk : colors.muted }]}>AM</Text>
      </Pressable>
      <Pressable
        onPress={() => setPeriod(true)}
        style={{
          backgroundColor: shownPm ? tones.primaryContainer : panelBg,
          borderLeftWidth: 1.5,
          borderLeftColor: switchOutline,
        }}
      >
        <Text style={[pickerStyles.amPmText, { color: shownPm ? actionInk : colors.muted }]}>PM</Text>
      </Pressable>
    </View>
  );

  const renderDial = () => {
    const labels =
      unit === "hour"
        ? DIAL_HOURS.map((hour12, i) => ({
            key: `h${hour12}`,
            text: String(hour12),
            angle: dialAngleForHour12(hour12),
            selected: hour12 === shownHour12,
            index: i,
          }))
        : DIAL_HOURS.map((_, i) => ({
            key: `m${i * 5}`,
            text: String(i * 5).padStart(2, "0"),
            angle: dialAngleForMinute(i * 5),
            selected: shownTime.minute === i * 5,
            index: i,
          }));
    const handAngle =
      unit === "hour" ? dialAngleForHour12(shownHour12) : dialAngleForMinute(shownTime.minute);
    return (
      <View style={{ alignItems: "center", paddingTop: 12 }}>
        <View
          {...dialResponder.panHandlers}
          style={{
            width: dialSize,
            height: dialSize,
            borderRadius: dialSize / 2,
            backgroundColor: dialFace,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: dialSize,
              height: dialSize,
              transform: [{ rotate: `${handAngle}deg` }],
            }}
          >
            <View
              style={{
                position: "absolute",
                left: dialSize / 2 - 1,
                top: dialSize / 2 - dialRadius,
                width: 2,
                height: dialRadius,
                backgroundColor: colors.primary,
              }}
            />
          </View>
          {labels.map((dialLabel) => {
            const rad = (dialLabel.angle * Math.PI) / 180;
            return (
              <View
                key={dialLabel.key}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: dialSize / 2 + dialRadius * Math.sin(rad) - dialLabelSize / 2,
                  top: dialSize / 2 - dialRadius * Math.cos(rad) - dialLabelSize / 2,
                  width: dialLabelSize,
                  height: dialLabelSize,
                  borderRadius: dialLabelSize / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: dialLabel.selected ? colors.primary : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 14.5,
                    color: dialLabel.selected ? colors.background : colors.foreground,
                    fontWeight: dialLabel.selected ? "600" : "400",
                  }}
                >
                  {dialLabel.text}
                </Text>
              </View>
            );
          })}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: dialSize / 2 - 4.5,
              top: dialSize / 2 - 4.5,
              width: 9,
              height: 9,
              borderRadius: 4.5,
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </View>
    );
  };

  const typedTimeParts = {
    hh: parseInt(typedTime.hh, 10),
    mm: parseInt(typedTime.mm, 10),
  };
  const typedTimeValid =
    typedTime.hh.length > 0 &&
    typedTime.mm.length > 0 &&
    typedTimeParts.hh >= 1 &&
    typedTimeParts.hh <= 12 &&
    typedTimeParts.mm >= 0 &&
    typedTimeParts.mm <= 59;

  const handleTypedTime = (field: "hh" | "mm", text: string) => {
    const clean = text.replace(/[^0-9]/g, "").slice(0, 2);
    const next = { ...typedTime, [field]: clean };
    setTypedTime(next);
    const hh = parseInt(next.hh, 10);
    const mm = parseInt(next.mm, 10);
    if (next.hh.length > 0 && next.mm.length > 0 && hh >= 1 && hh <= 12 && mm >= 0 && mm <= 59) {
      applyTime((hh % 12) + (shownPm ? 12 : 0), mm);
    }
  };

  const renderTimeTyped = () => {
    const timeBox = (field: "hh" | "mm", fieldLabel: string) => (
      <View>
        <TextInput
          value={typedTime[field]}
          onChangeText={(text) => handleTypedTime(field, text)}
          onFocus={() => setTimeFocus(field === "hh" ? "hour" : "minute")}
          keyboardType="number-pad"
          maxLength={2}
          placeholder={field === "hh" ? "12" : "00"}
          placeholderTextColor={colors.muted}
          style={[
            pickerStyles.typedBox,
            {
              color: colors.foreground,
              backgroundColor:
                timeFocus === (field === "hh" ? "hour" : "minute") ? tones.primaryContainer : boxBg,
              borderColor: colors.primary,
              borderWidth: timeFocus === (field === "hh" ? "hour" : "minute") ? 2 : 0,
              fontSize: 30,
              width: 78,
              height: 64,
              borderRadius: 14,
            },
          ]}
        />
        <Text style={[pickerStyles.typedLabel, { color: colors.muted }]}>{fieldLabel}</Text>
      </View>
    );
    return (
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, paddingTop: 12 }}>
        {timeBox("hh", "Hour")}
        <Text style={[pickerStyles.readoutColon, { paddingTop: 10 }]}>:</Text>
        {timeBox("mm", "Minute")}
        <View style={{ marginLeft: "auto", marginTop: 6 }}>{renderAmPm()}</View>
      </View>
    );
  };

  const renderTimeBody = () => (
    <View>
      {timeEntry === "dial" ? (
        <View>
          <View style={pickerStyles.readout}>
            <Pressable
              onPress={() => setUnit("hour")}
              style={{
                backgroundColor: unit === "hour" ? tones.primaryContainer : "transparent",
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 32, fontWeight: "500", color: unit === "hour" ? actionInk : colors.foreground }}>
                {shownHour12}
              </Text>
            </Pressable>
            <Text style={[pickerStyles.readoutColon, { color: colors.foreground }]}>:</Text>
            <Pressable
              onPress={() => setUnit("minute")}
              style={{
                backgroundColor: unit === "minute" ? tones.primaryContainer : "transparent",
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 32, fontWeight: "500", color: unit === "minute" ? actionInk : colors.foreground }}>
                {String(shownTime.minute).padStart(2, "0")}
              </Text>
            </Pressable>
            <View style={{ marginLeft: "auto" }}>{renderAmPm()}</View>
          </View>
          {renderDial()}
        </View>
      ) : (
        renderTimeTyped()
      )}
      <View style={pickerStyles.footer}>
        {timeEntry === "dial" ? (
          <Pressable
            onPress={() => {
              setTypedTime({ hh: String(shownHour12), mm: String(shownTime.minute).padStart(2, "0") });
              setTimeEntry("type");
            }}
            style={pickerStyles.iconButton}
            accessibilityLabel="Type the time instead"
          >
            <MaterialIcons name="keyboard" size={19} color={colors.muted} />
          </Pressable>
        ) : (
          <Pressable onPress={() => setTimeEntry("dial")} style={pickerStyles.iconButton} accessibilityLabel="Back to the clock">
            <MaterialIcons name="schedule" size={19} color={colors.muted} />
          </Pressable>
        )}
        <View style={pickerStyles.footerActs}>
          <Pressable onPress={() => requestCloseRef.current(false)}>
            <Text style={[pickerStyles.footerButton, { color: actionInk }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => requestCloseRef.current(true)}
            disabled={timeEntry === "type" && !typedTimeValid}
          >
            <Text
              style={[
                pickerStyles.footerButton,
                { color: timeEntry === "type" && !typedTimeValid ? colors.muted : actionInk },
              ]}
            >
              OK</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  // ─── Field + unfurl ────────────────────────────────────────────

  const isOpen = phase === "open";

  // A narrow seat (the two-up Start/End columns) grows the panel
  // toward the form's full width, anchored to whichever edge keeps
  // it on screen; the compact header seat floats its panel as an
  // anchored overlay, since the header row itself cannot grow.
  const desiredPanelWidth = Math.min(336, windowWidth - 16);
  const panelSeating: ViewStyle = compact
    ? {
        position: "absolute",
        top: 46,
        right: 0,
        width: Math.min(324, windowWidth - 24),
        zIndex: 60,
      }
    : seat && seat.width < desiredPanelWidth
      ? {
          width: desiredPanelWidth,
          alignSelf: seat.x + desiredPanelWidth <= windowWidth - 8 ? "flex-start" : "flex-end",
        }
      : {};

  const panelFrameStyle: ViewStyle = {
    backgroundColor: panelBg,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...(isSkinned
      ? skinTokens.sheetShadow ?? {}
      : {
          shadowColor: "#000000",
          shadowOpacity: dark ? 0.35 : 0.14,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }),
  };

  return (
    <View
      ref={rootRef}
      onLayout={() => {
        rootRef.current?.measureInWindow((x, _y, width) => {
          setSeat((prev) => (prev && prev.x === x && prev.width === width ? prev : { x, width }));
        });
      }}
      style={[
        compact
          ? { position: "relative", marginBottom: 0 }
          : { marginBottom: 12 },
        isOpen ? { zIndex: 40 } : null,
      ]}
    >
      <Pressable
        onPress={handleFieldPress}
        accessibilityLabel={label}
        style={[
          pickerStyles.input,
          compact
            ? { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 0, borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent', marginBottom: 0, paddingHorizontal: 0, paddingVertical: 0, borderRadius: 0 }
            : {
                borderColor: isSkinned ? skinTokens.border ?? colors.border : colors.border,
                backgroundColor: isOpen
                  ? tones.primaryContainer
                  : isSkinned
                    ? skinTokens.surface ?? colors.surface
                    : colors.surface,
                borderBottomWidth: isOpen ? 0 : 1,
              },
        ]}
      >
        {compact && mode === "date" ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '500' }}>
              {getCompactDateParts()?.monthDay ?? 'Select date'}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '500' }}>
              {getCompactDateParts()?.year ?? ''}
            </Text>
          </View>
        ) : (
          <>
            <MaterialIcons
              name={mode === "date" ? "calendar-today" : "schedule"}
              size={20}
              color={colors.muted}
            />
            <Text
              style={[
                pickerStyles.inputText,
                { color: value ? colors.foreground : colors.muted, fontSize: compact ? 13 : 14, fontWeight: compact ? "700" : "400" },
              ]}
            >
              {formatDisplay()}
            </Text>
          </>
        )}
      </Pressable>

      {isOpen && (
        <View style={panelSeating} onLayout={(event) => setPanelWidth(event.nativeEvent.layout.width)}>
          {/* v377: the panel is a plain View in normal layout
              flow — it mounts at full height in the same pass as
              the rest of the form. The seating View's onLayout
              only sizes the dial; it gates nothing. */}
          <View style={panelFrameStyle}>
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              {mode === "date" ? renderDateBody() : renderTimeBody()}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  input: {
    flexDirection: "row",
    alignItems: "center",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  inputText: {
    fontSize: 14,
    flex: 1,
  },
  eyebrow: {
    fontSize: 10.5,
    letterSpacing: 0.9,
    fontWeight: "600",
    opacity: 0.8,
  },
  headline: {
    fontSize: 23,
    fontWeight: "500",
    marginTop: 2,
  },
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  monthTitle: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  monthNavs: {
    flexDirection: "row",
    gap: 6,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "500",
    paddingVertical: 5,
  },
  dayCell: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  footerActs: {
    flexDirection: "row",
    gap: 2,
  },
  footerButton: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  typedBox: {
    borderRadius: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  typedLabel: {
    fontSize: 10.5,
    marginTop: 5,
  },
  typedSlash: {
    fontSize: 18,
    paddingTop: 10,
  },
  readout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 10,
  },
  readoutColon: {
    fontSize: 30,
    fontWeight: "500",
  },
  amPm: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderRadius: 9,
    overflow: "hidden",
  },
  amPmText: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
});
