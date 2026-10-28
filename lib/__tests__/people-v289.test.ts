/**
 * v289 — "Pray Now, The Drawing's Composition": Jonathan's
 * ruling on his v288 screenshot (Oct 27 11:02, screenshot 10766):
 * "I also said I wanted the 'Pray Now' page to use the white
 * spaces. Everything's so fucking small? Why? And you still
 * didn't make it like the mockup..." The audit's §5 / D8 named
 * the open question — the two approved drawings disagree on
 * composition, and the shipped session followed urgent-feel's
 * INTERIOR inside a one-person wizard the drawing never drew.
 * He ruled for the drawing: praytoday-urgent-feel-v1's stack.
 *
 * What changed is LAYOUT ONLY:
 *  - The stage is a stack of person cards that fills the
 *    screen: the people already prayed this session stand
 *    SETTLED above (green check, "Prayed today", lead card at
 *    rest, other needs dimmed), the ACTIVE person in the
 *    middle with the v288 dress untouched (platform-real halo,
 *    fenced timer, the bigger scale), and the NEXT person
 *    below with their lead already visible and "Up next" in
 *    the meta line. The lone card parked over ~40% dead space
 *    is gone; when the stack outgrows the screen it scrolls.
 *  - Completing a prayer settles the active card and brings
 *    the next up: a plain scrollTo to the active wrapper's
 *    measured place, once per advance, settled from state on
 *    render — no background timers, no bounce, no springs.
 *    Reduced motion turns the settle into a cut.
 *  - Who counts as settled is handlePray's own session-local
 *    record (prayedIds) — a skipped person never wears the
 *    settled dress. It is render state only: onPray stays the
 *    sole write path and no mechanic reads the set.
 *
 * NOT touched (the brief's hard lines): PrayerSession's flow —
 * timer + AppState sync, time-bonus XP, per-person completion,
 * notification integration, the v215 back-block and its
 * once-per-session hint, Skip, every data path. The D11
 * standing exception is unchanged (a person-level emergency
 * does not displace the FIRST lead; getLeadNeed untouched),
 * and the focused praise/emergency legs keep their v269/v284
 * treatments — a focused session holds one person, so it has
 * no stack neighbours.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const session = read("components/prayer-session.tsx");
const stackCard = session.slice(
  session.indexOf("const renderStackCard"),
  session.indexOf("// Keep the ongoing notification showing who is currently being prayed for."),
);
const stackRegion = session.slice(
  session.indexOf("{settledPeople.map("),
  session.indexOf("{nextPerson ? renderStackCard(nextPerson,"),
);

describe("v289 — the drawing's stacked composition renders settled / active / next together", () => {
  it("the stack's members derive from session state on render", () => {
    // Settled = prayed this session, in session order, above the
    // active index; next = the person after the active.
    expect(session).toContain("sessionPeople.slice(0, currentIndex).filter((person) => prayedIds.has(person.id))");
    expect(session).toContain("const nextPerson = sessionPeople[currentIndex + 1];");
  });

  it("settled cards stand above the active card, the next below Skip", () => {
    const settledAt = session.indexOf('renderStackCard(person, "settled"');
    const activeAt = session.indexOf("<PeopleEntrance key={currentPerson.id}");
    const skipAt = session.indexOf("onPress={handleSkip}");
    const nextAt = session.indexOf('renderStackCard(nextPerson, "next"');
    expect(settledAt).toBeGreaterThan(-1);
    expect(activeAt).toBeGreaterThan(settledAt);
    expect(skipAt).toBeGreaterThan(activeAt);
    expect(nextAt).toBeGreaterThan(skipAt);
    // The next card is conditional — the last person has nobody
    // below, as drawn.
    expect(session).toContain("{nextPerson ? renderStackCard(nextPerson, \"next\", false) : null}");
  });

  it("the stack fills the stage at the drawing's card rhythm", () => {
    // v310 re-base: the slim rows stack tighter than the old
    // full cards — the first settled sits 16 under the segments,
    // settled rows 10 apart, the next row 14 below Skip. The
    // active hero still takes its 18 when a settled card stands
    // above it.
    expect(stackCard).toContain("marginTop: settled ? (stackFirst ? 16 : 10) : 14");
    expect(session).toContain("marginTop: settledPeople.length > 0 ? 18 : 0");
  });
});

describe("v289 — the settled dress is the drawing's (green check, lead at rest, needs dimmed) — v310: slim rows", () => {
  // v310 re-base: the new drawing deals the stack as ONE-LINE
  // rows — no lead panel, no needs, no ring. These pins hold
  // the slim dress and the absence of the old full-card one.
  it("the settled row: prayed-green check in its quiet disc, the lead named, +10 XP", () => {
    expect(stackCard).toContain('name="check" size={14} color="#2E7D4F"');
    expect(stackCard).toContain("`Prayed · ${lead.item.title}`");
    expect(stackCard).toContain('color: pm.deep }}>+10 XP</Text>');
    expect(stackCard).toContain("backgroundColor: settled ? pm.card : mix(pm.card, pm.seed, 0.07)");
    // The settled row's shadow rests softer than the next row's.
    expect(stackCard).toContain("shadowRadius: settled ? 9 : 7");
    expect(stackCard).toContain("elevation: settled ? 2 : 1");
  });

  it("the stack rows carry faces and no lead panel at all", () => {
    expect(stackCard).toContain("photoUri={person.photoUri} size={40}");
    expect(stackCard).toContain("UP NEXT");
    expect(stackCard).not.toContain("FirstWarmShadow");
    expect(stackCard).not.toContain("sessionRow");
    expect(stackCard).not.toContain("TimerPulseDot");
    expect(stackCard).not.toContain("Complete prayer");
    expect(stackCard).not.toContain("v289StackGrad");
    expect(stackCard).not.toContain("v254FirstGrad");
    expect(stackCard).not.toContain("prayerItems");
  });

  it("the settled person's needs do not render in the stack at all", () => {
    expect(stackCard).not.toContain("opacity: settled ? 0.75 : 1");
    expect(stackCard).not.toContain("shownOthers");
  });

  it("nothing glows anywhere: the halo wraps zero cards in the file", () => {
    const halos = session.match(/<FirstWarmShadow/g) ?? [];
    expect(halos).toHaveLength(0);
    expect(session).not.toContain('paint="#D9A420"');
  });
});

describe("v289 — completing a prayer settles the stack with a plain scroll, from state", () => {
  it("the list is ref'd and the settle scrolls to the active wrapper's measured place", () => {
    expect(session).toContain("ref={scrollRef}");
    expect(session).toContain("activeCardYRef.current = e.nativeEvent.layout.y;");
    expect(session).toContain("scrollRef.current?.scrollTo({ y: Math.max(0, activeCardYRef.current - 6), animated: !reducedMotion })");
  });

  it("the settle fires once per advance and never for the first person", () => {
    expect(session).toContain("if (idx <= 0 || scrolledForIndexRef.current === idx) return;");
    expect(session).toContain("scrolledForIndexRef.current = idx;");
    // Both paths settle — the wrapper's layout and the index
    // effect — and neither is a timer or a spring.
    const settle = session.slice(session.indexOf("const settleScrollToActive"), session.indexOf("const renderStackCard"));
    expect(settle).not.toContain("setTimeout");
    expect(settle).not.toContain("setInterval");
    expect(settle).not.toContain("spring");
  });
});

describe("v289 — the flow is untouched: settled is render state, mechanics keep their shape", () => {
  it("prayedIds is written only by handlePray and the session reset", () => {
    expect(session).toContain("setPrayedIds((prev) => new Set(prev).add(currentPerson.id));");
    expect(session).toContain("setPrayedIds(new Set());");
    const writes = session.match(/setPrayedIds\(/g) ?? [];
    expect(writes).toHaveLength(2);
  });

  it("handlePray still prays, counts, and advances exactly as before", () => {
    const pray = session.slice(session.indexOf("const handlePray"), session.indexOf("const handleSkip"));
    expect(pray).toContain("onPray(currentPerson.id, position);");
    expect(pray).toContain("setPrayedCount((c) => c + 1);");
    expect(pray).toContain("setIsFinished(true);");
    expect(pray).toContain("setCurrentIndex((i) => i + 1);");
  });

  it("the session still snapshots its people and keeps the v215 back-block", () => {
    expect(session).toContain("setSessionPeople([...people]);");
    expect(session).toContain("backHintShownRef");
    expect(session).toContain("End the session to leave");
  });
});

describe("v289 — the stack region keeps the active card's v288 substance", () => {
  it("the active card still stands in its entrance, at full width, inside the measuring wrapper", () => {
    expect(stackRegion).toContain('<PeopleEntrance key={currentPerson.id} emphasis style={{ width: "100%" }}>');
    expect(stackRegion).toContain("onLayout={(e) => {");
  });
});
