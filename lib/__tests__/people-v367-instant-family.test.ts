// ─── v367 — household groups open and close instantly ────────────────────
// Jonathan's Oct 30 device verdict on the v362 UnfurlPanel was
// "slow and laggy." The 300ms JS height window, its closing
// state, completion callback, and 400ms fallback are all retired.
// FamilyPanel is plain layout: the members mount at natural
// height in one frame, fully opaque, with no panel animation.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const index = readFileSync(join(process.cwd(), "app", "(tabs)", "index.tsx"), "utf8");
const panel = index.slice(index.indexOf("function FamilyPanel"), index.indexOf("type AppSettings = {"));
const toggle = index.slice(index.indexOf("const toggleFamilyExpanded"), index.indexOf("const [familyActionMembers"));
const expandedFamily = index.slice(index.indexOf("const renderExpandedFamily"), index.indexOf("const renderPeopleSectionRow"));
const familyRow = index.slice(index.indexOf("const renderPeopleFamilyRow"), index.indexOf("// v267: FlatList's renderItem"));

describe("v367 — FamilyPanel is plain layout, not an animated window", () => {
  it("both household dresses render through the plain panel", () => {
    expect(index.match(/<FamilyPanel outerStyle=/g)).toHaveLength(2);
    expect(index).not.toContain("UnfurlPanel");
    expect(panel).toContain('<View style={[frameStyle, { overflow: "hidden" }]}>');
  });

  it("the panel carries no animated height, measurement, or entrance machinery", () => {
    expect(panel).not.toContain("Animated");
    expect(panel).not.toContain("windowHeight");
    expect(panel).not.toContain("onLayout");
    expect(panel).not.toContain("heightLocked");
    expect(panel).not.toContain("entering=");
    expect(panel).not.toContain("FadeInUp");
  });

  it("the expanded members carry no entering animation of their own", () => {
    expect(expandedFamily).not.toContain("entering=");
    expect(expandedFamily).not.toContain("memberIdx * 65");
    expect(expandedFamily).toContain("familyMembers.map((member, memberIdx)");
    expect(expandedFamily).toContain("Mark as Complete");
  });
});

describe("v367 — expansion state flips in the same render", () => {
  it("the toggle directly sets or clears the one expanded family", () => {
    expect(toggle).toContain("setExpandedFamilyId(null);");
    expect(toggle).toContain("setExpandedFamilyId(familyId);");
    expect(toggle).not.toContain("setTimeout");
    expect(toggle).not.toContain("closing");
  });

  it("there is no closing phase left anywhere in the roster wiring", () => {
    expect(index).not.toContain("closingFamilyId");
    expect(index).not.toContain("handleFamilyPanelClosed");
    expect(index).not.toContain("familyCloseTimeout");
    expect(familyRow).toContain("isExpanded && renderExpandedFamily(item.familyMembers, item.section)");
  });

  it("the memo fingerprint tracks only the expanded identity for a family", () => {
    expect(index).toContain("${expandedFamilyId === familyId ? 1 : 0}|${memberCountdowns}");
    expect(index).not.toContain("${closingFamilyId === familyId ? 1 : 0}");
  });
});
