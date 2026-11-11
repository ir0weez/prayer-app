/**
 * v494 — the praise boxes, connected (Jonathan, Nov 11): "Let me be
 * honest... These praise boxes suck." Three named faults on the
 * shipped peek carousel: the next card peeking clipped "Post to
 * Journal" mid-word, the card was a big mostly-empty pale slab,
 * and "{N}h left to celebrate" put a countdown on a praise. His
 * shape, in his words: "combine the boxes together, make the
 * second (and third/fourth) praise requests sit underneath in a
 * small rotating box under the first box (which can stay large
 * like it is already)" — praise-concepts-v4, which he hearted.
 *
 * Pins:
 *  (a) ONE connected unit: the first live praise (the standing
 *      people-order derivation) is the Keepsake hero — photo seat
 *      with the star badge, eyebrow, headline, his note as the
 *      detail line, Pray now + Post to Journal at full width on
 *      the card's own handlers. NO countdown text anywhere. The
 *      carousel renders nowhere in the file anymore.
 *  (b) The rotating box: attached underneath inside the same
 *      card, one extra at a time in the same order, advancing
 *      every 4s through the carousel helpers' gate (focused +
 *      motion allowed); dots = one per extra with tap-to-advance,
 *      footer + dots only when there is more than one extra;
 *      exactly one extra → box with neither; zero → no band.
 *  (c) The dress is the praise gold family from pmf — goldTint
 *      surface, band mixed deeper from it, goldDeep inks, the
 *      deep-gold Pray now fill derived (goldDeep toward the ink)
 *      so pale text keeps its contrast in BOTH appearances; the
 *      mockup's pinned light hexes survive nowhere in the card.
 * Change 2 of this build (the grouped renew boxes) is pinned in
 * people-v284.test.ts, section (f).
 *
 * v496 amendment (his Nov 11 correction, from his own phone):
 * the hero note moved seats — out of its full-width line under
 * the photo row, into the header column directly under the
 * headline, aligned with the eyebrow. Section (d) pins the
 * new seat; every other pin in this file stands as written.
 *
 * v498 amendment (his Nov 11 pick — praise-birthday-concepts-v7 —
 * plus "The birthday should count as a Praise"): the unit's
 * composition moved into the pure model in lib/praise-unit.ts
 * (on a birthday a VIRTUAL birthday praise is the hero; ordinary
 * days the model returns exactly this standing order), and the
 * paints became family variables — gold from pmf ordinarily, the
 * birthday person's own accent family on their birthday. The
 * pins below that named the moved strings are RE-BASED to the
 * model's seats and the family variables; the behavior they
 * protected (one connected unit, hero + rotating box, no
 * countdown, derived dress, the card's own handlers) is unchanged
 * and still pinned here and in praise-birthday-v498.test.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { derivePeopleFrontDoor } from "../people-material";
import { mix } from "../color-themes";
import { hexContrast } from "../skin-themes";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const praiseUnit = read("lib/praise-unit.ts");
const praise = index.slice(index.indexOf("const renderPraiseCard"), index.indexOf("const renderSlipCard"));

// ─── (a) One connected unit ───────────────────────────────────────

describe("v494 praise unit — one connected Keepsake", () => {
  it("a single card at radius 28, clipped as one surface (gold ordinarily; the birthday family on a birthday)", () => {
    expect(praise).toContain('testID="praise-unit"');
    // RE-BASED (v498): the surface is the heroSurface variable —
    // pmf.goldTint ordinarily, the birthday person's accent
    // surface on their birthday (praise-birthday-v498 pins both).
    expect(praise).toContain("backgroundColor: heroSurface");
    expect(praise).toContain("const heroSurface = birthdayFamily ? birthdayFamily.surface : pmf.goldTint;");
    expect(praise).toContain("borderRadius: 28");
    expect(praise).toContain('overflow: "hidden"');
  });

  it("the carousel is gone from the whole file — no peek, no pages, no carousel dots", () => {
    expect(index).not.toContain("FrontDoorCarousel");
    expect(index).not.toContain("CarouselDots");
    expect(index).not.toContain("components/front-door-carousel");
  });

  it("the hero is the first praise in the standing order; the rest are the extras", () => {
    // RE-BASED (v498): the standing order is computed by the pure
    // model now — the filter lives in lib/praise-unit.ts, and the
    // card consumes the model's hero + box.
    expect(praiseUnit).toContain("people.filter((person) => hasActivePraise(person))");
    expect(praise).toContain("const unit = praiseUnitModel;");
    expect(praise).toContain("const praisedPerson = unit.hero.person;");
    expect(praise).toContain("const extras = unit.box.map((entry) => entry.person);");
  });

  it("hero furniture: 58px photo seat with the gold ring and the star badge pinned to its corner", () => {
    expect(praise).toContain("size={58}");
    // RE-BASED (v498): the ring is the heroRing variable — pmf.gold
    // ordinarily, the person's accent on their birthday. The badge
    // itself stays gold in both states.
    expect(praise).toContain("borderWidth: 2.5, borderColor: heroRing, borderRadius: 29");
    expect(praise).toContain("const heroRing = birthdayFamily ? birthdayFamily.accent : pmf.gold;");
    expect(praise).toContain("width: 21, height: 21, borderRadius: 11, backgroundColor: pmf.gold");
    expect(praise).toContain('name="star" size={11}');
  });

  it("eyebrow, headline and his note as the detail line — the Keepsake's words", () => {
    // RE-BASED (v498): the eyebrow/star/detail wear heroAccentInk —
    // pmf.goldDeep ordinarily, the person's accent on their birthday.
    expect(praise).toContain('name="star" size={14} color={heroAccentInk}');
    expect(praise).toContain("const heroAccentInk = birthdayFamily ? birthdayFamily.accent : pmf.goldDeep;");
    expect(praise).toContain("PRAISE · {praisedPerson.name.toUpperCase()}");
    expect(praise).toContain("{praiseDisplay.headline}");
    expect(praise).toContain("{praiseDisplay.note}");
    expect(praise).toContain("fontSize: 23");
  });

  it("both hero buttons stand at full width on the card's own handlers", () => {
    expect(praise).toContain('openFocusedPrayerSession(praisedPerson.id, "praise")');
    expect(praise).toContain(">Pray now</Text>");
    expect(praise).toContain("Post to Journal");
    expect(praise).toContain('createPrayerJournalEntry(previous, { body: text, taggedPeople: [praisedPerson], kind: "praise" }');
  });

  it("NO countdown anywhere — the 'left to celebrate' line is removed from the file", () => {
    expect(praise).not.toContain("left to celebrate");
    expect(praise).not.toContain("Celebrating today");
    expect(praise).not.toContain("praiseExpiresAt");
    expect(index).not.toContain("left to celebrate");
    expect(index).not.toContain("Celebrating today");
  });
});

// ─── (b) The rotating box ─────────────────────────────────────────

describe("v494 rotating box — the extras, one at a time", () => {
  it("the band renders only when an extra exists, seated by the clamped rotating index", () => {
    // RE-BASED (v498): the shown entry comes from the model's box
    // (same clamp); its person is the shown extra.
    expect(praise).toContain("const shownExtraEntry = extras.length > 0 ? unit.box[Math.min(praiseRotateIndex, extras.length - 1)] : null;");
    expect(praise).toContain("const shownExtra = shownExtraEntry ? shownExtraEntry.person : null;");
    expect(praise).toContain("{shownExtra ? (");
    expect(praise).toContain('testID="praise-rotating-box"');
  });

  it("the band is attached inside the same card: deeper gold, hairline top border", () => {
    expect(praise).toContain("backgroundColor: bandGold, borderTopWidth: 1, borderTopColor: bandLine");
    // RE-BASED (v498): the gold mixes are the fallback — when the
    // shown entry wears a birthday dress the band takes that
    // person's family surface/tonal instead.
    expect(praise).toContain("const goldBand = mix(pmf.goldTint, pmf.gold, 0.22);");
    expect(praise).toContain("const bandGold = shownExtraFamily ? shownExtraFamily.surface : goldBand;");
    expect(praise).toContain("const bandLine = shownExtraFamily ? shownExtraFamily.tonal : mix(pmf.goldTint, pmf.gold, 0.45);");
  });

  it("the shown extra carries its photo, its name line, its praise text and its own Pray now", () => {
    expect(praise).toContain("size={38}");
    // RE-BASED (v498): the eyebrow ink is boxEyebrow (goldDeep
    // ordinarily, the shown person's deep stop when dressed), and
    // the text comes through shownExtraText — the model's journal
    // text for a virtual birthday entry, the standing
    // getPraiseJournalText for a manual one.
    expect(praise).toContain("<Text style={{ color: boxEyebrow }}>PRAISE · </Text>");
    expect(praise).toContain('shownExtraEntry.kind === "birthday" ? shownExtraEntry.journalText : getPraiseJournalText(shownExtra)');
    expect(praise).toContain('openFocusedPrayerSession(shownExtra.id, "praise")');
    // hero Pray now + rotating Pray now — exactly two in the card.
    expect(praise.split(">Pray now</Text>").length - 1).toBe(2);
  });

  it("footer and dots appear only when there is more than one extra to rotate through", () => {
    expect(praise).toContain("{extras.length} MORE TO CELEBRATE");
    expect(praise).toContain("{extras.length > 1 ? (");
  });

  it("dots: one per extra, the shown one elongated, tap seats that extra", () => {
    expect(praise).toContain("extras.map((extra, extraIndex)");
    expect(praise).toContain("setPraiseRotateIndex(extraIndex)");
    expect(praise).toContain("width: isShown ? 16 : 6");
    // RE-BASED (v498): the dots follow boxEyebrow — goldDeep
    // ordinarily, the shown person's deep stop when dressed.
    expect(praise).toContain("backgroundColor: isShown ? boxEyebrow : hexToRgba(boxEyebrow, 0.3)");
  });

  it("rotation: a 4s interval behind the shared gate (N>1, focused, motion allowed)", () => {
    expect(index).toContain("const PRAISE_ROTATE_MS = 4000;");
    expect(index).toContain("shouldAutoAdvance({ count: praiseExtraCount, focused: peopleDoorFocused, reducedMotion: praiseRotateReducedMotion })");
    expect(index).toContain("setPraiseRotateIndex((current) => nextPageIndex(current, praiseExtraCount));");
    expect(index).toContain("setInterval");
  });

  it("reduced motion parks the rotation — the AccessibilityInfo seat mirrors the page's own pattern", () => {
    expect(index).toContain("const [praiseRotateReducedMotion, setPraiseRotateReducedMotion] = useState(false);");
    expect(index).toContain('AccessibilityInfo.addEventListener("reduceMotionChanged", setPraiseRotateReducedMotion)');
  });
});

// ─── (c) The gold dress derives ───────────────────────────────────

describe("v494 derivation — the Keepsake gold from the family, both appearances", () => {
  it("the Pray now fill is derived, and pale text keeps ≥4.5:1 on it in light and dark", () => {
    expect(praise).toContain("const deepGoldFill = mix(pmf.goldDeep, pmf.ink, 0.3);");
    // RE-BASED (v498): the hero's fill is heroFill — deepGoldFill
    // ordinarily, the birthday family's fill on a birthday.
    expect(praise).toContain("const heroFill = birthdayFamily ? birthdayFamily.fill : deepGoldFill;");
    expect(praise).toContain("backgroundColor: heroFill");
    for (const scheme of ["light", "dark"] as const) {
      const fd = derivePeopleFrontDoor("#2563EB", scheme);
      const fill = mix(fd.goldDeep, fd.ink, 0.3);
      expect(hexContrast(fd.goldTint, fill)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("gold is a meaning family: the light tint is the same at any seed, the dark tint is its own night mix", () => {
    const blueLight = derivePeopleFrontDoor("#2563EB", "light");
    const redLight = derivePeopleFrontDoor("#EF4444", "light");
    expect(blueLight.goldTint).toBe("#FFF3D6");
    expect(redLight.goldTint).toBe("#FFF3D6");
    const blueDark = derivePeopleFrontDoor("#2563EB", "dark");
    expect(blueDark.goldTint).not.toBe("#FFF3D6");
    // The walked pair the lapsed cards already ship: goldDeep
    // reads on goldTint at the floor in the derived dark family.
    expect(hexContrast(blueDark.goldDeep, blueDark.goldTint)).toBeGreaterThanOrEqual(4.5);
    // The headline ink reads on the hero surface in both schemes.
    expect(hexContrast(blueLight.ink, blueLight.goldTint)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(blueDark.ink, blueDark.goldTint)).toBeGreaterThanOrEqual(4.5);
  });

  it("no mockup hex is pinned in the card (the v4 concept's light literals)", () => {
    for (const pinned of ["#FDF2CE", "#FBEFC0", "#EFDB9C", "#8A5E04", "#FFF7DE", "#FBE8B4", "#9A6E07", "#4A3806", "#7A5E10", "#F5A623"]) {
      expect(praise).not.toContain(pinned);
    }
  });
});

// ─── (d) v496 — the hero note seats in the header column ─────────

describe("v496 hero note — in the header column, under the headline", () => {
  it("the note renders inside the header column (at the eyebrow/headline indent), not at the hero's full-width level", () => {
    expect(praise).toContain("                {!!praiseDisplay.note && (");
    expect(praise).not.toContain("\n            {!!praiseDisplay.note && (");
  });

  it("source order down the column: eyebrow, headline, then the note — all before the buttons row", () => {
    const eyebrow = praise.indexOf("PRAISE · {praisedPerson.name.toUpperCase()}");
    const headline = praise.indexOf("{praiseDisplay.headline}");
    const note = praise.indexOf("{praiseDisplay.note}");
    const buttons = praise.indexOf("gap: 10, marginTop: 13");
    expect(eyebrow).toBeGreaterThanOrEqual(0);
    expect(headline).toBeGreaterThan(eyebrow);
    expect(note).toBeGreaterThan(headline);
    expect(buttons).toBeGreaterThan(note);
  });

  it("the note's dress is unchanged — the same gold detail line, only seated higher, and it renders exactly once", () => {
    // RE-BASED (v498): the detail line's colour is heroAccentInk —
    // pmf.goldDeep ordinarily (this pin's dress), the person's
    // accent on their birthday. Size, weight and seat unchanged.
    expect(praise).toContain('<Text numberOfLines={2} style={{ fontSize: 13.5, fontWeight: "600", color: heroAccentInk, marginTop: 10 }}>{praiseDisplay.note}</Text>');
    expect(praise.split("{praiseDisplay.note}").length - 1).toBe(1);
  });
});
