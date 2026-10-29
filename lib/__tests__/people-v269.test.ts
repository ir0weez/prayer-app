/**
 * v269 — "A Prayer Just for Them": Jonathan's Oct 26 11:42 screenshot
 * showed the session opening onto "Prayer Time Complete — You prayed
 * for 0 people in 00:07 · +0 XP" after he tapped Pray now on an
 * emergency card for a person he had ALREADY prayed for that day.
 * The chain: the emergency/praise cards stay on the front door the
 * full 24 hours (his standing rule), but the session's list excluded
 * anyone already prayed — and the v256 per-person launch only
 * ROTATED that list, so the target silently vanished (findIndex −1)
 * and an all-prayed day dealt an empty session that opened straight
 * onto its finished screen.
 *
 * His pick (Oct 26 11:45): "Focused — a prayer just for that
 * person." A card's Pray now now opens a session of exactly that
 * person, built from the full people record, prayed-today or not:
 *  - the emergency card keeps the standard lead path (getLeadNeed
 *    is person-scoped and fires identically on a 1-person list);
 *  - the praise card gains its own Pray now (it had only Post to
 *    Journal) and the focused session deals a GOLD praise lead in
 *    the FIRST slot (praise-display headline + note, PRAISE_CARD
 *    paints — the front-door praise card's own colors);
 *  - the focused complete screen honestly totals 1 person, and
 *    offers Keep praying (into the still-waiting list, in-session)
 *    only when others were waiting at launch;
 *  - the four ordinary launchers share one guarded door: a session
 *    never opens over an empty list again.
 *
 * XP, traced — not assumed: the focused pray routes through the
 * same onPray → commitPrayTodayPerson → awardExperience(
 * "scheduled-prayer", `${today}:${personId}`) path, whose ledger
 * key makes a re-pray of an already-prayed person award 0 and emit
 * no gain. The focused re-pray completes normally; it simply does
 * not pay twice. Nothing in this build touches the award path.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const session = read("components/prayer-session.tsx");
const material = read("lib/people-material.ts");

describe("v269 source pins — PRAISE_CARD (lib/people-material.ts)", () => {
  const praiseCard = material.slice(material.indexOf("export const PRAISE_CARD"), material.indexOf("export type PeoplePaletteTokens"));

  it("the praise lead's paints are the front-door praise card's own colors", () => {
    expect(praiseCard).toContain('bgFrom: "#FFF3D6"');
    expect(praiseCard).toContain('bgTo: "#FFE9B8"');
    expect(praiseCard).toContain('line: "#F5D67B"');
    expect(praiseCard).toContain('ink: "#4A3205"');
    expect(praiseCard).toContain('sub: "#7A5A14"');
    expect(praiseCard).toContain('deep: "#B26E12"');
    expect(praiseCard).toContain('pillInk: "#FFFFFF"');
  });

  it("it sits beside FIRST_CARD — meaning colors, never seed roles", () => {
    expect(material.indexOf("export const PRAISE_CARD")).toBeGreaterThan(material.indexOf("export const FIRST_CARD"));
  });
});

describe("v269 source pins — the focus state and the session's list (index.tsx)", () => {
  it("the shell carries focus state, the launch waiting count, and the reset nonce", () => {
    expect(index).toContain("const [prayerSessionFocusId, setPrayerSessionFocusId] = useState<string | null>(null);");
    expect(index).toContain('const [prayerSessionFocusKind, setPrayerSessionFocusKind] = useState<"emergency" | "praise" | null>(null);');
    expect(index).toContain("const [prayerSessionFocusWaiting, setPrayerSessionFocusWaiting] = useState(0);");
    expect(index).toContain("const [sessionResetNonce, setSessionResetNonce] = useState(0);");
  });

  it("the focus branch stands FIRST in sessionPeople: exactly the one person, from the full record", () => {
    const memo = index.slice(index.indexOf("const sessionPeople = useMemo("), index.indexOf("const reachEntries = useMemo("));
    expect(memo).toContain("if (prayerSessionFocusId) {");
    expect(memo).toContain("people.find((person) => person.id === prayerSessionFocusId)");
    expect(memo).toContain("if (focused) return [focused];");
    // The v256 rotation survives below the focus branch, untouched.
    expect(memo.indexOf("if (prayerSessionFocusId)")).toBeLessThan(memo.indexOf("prayablePrayTodayList.findIndex"));
    expect(memo).toContain("[...prayablePrayTodayList.slice(at), ...prayablePrayTodayList.slice(0, at)]");
  });

  it("a focused launch captures the others-waiting count at launch, not live", () => {
    const helper = index.slice(index.indexOf("const openFocusedPrayerSession"), index.indexOf("const keepPrayingFromFocus"));
    expect(helper).toContain("setPrayerSessionFocusWaiting(prayablePrayTodayList.filter((person) => person.id !== personId).length);");
    expect(helper).toContain("setPrayerSessionFocusId(personId);");
    expect(helper).toContain("setPrayerSessionFocusKind(kind);");
  });

  it("Keep praying clears the focus and bumps the nonce — the list swaps under the open session", () => {
    const helper = index.slice(index.indexOf("const keepPrayingFromFocus"), index.indexOf("const handleMarkPrayTodayPerson"));
    expect(helper).toContain("setPrayerSessionFocusId(null);");
    expect(helper).toContain("setPrayerSessionFocusKind(null);");
    expect(helper).toContain("setSessionResetNonce((nonce) => nonce + 1);");
  });

  it("closing the session clears the focus with everything else", () => {
    expect(index).toContain("setPrayerSessionFocusId(null); setPrayerSessionFocusKind(null); setPrayerSessionFocusWaiting(0);");
  });

  it("the mount hands the session its focus wiring", () => {
    expect(index).toContain("focusKind={prayerSessionFocusKind}");
    expect(index).toContain("resetNonce={sessionResetNonce}");
    expect(index).toContain("keepPrayingCount={prayerSessionFocusWaiting}");
    expect(index).toContain("onKeepPraying={keepPrayingFromFocus}");
  });
});

describe("v269 source pins — the launch sites (index.tsx)", () => {
  it("the emergency card's Pray now FOCUSES its person (the v256 rotation is superseded here)", () => {
    expect(index).toContain('openFocusedPrayerSession(entry.person.id, "emergency")');
  });

  it("the praise card has a Pray now of its own, in the emergency pill's style with gold ink", () => {
    const praise = index.slice(index.indexOf("const renderPraiseCard"), index.indexOf("const renderSlipCard"));
    expect(praise).toContain('openFocusedPrayerSession(praisedPerson.id, "praise")');
    expect(praise).toContain(">Pray now</Text>");
    expect(praise).toContain('color: "#B26E12"');
    // Post to Journal survives beside it, untouched.
    expect(praise).toContain("Post to Journal");
  });

  it("the ordinary launchers share the guarded door: bell, floating pill, complete card", () => {
    expect(index).toContain("onPrayToday={openPrayerSession}");
    expect(index).toContain("onPress={openPrayerSession}");
    const door = index.slice(index.indexOf("const openPrayerSession"), index.indexOf("const openFocusedPrayerSession"));
    expect(door).toContain("if (prayablePrayTodayList.length === 0) return;");
    expect(door).toContain("setShowPrayerSession(true);");
  });

  it("the queue footer's morph launch refuses an empty list before it measures", () => {
    const footer = index.slice(index.indexOf("const renderQueueCard"), index.indexOf("const renderStreakCard"));
    expect(footer).toContain("if (prayablePrayTodayList.length === 0) return;");
    expect(footer.indexOf("if (prayablePrayTodayList.length === 0) return;")).toBeLessThan(footer.indexOf("card.measureInWindow"));
  });

  it("the award path is untouched — a focused re-pray rides the ledgered scheduled-prayer award", () => {
    expect(index).toContain('awardExperience("scheduled-prayer", `${today}:${personId}`');
  });
});

describe("v269 source pins — the focused session (prayer-session.tsx)", () => {
  it("the focus props exist and are optional", () => {
    expect(session).toContain('focusKind?: "emergency" | "praise" | null;');
    expect(session).toContain("resetNonce?: number;");
    expect(session).toContain("keepPrayingCount?: number;");
    expect(session).toContain("onKeepPraying?: () => void;");
  });

  it("the kind is snapshotted at reset, and the reset re-runs when the nonce bumps", () => {
    expect(session).toContain('const [sessionFocusKind, setSessionFocusKind] = useState<"emergency" | "praise" | null>(null);');
    expect(session).toContain("setSessionFocusKind(focusKind ?? null);");
    expect(session).toContain("}, [visible, resetNonce, focusKind]);");
  });

  it("a focused praise leg deals the gold lead: praise-display words, PRAISE_CARD paints, the FIRST grammar", () => {
    // v310 re-base: FIRST_CARD left the session with its card;
    // the praise lead keeps its slot and words, flattened.
    expect(session).toContain('import { PRAISE_CARD } from "@/lib/people-material";');
    expect(session).not.toContain("FIRST_CARD");
    expect(session).toContain('import { getPraiseDisplay } from "@/lib/praise-display";');
    expect(session).toContain('const praiseFocus = sessionFocusKind === "praise";');
    expect(session).toContain("const praiseDisplay = praiseFocus ? getPraiseDisplay(currentPerson) : null;");
    const praiseLead = session.slice(session.indexOf("{praiseFocus && praiseDisplay ? ("), session.indexOf("{/* The other needs"));
    // v310: the halo and the gradient retire — the praise lead
    // is its family's flat solid fill inside its line border.
    expect(praiseLead).not.toContain("FirstWarmShadow");
    expect(praiseLead).not.toContain('id="v269PraiseGrad"');
    expect(praiseLead).toContain("backgroundColor: PRAISE_CARD.bgTo");
    expect(praiseLead).toContain("borderColor: PRAISE_CARD.line");
    expect(praiseLead).toContain(">PRAISE</Text>");
    expect(praiseLead).toContain("{praiseDisplay.headline}");
    expect(praiseLead).toContain("{praiseDisplay.note}");
    // The session row no longer rides inside ANY lead — the
    // Complete bar stands beneath the scroll, exactly once.
    expect(session).not.toContain("{sessionRow}");
  });

  it("the need-lead stands down only on the praise leg; the Complete bar never doubles", () => {
    expect(session).toContain("const lead = praiseFocus ? null : getLeadNeed(currentPerson);");
    // v310: there is no standalone in-card row left to double —
    // one bar, one Complete button, for every leg.
    expect(session.match(/>Complete prayer<\/Text>/g) ?? []).toHaveLength(1);
    expect(session.match(/onPress=\{handlePray\}/g) ?? []).toHaveLength(1);
    // v264's shape survives around it: every need shows, fully quiet.
    expect(session).toContain("const shownOthers = otherItems;");
    expect(session).toContain('{lead?.kind === "first" ? (');
  });

  it("the timer ring is retired — the bar's thread wears the seed family on every leg", () => {
    // v310: no ring remains to wear a family. The Complete
    // bar's clock and thread are the seed family's for first,
    // praise, and plain legs alike.
    expect(session).not.toContain("hexToRgba(PRAISE_CARD.ink, 0.25)");
    expect(session).not.toContain("ringStroke");
    // v339: the thread is the shared wavy fill in the seed on the
    // wash2 track, still driven by the time-bonus progress.
    expect(session).toContain("value={getTimeBonusProgress(elapsedSeconds)} color={pm.seed} trackColor={pm.wash2}");
  });

  it("the focused complete screen: Keep praying only when others were waiting at launch", () => {
    expect(session).toContain("const showKeepPraying = isFinished && sessionFocusKind !== null && (keepPrayingCount ?? 0) > 0 && !!onKeepPraying;");
    expect(session).toContain("onKeepPraying?.();");
    expect(session).toContain(">Keep praying</Text>");
    // The standard Finish stands in both variants.
    expect(session).toContain(">Finish</Text>");
    expect(session).toContain("onPress={handleFinish}");
  });
});
