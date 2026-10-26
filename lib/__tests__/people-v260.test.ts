/**
 * v260 — "See Everyone on the List": Jonathan's Oct 26 ask, with a
 * screenshot of a 19-person day — "I don't like that I can't see who
 * the +14 more are in the 'today's prayer list' section. Can we make
 * that scrollable or openable?" He delegated the design; the answer
 * is BOTH. The static +N tile is gone: collapsed, the face row is a
 * horizontal ScrollView over the FULL queue (fixed-width columns, so
 * the next face peeks at the card's edge); the header's Material
 * expand button — rendered only past five faces — swaps the row for
 * a wrapped 5-column grid of everyone. One shared face renderer
 * serves both modes, so the bar's tap semantics (tap = mark prayed,
 * pending = undo, countdown pill in place of the status line) are
 * identical either way. Governance unchanged: every color is a pmf
 * role — derive, never pin.
 *
 * v262 addendum (same-day device verdict): two of this build's
 * claims were reversed by Jonathan — "I also like the '+N' circle
 * at the end. I just wanted it to be more functional" and the
 * expand swap needed real animation. The +N circle returns as a
 * functional Pressable and the tray animates with a rotating
 * chevron; the three pins that asserted the old shapes were
 * updated in place below, and people-v262.test.ts carries the
 * new pins.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const queue = index.slice(index.indexOf("const renderQueueCard"), index.indexOf("const renderStreakCard"));

describe("v260 source pins — no truncation; the +N tile is a button since v262 (index.tsx)", () => {
  it("the queue is never sliced — no slice(0, 5) anywhere in the card", () => {
    expect(queue).not.toContain("slice(0, 5)");
    expect(queue).not.toContain("slice(0,5)");
    expect(queue).not.toContain("const faces =");
  });

  it("the pre-v260 STATIC +N tile stays gone — the circle that returns in v262 is a button", () => {
    // The v259 tile was a plain View with a slice-derived count.
    // v262 brings the circle back (his correction) as a Pressable
    // on the shared tray toggle — the dead tile must not return.
    expect(queue).not.toContain("queueFaces.slice(0, 5)");
    expect(queue).toContain(">+{moreCount}</Text>");
    expect(queue).toContain("onPress={toggleQueueExpanded}");
  });

  it("both modes map the FULL queueFaces list", () => {
    expect(queue).toContain("queueFaces.map((person) => renderQueueFace(person, { width: 56 }))");
    expect(queue).toContain("queueFaces.map((person) => renderQueueFace(person, { width: \"20%\" }))");
  });

  it("an empty day still hides the card exactly as before", () => {
    expect(queue).toContain("if (total === 0 && prayTodayList.length === 0) return null;");
  });
});

describe("v260 source pins — collapsed = scrollable (index.tsx)", () => {
  it("the collapsed row is a horizontal ScrollView with no scroll indicator", () => {
    expect(queue).toContain("<ScrollView horizontal showsHorizontalScrollIndicator={false}");
  });

  it("faces ride fixed-width columns (~56px, gap ~9) so the next face peeks at the edge", () => {
    expect(queue).toContain("contentContainerStyle={{ flexDirection: \"row\", gap: 9 }}");
    expect(queue).toContain("renderQueueFace(person, { width: 56 })");
  });
});

describe("v260 source pins — openable = expand button + grid (index.tsx)", () => {
  it("expanded state lives in the host component", () => {
    expect(index).toContain("const [queueExpanded, setQueueExpanded] = useState(false);");
  });

  it("the expand button renders ONLY when the list runs past five faces", () => {
    expect(queue).toContain("const canExpandQueue = queueFaces.length > 5;");
    expect(queue).toContain("{canExpandQueue ? (");
  });

  it("the button is a tonal pmf circle whose chevron rotates with the tray (v262)", () => {
    expect(queue).toContain("backgroundColor: pmf.wash");
    expect(queue).toContain("name=\"expand-more\"");
    expect(queue).toContain("rotate: queueTrayProgress.interpolate");
    expect(queue).toContain("color={pmf.deep}");
    expect(queue).toContain("onPress={toggleQueueExpanded}");
  });

  it("expanded mode replaces the row with a wrapped grid of everyone", () => {
    expect(queue).toContain("{queueExpanded ? (");
    expect(queue).toContain("flexDirection: \"row\", flexWrap: \"wrap\"");
    expect(queue).toContain("renderQueueFace(person, { width: \"20%\" })");
  });

  it("the header count text is kept, word for word", () => {
    expect(queue).toContain("{prayed} of {total} prayed · {Math.max(0, total - prayed)} to go");
  });
});

describe("v260 source pins — one shared face renderer, semantics intact (index.tsx)", () => {
  it("exactly one face renderer exists and both modes call it", () => {
    expect(queue.match(/const renderQueueFace =/g)).toHaveLength(1);
    expect(queue.match(/renderQueueFace\(person/g)).toHaveLength(2);
  });

  it("the renderer's tap is the bar's semantics: pending = undo, otherwise mark prayed — written once", () => {
    expect(queue.match(/handleMarkPrayTodayPerson\(person\.id\)/g)).toHaveLength(1);
    expect(queue).toContain("isPending ? handleUndoPrayTodayPerson(person.id) : handleMarkPrayTodayPerson(person.id)");
  });

  it("pending still swaps the status line for the undo countdown; done still rings seed + check", () => {
    expect(queue).toContain("<UndoCountdownTimer color={pmf.deep} variant=\"pill\" />");
    expect(queue).toContain("queueFaceStatus(person, done)");
    expect(queue).toContain("borderColor: done || isPending ? pmf.seed : pmf.wash2");
    expect(queue).toContain("queueFirstName(person.name)");
  });
});

describe("v260 source pins — derive, never pin (index.tsx)", () => {
  it("the new v260 surfaces (expand button, scroll row, grid) introduce no hex constants", () => {
    const newLines = queue
      .split("\n")
      .filter((line) => line.includes("expand") || line.includes("ScrollView horizontal") || line.includes("flexWrap") || line.includes("canExpandQueue"));
    expect(newLines.length).toBeGreaterThan(0);
    for (const line of newLines) {
      expect(line).not.toMatch(/#[0-9A-Fa-f]{6}/);
    }
  });
});
