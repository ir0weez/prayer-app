/**
 * v272 — "The Little Red Countdown": Jonathan's Oct 26 12:04
 * screenshot — on the closed Gutierrez household card the red
 * "Emergency · ≈24h" pill rendered huge, truncating the family
 * name to "Gutierr…" and crushing the meta text into a tall
 * narrow column. His ask: 'can the "Emergency ≈24" just be a red
 * countdown pill (as the hours go down, the pill decreases)? Or
 * something simpler? It's taking up too much space…'
 *
 * What v272 does:
 *  1. The shared EmergencyPrayerPill is rewritten compact: ~20px
 *     tall, dark-red ground (#991B1B), bright red fill (#EF4444)
 *     that DRAINS as the 24 hours run down, label = compact time
 *     only ("24h" / "9h" / "45m") — no "Emergency ·" prefix, no
 *     verbose "9h 12m". New API: millisRemaining + the pure
 *     helpers emergencyCountdownFraction /
 *     formatEmergencyCountdownCompact.
 *  2. The household card's inline pill is DELETED from the head
 *     row; the compact pill rides in the trailing zone stacked
 *     directly under the FamilyChevron. The family name gets the
 *     v256 shrink-to-fit discipline (adjustsFontSizeToFit,
 *     minimumFontScale 0.7) so "Gutierrez Family" renders whole;
 *     the meta keeps the text column's full width. Person names
 *     in rows get shrink-to-fit too.
 *  3. Every roster site (single-person row, Classic unfurl,
 *     skinned unfurl) feeds the shared pill the countdown it
 *     already tracks. The front-door emergency CARD and the bell
 *     never used this pill and are untouched.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

// The pill module imports react-native for its View/Text shell;
// the helpers under test are pure — stand the shell aside.
vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    absoluteFillObject: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  },
}));

import {
  EMERGENCY_COUNTDOWN_WINDOW_MS,
  emergencyCountdownFraction,
  formatEmergencyCountdownCompact,
} from "@/components/emergency-prayer-pill";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const pill = read("components/emergency-prayer-pill.tsx");

const familyCard = index.slice(index.indexOf("const renderFamilyCard"), index.indexOf("const renderPersonCard"));
const personCard = index.slice(index.indexOf("const renderPersonCard"), index.indexOf("const renderExpandedFamily"));
const unfurl = index.slice(index.indexOf("const renderExpandedFamily"), index.indexOf("const renderPeopleSectionRow"));

const H = 60 * 60 * 1000;
const M = 60 * 1000;

describe("v272 — the countdown helpers", () => {
  it("the window is the emergency's 24 hours", () => {
    expect(EMERGENCY_COUNTDOWN_WINDOW_MS).toBe(24 * H);
  });

  it("the fill stands full at 24h and drains with the hours", () => {
    expect(emergencyCountdownFraction(24 * H)).toBe(1);
    expect(emergencyCountdownFraction(12 * H)).toBe(0.5);
    expect(emergencyCountdownFraction(6 * H)).toBe(0.25);
    expect(emergencyCountdownFraction(45 * M)).toBeCloseTo(45 / (24 * 60));
  });

  it("the fill clamps: over-full reads full, spent reads empty", () => {
    expect(emergencyCountdownFraction(48 * H)).toBe(1);
    expect(emergencyCountdownFraction(0)).toBe(0);
    expect(emergencyCountdownFraction(-5 * M)).toBe(0);
    expect(emergencyCountdownFraction(Number.NaN)).toBe(0);
  });

  it("the label is compact: whole hours, then minutes, never words", () => {
    expect(formatEmergencyCountdownCompact(24 * H)).toBe("24h");
    expect(formatEmergencyCountdownCompact(23 * H + 59 * M)).toBe("23h");
    expect(formatEmergencyCountdownCompact(9 * H + 12 * M)).toBe("9h");
    expect(formatEmergencyCountdownCompact(59 * M)).toBe("59m");
    expect(formatEmergencyCountdownCompact(45 * M)).toBe("45m");
    expect(formatEmergencyCountdownCompact(90 * 1000)).toBe("1m");
    expect(formatEmergencyCountdownCompact(0)).toBe("0m");
  });
});

describe("v272 — the pill itself is little, red, and draining", () => {
  it("the component wears the spec'd paints and footprint", () => {
    expect(pill).toContain('backgroundColor: "#991B1B"');
    expect(pill).toContain('backgroundColor: "#EF4444"');
    expect(pill).toContain("height: 20");
    expect(pill).toContain('fontWeight: "800"');
  });

  it("the fill width is the countdown fraction", () => {
    expect(pill).toContain("emergencyCountdownFraction(millisRemaining)");
    expect(pill).toContain("Math.round(fraction * 100)");
  });

  it("the API is millisRemaining — the verbose label API is gone", () => {
    expect(pill).toContain("millisRemaining: number");
    expect(pill).not.toContain("timeRemaining");
    expect(pill).not.toContain("progress?:");
  });
});

describe("v272 — the household card gives the name its space back", () => {
  it("the old inline head-row pill is gone — no 'Emergency ·' anywhere in the screen", () => {
    expect(index).not.toContain("Emergency ·");
    expect(familyCard).not.toContain('shadowColor: "#EF4444"');
  });

  it("the compact pill rides in the trailing zone, stacked under the chevron", () => {
    expect(familyCard).toContain('alignItems: "center", gap: 5');
    const chevronAt = familyCard.indexOf("<FamilyChevron");
    const pillAt = familyCard.indexOf("<EmergencyPrayerPill millisRemaining={emergencyCountdown} />");
    expect(chevronAt).toBeGreaterThan(-1);
    expect(pillAt).toBeGreaterThan(chevronAt);
  });

  it("the family name shrinks to fit instead of truncating", () => {
    const nameAt = familyCard.indexOf("{familyName}</Text>");
    const nameLine = familyCard.slice(familyCard.lastIndexOf("<Text", nameAt), nameAt);
    expect(nameLine).toContain("numberOfLines={1}");
    expect(nameLine).toContain("adjustsFontSizeToFit");
    expect(nameLine).toContain("minimumFontScale={0.7}");
  });
});

describe("v272 — every roster site feeds the shared pill its countdown", () => {
  it("the single-person row", () => {
    expect(personCard).toContain("<EmergencyPrayerPill millisRemaining={emergencyCountdown} />");
    expect(personCard).not.toContain("timeRemaining=");
  });

  it("both unfurls (Classic + skinned)", () => {
    const calls = unfurl.match(/<EmergencyPrayerPill millisRemaining=\{emergencyCountdown\} \/>/g) ?? [];
    expect(calls.length).toBe(2);
    expect(unfurl).not.toContain("timeRemaining=");
  });

  it("person names in rows shrink to fit too", () => {
    expect(personCard).toContain("adjustsFontSizeToFit");
    expect(unfurl).toContain("adjustsFontSizeToFit");
  });

  it("no roster site keeps the old pill API", () => {
    expect(index).not.toContain("timeRemaining=");
    expect(index).not.toContain("progress={emergencyProgress}");
  });
});
