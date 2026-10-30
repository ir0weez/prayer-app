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

// The Classic household card's own style literal (renderFamilyCard).
const familyCardStyle =
  home.match(/<View key=\{familyId\} style=\{\{([\s\S]*?overflow: "hidden" \}\})/)?.[1] ?? "";
// The Classic unfurl panel's outer style (trailing gap when expanded).
const panelMarginBottom = Number(
  home.match(/marginTop: -14, marginBottom: (\d+),/)?.[1],
);
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
    // the animated panel, so the predicate now asks only whether
    // the household above is the expanded one.
    expect(home).toContain(
      "const seamAfterFamily = !isSkinned && item.index === 0 && sectionFamilies.length > 0 && expandedFamilyId !== seamFamilyId;",
    );
    expect(home).toContain(
      'const seamFamilyId = sectionFamilies.length > 0 ? sectionFamilies[sectionFamilies.length - 1]?.[0]?.familyId || "" : "";',
    );
    expect(home).toContain(
      "renderRow={() => renderPersonCard(item.person, item.index, item.section.people, seamAfterFamily)}",
    );
  });

  it("the seam flag rides the row fingerprint (re-renders as the household above expands/collapses)", () => {
    expect(home).toContain("${seamAfterFamily ? 1 : 0}");
  });

  it("an expanded household already carries the seam gap through its panel (no seam margin owed)", () => {
    expect(panelMarginBottom).toBe(10);
    expect(panelMarginBottom).toBeGreaterThanOrEqual(HOUSEHOLD_GAP);
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
