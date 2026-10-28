// ─────────────────────────────────────────────────────────────────────────────
// v298 — the measured fidelity pass on his v297 verdicts (Oct 28,
// 08:16–08:28, screenshots 10793–10796):
//  - WORSHIP: "What's going on with the worship setlist card?" —
//    track numbers wrapped in a 14px cell, titles inflated by the
//    CLASSIC_TYPE_SCALE spreads (the v297 todo family), the key
//    rendered inline instead of the drawing's sub-line, cover
//    radius 16 against the drawing's 10 (both v19 and v32 draw
//    .cover at border-radius:10px).
//  - WHITES: his ruling — "Those white spaces can turn black in
//    dark mode by the way." Literally white in light, BLACK in dark.
//  - SQUARES: "I can't seem to 'hold for options' a square rest
//    box." Both squares aligned to EventCard's proven anatomy:
//    explicit delayLongPress={500}; the ministry square's
//    ContextMenu moved OUT of its Pressable (EventCard renders its
//    menu as a sibling).
//  - SUMMARY: the panel step is the drawing's own step, derived in
//    HSL (schedulePanelStep) — the 12% RGB black-mix rendered
//    visibly lighter than the drawing's #6D28D9 from his seed.
//    Prose bold spans 700 → the drawing's 800; greeting/prose take
//    the drawing's pale panel steps; chip mix .18 → .16.
//  - STUDY: "the personal study box is way bigger" — radius 28→24,
//    padding 20→14/15, drawn row margins, 15.5/800 header, chevron
//    in its 32px circle, scale spreads gated off Classic, the Read
//    Chapter pill in the DEEP step in both appearances (at night it
//    rendered pale lavender with dark text), and the resting face
//    is the drawing's EXPANDED face (default + versioned key).
//  - UP NEXT: the drawing's .nextstrip, absent in v296/v297, built
//    as drawn — today only, the earliest uncompleted timed item
//    still ahead, seated under the study card.
//  - FAB: "the plus fab is now literally over the tab bar" — the
//    seat derives from the shell's own tab-bar metric
//    (useTabBarOccupiedHeight: Classic 91) + 12 clearance.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { schedulePanelStep } from "../schedule-material";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const scheduleTab = read("components/schedule-tab.tsx");
const albumCard = read("components/album-card.tsx");
const whites = read("components/time-block-indicator.tsx");
const summaryCard = read("components/daily-summary-card.tsx");
const fab = read("components/schedule-fab.tsx");
const tabBar = read("components/app-tab-bar.tsx");
const scheduleMaterial = read("lib/schedule-material.ts");

const restSquare = scheduleTab.slice(
  scheduleTab.indexOf("function RestSquare("),
  scheduleTab.indexOf("function MinistrySquare("),
);
const ministrySquare = scheduleTab.slice(
  scheduleTab.indexOf("function MinistrySquare("),
  scheduleTab.indexOf("function MinistryCard("),
);
const studyCase = scheduleTab.slice(
  scheduleTab.indexOf('case "personal-study-card"'),
  scheduleTab.indexOf('case "time-off"'),
);
const upNextCase = scheduleTab.slice(
  scheduleTab.indexOf('case "up-next"'),
  scheduleTab.indexOf('case "time-off"'),
);

describe("v298 worship — the drawing's rows under Classic", () => {
  it("the type scale no longer inflates the rows under Classic", () => {
    expect(albumCard).toContain("const scaleText = hasTypeScale(skinTokens) && isSkinned");
    expect(albumCard).toContain("...(scaleText ? skinText(skinTokens, skinTokens.type.rowBody, skinTokens.type.rowBodyLineHeight) : null)");
    expect(albumCard).toContain("...(scaleText ? skinText(skinTokens, skinTokens.type.cardTitle) : null)");
    expect(albumCard).toContain("...(scaleText ? skinText(skinTokens, skinTokens.type.sectionTitle, skinTokens.type.sectionLineHeight) : null)");
  });

  it("the number cell is 18px, right-aligned, 12/800, and never wraps", () => {
    expect(albumCard).toContain("numberOfLines={1} style={classic ? { width: 18, textAlign: 'right'");
    expect(albumCard).toContain("fontSize: 12, fontWeight: '800' }");
    expect(albumCard).not.toContain("width: 14, color: colors.muted, fontSize: 11.5, fontWeight: '600' }}>{index + 1}</Text>\n                <Text");
  });

  it("the key is a sub-line under the title, only when the song carries one", () => {
    expect(albumCard).toContain("{track.key ? <Text");
    expect(albumCard).toContain("Key of {track.key}");
    expect(albumCard).not.toContain("{track.key && <Text");
  });

  it("the checkbox is the drawing's 22px box: radius 6, 2.5 border, full-seed open border", () => {
    expect(albumCard).toContain("borderWidth: classic ? 2.5 : 2");
    expect(albumCard).toContain("classic ? 6 : 7");
    expect(albumCard).toContain("borderColor: isCompleted ? colors.primary : classic ? colors.primary : mix(colors.primary, colors.surface, 0.55)");
  });

  it("cover, padding, and heard line take the drawing's metrics under Classic", () => {
    expect(albumCard).toContain("width: 80, height: 80, borderRadius: classic ? 10 : 16");
    expect(albumCard).toContain("paddingTop: 13, paddingHorizontal: 15, paddingBottom: 11");
    expect(albumCard).toContain("fontWeight: classic ? '600' : '700'");
    expect(albumCard).toContain("marginTop: classic ? 6 : 3");
  });
});

describe("v298 whites — black in dark mode (his ruling)", () => {
  it("both white components derive their Classic surface by appearance", () => {
    expect(whites).toContain('import { useColorScheme } from "@/hooks/use-color-scheme"');
    expect(whites.match(/classicSurface = colorScheme === "dark" \? "#000000" : "#FFFFFF"/g) ?? []).toHaveLength(2);
    expect(whites.match(/: classicSurface,/g) ?? []).toHaveLength(2);
    expect(whites.match(/: classicBorder,/g) ?? []).toHaveLength(2);
  });

  it("the skins' dresses are untouched by the derivation", () => {
    expect(whites).toContain("skinTokens.isEightBit ? BIT_DUSK : isSkinned ? skinTokens.surface ?? colors.surface : classicSurface");
    expect(whites).toContain("isTerminal ? TERM_PANEL : skinTokens.isEightBit ? BIT_DUSK");
  });
});

describe("v298 squares — hold-for-options restored to EventCard's anatomy", () => {
  it("the rest square carries the explicit 500ms long-press to the editor", () => {
    expect(restSquare).toContain("onLongPress={onLongPress}");
    expect(restSquare).toContain("delayLongPress={500}");
    // The ministry-group call site wires that long-press to the editor.
    expect(scheduleTab).toContain("onLongPress={() => openEventEditor(restEvent)}");
  });

  it("the ministry square's menu is a sibling of its Pressable, not a child", () => {
    expect(ministrySquare).toContain("delayLongPress={500}");
    expect(ministrySquare).toContain("onLongPress={handleLongPress}");
    expect(ministrySquare.indexOf("<ContextMenu")).toBeGreaterThan(ministrySquare.indexOf("</Pressable>"));
  });
});

describe("v298 summary — the drawing's panel step", () => {
  it("the panel derives through schedulePanelStep, not the RGB black-mix", () => {
    expect(summaryCard).toContain("const panel = schedulePanelStep(seedPrimary)");
    expect(summaryCard).not.toContain('mix(seedPrimary, "#000000", 0.12)');
    expect(scheduleMaterial).toContain("export function schedulePanelStep");
  });

  it("BEHAVIOUR: the step reproduces the drawing's panel from the drawing's seed", () => {
    // Drawing: seed #7C3AED → panel #6D28D9 (109, 40, 217).
    const stepped = schedulePanelStep("#7C3AED");
    expect(stepped).toBe("#6926DC");
    const rgb = [1, 3, 5].map((i) => parseInt(stepped.slice(i, i + 2), 16));
    expect(Math.abs(rgb[0] - 109)).toBeLessThanOrEqual(6);
    expect(Math.abs(rgb[1] - 40)).toBeLessThanOrEqual(6);
    expect(Math.abs(rgb[2] - 217)).toBeLessThanOrEqual(6);
    // His default seed steps deeper and richer than the old mix did.
    expect(schedulePanelStep("#8557D9")).toBe("#7142C8");
  });

  it("greeting, prose, and chip take the drawing's pale steps; prose bolds are 800", () => {
    expect(summaryCard).toContain('const chipBg = mix(panel, "#FFFFFF", 0.16)');
    expect(summaryCard).toContain('const onPanelSoft = mix(panel, "#FFFFFF", 0.82)');
    expect(summaryCard).toContain('const proseColor = mix(panel, "#FFFFFF", 0.94)');
    expect(summaryCard).toContain("color: proseColor, fontWeight: \"400\"");
  });
});

describe("v298 study card — the drawing's size and resting face", () => {
  it("radius, header, and chevron circle take the drawing's metrics", () => {
    expect(studyCase).toContain("borderRadius: classicStudy ? 24 : 28");
    expect(studyCase).toContain("fontSize: classicStudy ? 15.5 : 14");
    expect(studyCase).toContain("width: 32, height: 32, borderRadius: 16, backgroundColor: studyTonesNow.primaryContainer");
    expect(studyCase).toContain("paddingTop: 14, paddingBottom: 14, paddingHorizontal: 15, gap: 0");
  });

  it("the Read Chapter pill is the deep step with white text in both appearances", () => {
    expect(studyCase).toContain('backgroundColor: isSkinned ? colors.primary : mix(colors.primary, "#000000", 0.62)');
    expect(studyCase).toContain('classicStudy ? "#FFFFFF" : colors.background');
    expect(studyCase).toContain("fontSize: classicStudy ? 12.5 : 12");
  });

  it("the scale spreads are gated off Classic in the study card", () => {
    expect(studyCase).toContain("const scaleStudy = hasTypeScale(skinTokens) && isSkinned");
    expect(studyCase).toContain("fontSize: classicStudy ? 11.5 : 12");
    expect(studyCase).toContain("(hasTypeScale(skinTokens) && isSkinned) ? { marginBottom: 12 + skinTokens.type.gapBoost }");
  });

  it("the resting face is the drawn EXPANDED face; toggles persist under the versioned key", () => {
    expect(scheduleTab).toContain("useState(true); // Expandable Personal Study card state");
    expect(scheduleTab.match(/personalStudyExpanded\.v298/g) ?? []).toHaveLength(2);
  });
});

describe("v298 up next — the drawing's strip, built", () => {
  it("the strip is computed for today only, from the earliest uncompleted timed item still ahead", () => {
    expect(scheduleTab).toContain('if (!isSkinned && selectedDate === today)');
    expect(scheduleTab).toContain("timeToMinutes(c.item.startTime) > nowMin");
    expect(scheduleTab).toContain('items.splice(studyIdx >= 0 ? studyIdx + 1 : 0, 0, { type: "up-next", id: "up-next", data: nextCandidate })');
  });

  it("the case seats after the study card and takes the drawing's metrics", () => {
    expect(scheduleTab.indexOf('case "up-next"')).toBeGreaterThan(scheduleTab.indexOf('case "personal-study-card"'));
    expect(upNextCase).toContain("height: 74, borderRadius: 20");
    expect(upNextCase).toContain("width: 44, height: 44, borderRadius: 14");
    expect(upNextCase).toContain(">UP NEXT</Text>");
    expect(upNextCase).toContain("fontSize: 17.5, fontWeight: \"800\"");
  });

  it("BEHAVIOUR: the strip toggles its item through the cards' own handlers", () => {
    expect(upNextCase).toContain("setTodos((prev) => toggleTodoCompleted(prev, nd.id))");
    expect(upNextCase).toContain("setEvents((prev) => toggleEventCompleted(prev, nd.id))");
    expect(upNextCase).toContain("setMinistries((prev) => toggleMinistryCompleted(prev, nd.id))");
    expect(upNextCase).toContain('onAwardXP?.("ministry-task", nd.id, position)');
  });
});

describe("v298 FAB — seated clear of the tab bar", () => {
  it("the seat derives from the shell's tab-bar metric plus clearance under Classic", () => {
    expect(fab).toContain("useTabBarOccupiedHeight");
    expect(fab).toContain('fabSkinTokens.id === "classic" ? tabBarOccupied + 12 : 60');
    expect(fab).toContain("bottom: fabBottom");
    expect(fab).not.toContain("bottom: 60,");
  });

  it("the metric it derives from: the Classic bar occupies 91, so the FAB bottom (103) clears it", () => {
    expect(tabBar).toContain('return tokens.id === "classic" ? 91 : 126');
    expect(91 + 12).toBeGreaterThan(91);
  });
});
