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
    // Person cards stack with the drawing's 18dp gaps; the first
    // card of the stack sits close under the progress row.
    expect(stackCard).toContain("marginTop: stackFirst ? 4 : 18");
    expect(session).toContain("marginTop: settledPeople.length > 0 ? 18 : 0");
  });
});

describe("v289 — the settled dress is the drawing's (green check, lead at rest, needs dimmed)", () => {
  it("the settled header: prayed-green check disc and the drawing's meta words", () => {
    expect(stackCard).toContain('backgroundColor: "#31C48D", alignItems: "center", justifyContent: "center"');
    expect(stackCard).toContain('<MaterialIcons name="check" size={16} color="#FFFFFF" />');
    expect(stackCard).toContain('settled ? "Prayed today" : "Up next"');
    // The settled face ring tints toward the prayed green.
    expect(stackCard).toContain('mix(pm.card, "#31C48D", 0.25)');
    // The settled card's shadow rests softer than the active's.
    expect(stackCard).toContain("shadowRadius: settled ? 9 : 13");
    expect(stackCard).toContain("elevation: settled ? 2 : 4");
  });

  it("the settled/next lead is the FIRST card at rest — no halo, no session row, no timer", () => {
    expect(stackCard).not.toContain("FirstWarmShadow");
    expect(stackCard).not.toContain("sessionRow");
    expect(stackCard).not.toContain("TimerPulseDot");
    expect(stackCard).not.toContain("Complete prayer");
    // Its gradient is its own — never the active card's id.
    expect(stackCard).toContain("v289StackGrad-${person.id}");
    expect(stackCard).not.toContain("v254FirstGrad");
  });

  it("the settled person's other needs dim, as drawn", () => {
    expect(stackCard).toContain("opacity: settled ? 0.75 : 1");
  });

  it("only the ACTIVE lead glows: the halo still wraps exactly two cards in the file", () => {
    const halos = session.match(/<FirstWarmShadow/g) ?? [];
    expect(halos).toHaveLength(2);
    expect(session).toContain('<FirstWarmShadow paint="#D9A420">');
    expect(session).toContain("<FirstWarmShadow paint={PRAISE_CARD.deep}>");
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
