/**
 * v266 — "One XP Pill": Jonathan's Oct 26 screenshot (Person 3 of
 * 19) showed TWO identical orange "+15 XP" pills on screen at once —
 * one award, drawn twice. The award itself is single end-to-end:
 * handlePray → the parent's one awardXP call → applyXPAward computes
 * the points once (prayer base 10 × his multipliers = 15) → exactly
 * one emitXPGain. But XpGainIndicator subscribes to the gain bus per
 * mounted instance, and TWO were mounted during a session: the
 * app-wide one in app/_layout and one inside the shared sessionBody.
 * The in-session copy dates from Oct 8, when the session was a Modal
 * and the root indicator sat behind it. Since v261 the standard
 * Classic launch presents the session as an in-shell overlay, so the
 * root indicator shows too — and every in-session gain drew twice.
 * The fix: the session's own indicator mounts ONLY in the Modal root
 * (Paper/8-bit/Terminal skins and pill/emergency/bell launches, where
 * the root indicator is behind the Modal); the morph-overlay root
 * relies on the root indicator. One presentation, one indicator.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const session = read("components/prayer-session.tsx");
const layout = read("app/_layout.tsx");

const bodyBlock = session.slice(session.indexOf("const sessionBody = ("), session.indexOf("if (morphActive && morphOrigin) {"));
const morphBlock = session.slice(session.indexOf("if (morphActive && morphOrigin) {"), session.indexOf('<Modal visible={visible} animationType="fade"'));
const modalBlock = session.slice(session.indexOf('<Modal visible={visible} animationType="fade"'));

const count = (haystack: string) => (haystack.match(/<XpGainIndicator \/>/g) ?? []).length;

describe("v266 source pins — one XP pill (prayer-session.tsx)", () => {
  it("the session file mounts exactly one XpGainIndicator", () => {
    expect(count(session)).toBe(1);
  });

  it("the shared sessionBody carries NO indicator — both roots render the body", () => {
    expect(bodyBlock).not.toContain("<XpGainIndicator />");
  });

  it("the morph-overlay root renders NO indicator — the root _layout one shows through", () => {
    expect(morphBlock).toContain("{sessionBody}");
    expect(morphBlock).not.toContain("<XpGainIndicator />");
  });

  it("the Modal root mounts the session's own indicator alongside the body", () => {
    expect(modalBlock).toContain("{sessionBody}");
    expect(modalBlock).toContain("<XpGainIndicator />");
  });

  it("root selection stays the single existing morphActive condition", () => {
    expect(session).toContain("const morphActive = !!morphOrigin && !isSkinned && !reducedMotion;");
    expect(session).toContain("if (morphActive && morphOrigin) {");
  });

  it("the indicator import survives — the Modal root still needs it", () => {
    expect(session).toContain('import { XpGainIndicator } from "@/components/xp-gain-indicator";');
  });
});

describe("v266 source pins — the app-wide indicator stays (app/_layout.tsx)", () => {
  it("the root indicator is still mounted exactly once", () => {
    expect(count(layout)).toBe(1);
    expect(layout).toContain('import { XpGainIndicator } from "@/components/xp-gain-indicator";');
  });
});
