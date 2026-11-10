/**
 * v300 — the household→single seam on the People roster lost its
 * spacing (Jonathan, Oct 28, screenshots 10805 + 10804: "how come
 * coming from a grouped todos into a single prayer contact has no
 * space?" — Madrid Family → Eva Sandoval; Palacios Family →
 * William Fren).
 *
 * ROOT CAUSE (Classic dress): the two roster card kinds carry
 * their spacing on opposite edges. The household card
 * (renderFamilyCard) owns its gap as marginTop
 * (ROSTER_HOUSEHOLD_GAP) with NO marginBottom; a single-person
 * card owns its gap as marginBottom (styles.singlePersonCard:
 * 6 + gapBoost) with NO marginTop. React Native margins never
 * collapse, so the card-to-card gap is prev.marginBottom +
 * next.marginTop:
 *   household → household = 0 + 9 = 9   ✓
 *   single    → single    = 8 + 0 = 8   ✓
 *   household → single    = 0 + 0 = 0   ✗ THE SEAM
 * The seam single in both screenshots is exactly the first
 * single of a section that has households. An expanded household
 * never collapsed: its UnfurlPanel trails marginBottom 10. The
 * skinned dresses never collapsed either: both card kinds share
 * styles.personCard's marginBottom there.
 *
 * THE FIX: the seam single supplies the household's own gap
 * value as its marginTop (ROSTER_HOUSEHOLD_GAP, the same
 * constant the household card's marginTop reads), so the seam
 * gap equals the household-run gap by construction. The margin
 * is owed only while the household directly above rests
 * collapsed — expanded/closing households carry the gap through
 * the panel's marginBottom, and adding the margin there would
 * double-space the seam.
 *
 * The reverse seam (single → household) does not exist in the
 * data: peopleRows builds every section as header → families →
 * singles (asserted below), so singles never precede a household
 * inside a section, and a section header always intervenes
 * between sections.
 *
 * v489 AMENDMENT (the one-card rebuild): the household is a
 * single card now — the group unit's root wears the surface —
 * and the panel SHEET that trailed marginBottom 10 under an
 * expanded household is gone, so nothing below a household
 * carries the seam gap in either state. The seam single
 * therefore supplies the household gap as its marginTop whether
 * the household above is open or closed (previously: only while
 * it rested collapsed). The margin model itself is unchanged:
 * the household card still carries gap-before only (marginTop
 * ROSTER_HOUSEHOLD_GAP, no marginBottom), now read off the
 * familyCardSurface literal the composition hands the unit.
 *
 * These pins extract the layout values from the shipped source
 * and resolve the seam gaps through the margin model above.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const home = read("app/(tabs)/index.tsx");

const gapMatch = home.match(/const ROSTER_HOUSEHOLD_GAP = (\d+);/);
const HOUSEHOLD_GAP = Number(gapMatch?.[1]);

// The Classic household card's own style literal.
// v489 re-pin: the card is the group unit's root now — its
// surface is the familyCardSurface literal the composition
// (renderPeopleFamilyRow) hands FamilyGroupUnit as cardStyle.
const familyCardStyle =
  home.match(/const familyCardSurface = !isSkinned \? \{([\s\S]*?)\} : undefined;/)?.[1] ?? "";
// styles.singlePersonCard's gap-after value (base; gapBoost adds on top).
const singleMarginBottomBase = Number(
  home.match(/singlePersonCard: \{\s*minHeight: [^,]+,\s*marginHorizontal: \d+,\s*marginBottom: (\d+) \+ gapBoost,/)?.[1],
);

describe("v300 — household→single seam spacing", () => {
  it("the household gap is one named constant", () => {
    expect(gapMatch).not.toBeNull();
    expect(HOUSEHOLD_GAP).toBe(9);
  });

  it("the Classic household card carries gap-before only (marginTop, no marginBottom)", () => {
    expect(familyCardStyle).toContain("marginTop: ROSTER_HOUSEHOLD_GAP");
    expect(familyCardStyle).not.toContain("marginBottom");
  });

  it("the single card carries gap-after only (marginBottom, no marginTop in its styles)", () => {
    expect(singleMarginBottomBase).toBe(6);
    const block = home.match(/singlePersonCard: \{([\s\S]*?)\},/)?.[1] ?? "";
    expect(block).not.toContain("marginTop");
  });

  it("the margin model: household→household gap is the household gap", () => {
    const familyMarginBottom = 0; // asserted above: no marginBottom
    expect(familyMarginBottom + HOUSEHOLD_GAP).toBe(HOUSEHOLD_GAP);
  });

  it("the seam single supplies the household gap as its marginTop", () => {
    expect(home).toContain(
      "seamAfterFamily && { marginTop: ROSTER_HOUSEHOLD_GAP }",
    );
    // ...so the collapsed seam resolves to the household-run gap:
    const familyMarginBottom = 0;
    expect(familyMarginBottom + HOUSEHOLD_GAP).toBe(HOUSEHOLD_GAP);
  });

  it("renderPersonCard takes the seam flag as its fourth input", () => {
    expect(home).toContain(
      "const renderPersonCard = (person: Person, index?: number, array?: Person[], seamAfterFamily = false) => {",
    );
  });

  it("the seam predicate: first single of a section with households, Classic only", () => {
    // v367 amendment (Oct 30): closing state was retired with
    // the animated panel, so the predicate then asked only
    // whether the household above is the expanded one.
    // v489 re-pin: the expansion exemption is retired too — the
    // one card trails no gap in either state (see the next
    // test), so the predicate no longer reads the expanded
    // household at all, and seamFamilyId is gone with it.
    expect(home).toContain(
      "const seamAfterFamily = !isSkinned && item.index === 0 && sectionFamilies.length > 0;",
    );
    expect(home).not.toContain("seamFamilyId");
    expect(home).toContain(
      "renderRow={() => renderPersonCard(item.person, item.index, item.section.people, seamAfterFamily)}",
    );
  });

  it("the seam flag rides the row fingerprint (re-renders as the household above expands/collapses)", () => {
    expect(home).toContain("${seamAfterFamily ? 1 : 0}");
  });

  it("v489 re-pin: no panel trails a margin anymore — the seam gap is owed in both household states", () => {
    // Through v487 an expanded household carried the seam gap
    // itself: its panel sheet trailed marginBottom 10, and the
    // seam margin was owed only while the household rested
    // collapsed. The sheet is gone in the one-card rebuild (no
    // marginTop −14 / marginBottom 10 pair anywhere in the
    // source), and the card carries no marginBottom either, so
    // the seam resolves to the household gap in both states —
    // supplied, per the tests above, by the seam single.
    expect(home).not.toContain("marginTop: -14, marginBottom:");
    const familyMarginBottom = 0; // asserted above: no marginBottom
    expect(familyMarginBottom + HOUSEHOLD_GAP).toBe(HOUSEHOLD_GAP);
  });

  it("the reverse seam cannot occur: peopleRows builds header → families → singles per section", () => {
    const rowsBlock =
      home.match(/const peopleRows = useMemo\(\(\) => relationshipSections\.flatMap\(\(section\) => \[([\s\S]*?)\]\), \[relationshipSections\]\);/)?.[1] ?? "";
    expect(rowsBlock).toContain('kind: "section" as const');
    const familyAt = rowsBlock.indexOf('kind: "family" as const');
    const personAt = rowsBlock.indexOf('kind: "person" as const');
    expect(familyAt).toBeGreaterThan(-1);
    expect(personAt).toBeGreaterThan(familyAt);
  });
});
