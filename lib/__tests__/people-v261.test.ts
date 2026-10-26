/**
 * v261 — "The Card Becomes the Prayer": Jonathan approved the
 * praytoday-action-card-v3 mockup (Oct 26) — "Looks great let's
 * build it and make it functional." The queue card STAYS the queue
 * card; it gains a Start/Keep praying footer whose press measures
 * the card and the session presents as ONE Material container
 * transform out of that rect (no mid-morph stop) — and when the
 * day's list is done, the card's resting form is the announcement:
 * skinny, or carrying the What's Next row when a timed thing
 * remains today. The session's internals are untouched; launches
 * without an origin (pill, emergency, bell) keep the fade Modal.
 * Governance unchanged: pmf/pm roles — derive, never pin.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getWhatsNext } from "../whats-next";
import type { ScheduleEvent, ScheduleMinistry, ScheduleTodo } from "../schedule-data";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const zone = index.slice(index.indexOf("const renderWhatsNextThumb"), index.indexOf("const renderStreakCard"));
const session = read("components/prayer-session.tsx");
const morphBlock = session.slice(session.indexOf("if (morphActive && morphOrigin) {"), session.indexOf('<Modal visible={visible} animationType="fade"'));

describe("v261 source pins — the Start footer (index.tsx)", () => {
  it("the card container carries the ref the footer measures", () => {
    expect(index).toContain("const queueCardRef = useRef<View>(null);");
    expect(zone).toContain("ref={queueCardRef}");
  });

  it("the footer labels follow the day's progress (Start → Keep)", () => {
    expect(zone).toContain('prayed > 0 ? "Keep praying" : "Start praying"');
  });

  it("the left chip is the floating pill's count treatment, tonal", () => {
    expect(zone).toContain("{Math.max(0, total - prayed)} left");
    expect(zone).toContain("backgroundColor: pmf.wash, borderRadius: 999");
  });

  it("the pill is the deep-seed filled button (pmf.seed, white text)", () => {
    expect(zone).toContain("backgroundColor: pmf.seed, borderRadius: 999");
  });

  it("pressing it measures the card in the window and launches with that origin", () => {
    expect(zone).toContain("card.measureInWindow((x, y, width, height) => {");
    expect(zone).toContain("setSessionMorphOrigin(width > 0 && height > 0 ? { x, y, width, height } : null);");
    expect(zone).toContain("setShowPrayerSession(true);");
  });

  it("the session mount receives origin + the card's surface + the header counts", () => {
    expect(index).toContain("morphOrigin={sessionMorphOrigin}");
    expect(index).toContain("morphSurface={pmf.card}");
    expect(index).toContain("morphHeader={{ prayed: dailyPrayerProgress.prayed, total: dailyPrayerProgress.total }}");
  });

  it("closing the session clears the origin — other launches never inherit one", () => {
    expect(index).toContain("setShowPrayerSession(false); setPrayerSessionStartId(null); setSessionMorphOrigin(null);");
  });
});

describe("v261 source pins — the complete card (index.tsx)", () => {
  it("a finished day swaps the face row for the complete card", () => {
    expect(zone).toContain("if (total > 0 && prayed >= total) {");
    expect(zone).toContain("return renderQueueCompleteCard(prayed, total);");
  });

  it("the complete card never renders on an empty day", () => {
    expect(zone).toContain("if (total === 0 && prayTodayList.length === 0) return null;");
  });

  it("the header is the check chip + Pray Today complete + the count", () => {
    expect(zone).toContain(">Pray Today complete</Text>");
    expect(zone).toContain('backgroundColor: "#2E7D4F"');
    expect(zone).toContain("{prayed} of {total}");
  });

  it("What's Next: UP NEXT chip, title, time, keyword thumb, whole card to Schedule", () => {
    expect(zone).toContain(">UP NEXT</Text>");
    expect(zone).toContain("{whatsNext.title}");
    expect(zone).toContain("{whatsNext.timeLabel}");
    expect(zone).toContain("{renderWhatsNextThumb(whatsNext)}");
    expect(zone).toContain('onPress={() => setActiveTab("schedule")}');
  });

  it("the keyword thumb routes through the ACTIVE SKIN's scene routers", () => {
    expect(zone).toContain("paperKeywordSceneFor(item.keyword.label, item.title)");
    expect(zone).toContain("pixelKeywordSceneFor(item.keyword.label, item.title)");
    expect(zone).toContain("terminalKeywordSceneFor(item.keyword.label, item.title)");
  });

  it("skinny: no next item → the stadium bar alone, tap reopens the session (no origin)", () => {
    expect(zone).toContain("if (!whatsNext) {");
    // v269 re-base: the tap now routes through openPrayerSession —
    // the shared non-focused door, which still clears the origin
    // (v261's semantics) and additionally refuses to open over an
    // empty waiting list, the path that dealt his Oct 26 "Prayer
    // Time Complete — 0 people" screen. See people-v269.
    expect(zone).toContain("onPress={openPrayerSession}");
    expect(zone).toContain("borderRadius: 999, paddingHorizontal: 17, paddingVertical: 16");
  });

  it("no new pinned hexes in the v261 zone (only the pre-existing check green + white)", () => {
    const hexes = new Set(zone.match(/#[0-9A-Fa-f]{6}\b/g) ?? []);
    expect([...hexes].sort()).toEqual(["#2E7D4F", "#FFFFFF"]);
  });
});

describe("v261 source pins — the morph (prayer-session.tsx)", () => {
  it("the morph props exist and are optional", () => {
    expect(session).toContain("morphOrigin?: PrayerSessionMorphOrigin | null;");
    expect(session).toContain("morphSurface?: string;");
    expect(session).toContain("morphHeader?: { prayed: number; total: number } | null;");
  });

  it("the morph runs only with an origin, under Classic dress, never reduced motion", () => {
    expect(session).toContain("const morphActive = !!morphOrigin && !isSkinned && !reducedMotion;");
  });

  it("ONE motion: 380ms on the entrance curve family, no springs anywhere", () => {
    expect(session).toContain("const MORPH_DURATION_MS = 380;");
    expect(session).toContain("PEOPLE_ENTRANCE_EASING");
    expect(session).not.toContain("Animated.spring");
    expect(session).not.toContain("withSpring");
  });

  it("the overlay branch grows the card rect to the full window", () => {
    expect(morphBlock).toContain("outputRange: [morphOrigin.width, win.width]");
    expect(morphBlock).toContain("outputRange: [morphOrigin.height, win.height]");
    expect(morphBlock).toContain("outputRange: [26, 0]");
    expect(morphBlock).toContain("overflow: \"hidden\"");
  });

  it("the replica card header rides the container (the bar anchor)", () => {
    expect(morphBlock).toContain("Today's prayer list");
    expect(morphBlock).toContain('id="v261MorphGrad"');
    expect(morphBlock).toContain("outputRange: [1, 0]");
  });

  it("no pinned hexes inside the morph branch — session family roles only", () => {
    expect(morphBlock.match(/#[0-9A-Fa-f]{6}\b/g) ?? []).toEqual([]);
  });

  it("the Modal branch is preserved verbatim for launches without an origin", () => {
    expect(session).toContain('<Modal visible={visible} animationType="fade" onRequestClose={() => {}}>');
    expect(session).toContain("{sessionBody}");
  });

  it("exit completes before unmount: closes route through the morph-aware close", () => {
    expect(session).toContain("requestCloseRef");
    expect(session).toContain("morphClosingRef");
    const finish = session.slice(session.indexOf("const handleFinish"), session.indexOf("const sessionBody"));
    expect(finish).toContain("requestCloseRef.current();");
    expect(finish).not.toContain("onClose();");
    // the notification End path routes through it too
    expect(session).toContain("requestCloseRef.current();");
  });

  it("the v215 back-block and its once-per-session hint are untouched", () => {
    expect(session).toContain("hardwareBackPress");
    expect(session).toContain("backHintShownRef");
    expect(session).toContain("End the session to leave");
  });
});

describe("v261 unit — getWhatsNext (lib/whats-next.ts)", () => {
  const now = new Date(2026, 9, 26, 10, 0); // Mon Oct 26 2026, 10:00 local
  const ev = (patch: Partial<ScheduleEvent>): ScheduleEvent => ({
    id: "e1", title: "Event", date: "2026-10-26", isCompleted: false, ...patch,
  });
  const td = (patch: Partial<ScheduleTodo>): ScheduleTodo => ({
    id: "t1", title: "Todo", date: "2026-10-26", isCompleted: false, order: 0, ...patch,
  });
  const mn = (patch: Partial<ScheduleMinistry>): ScheduleMinistry => ({
    id: "m1", title: "Ministry", type: "Service", date: "2026-10-26", isCompleted: false, ...patch,
  });

  it("the earliest timed item strictly after now wins, across all three kinds", () => {
    const next = getWhatsNext(
      [ev({ id: "e-late", title: "Doctor visit", startTime: "14:00" })],
      [td({ id: "t-mid", title: "Water plants", startTime: "11:30" })],
      [mn({ id: "m-early", title: "Food bank", startTime: "11:00" })],
      now,
    );
    expect(next?.id).toBe("m-early");
    expect(next?.kind).toBe("ministry");
    expect(next?.timeLabel).toBe("11:00 AM");
  });

  it("past, completed, untimed, and other-day items never qualify", () => {
    const next = getWhatsNext(
      [
        ev({ id: "past", title: "Past", startTime: "09:00" }),
        ev({ id: "done", title: "Done", startTime: "12:00", isCompleted: true }),
        ev({ id: "allday", title: "All day" }),
        ev({ id: "tomorrow", title: "Tomorrow", date: "2026-10-27", startTime: "08:00" }),
        ev({ id: "at-now", title: "Starting right now", startTime: "10:00" }),
      ],
      [],
      [],
      now,
    );
    expect(next).toBeNull();
  });

  it("time-off events are eligible — claimed rest is still what's next", () => {
    const next = getWhatsNext([ev({ id: "off", title: "Time off", startTime: "13:00", isOffEvent: true })], [], [], now);
    expect(next?.id).toBe("off");
    expect(next?.timeLabel).toBe("1:00 PM");
  });

  it("the keyword resolves from the stored label, then detection", () => {
    const stored = getWhatsNext([ev({ title: "Appointment", startTime: "14:00", keyword: "Doctor" })], [], [], now);
    expect(stored?.keyword?.label).toBe("Doctor");
    const detected = getWhatsNext([ev({ title: "Dentist appointment", startTime: "14:00" })], [], [], now);
    expect(detected?.keyword?.label).toBe("Doctor");
    const none = getWhatsNext([ev({ title: "Zqxjk", startTime: "14:00" })], [], [], now);
    expect(none?.keyword).toBeNull();
  });
});
