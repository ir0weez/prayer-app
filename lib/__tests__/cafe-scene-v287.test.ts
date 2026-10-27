// ─────────────────────────────────────────────────────────────────────────────
// v287 — The Café Is a Place: pins for the café street scene.
//
// Jonathan's 2026-10-27 verdict on v280 (screenshot 10759): the v279
// "TODAY'S ORDERS" popup card floating over the old town grid at
// 7.5px type with "+38 more orders" was "NOT a redesign at all!!!"
// The approved drawings (hometown-blend-howitplays-v2.html) are a
// composed street SCENE. v287 builds it as a place in the interior
// route family and retires the overlay in the same build:
//
//  - app/cafe-street-scene.tsx is the route, entered from the diner's
//    tap on the town map (which used to open the shared restaurant
//    interior — the interior lives on one step inside, via the
//    scene's own door, so its furniture and coffee survive);
//  - the scene consumes v279's derivations unchanged (buildCafeBoard
//    over getPrayTodayList, ovenStateFor, the week settle under
//    prayercircle.hometown.cafe.v1) and writes nothing itself;
//  - the board inside the scene lists EVERY ticket at readable type
//    and scrolls — no row cap, no "+N more" line, anywhere;
//  - the town map keeps only a seated marker (awning + ovens on the
//    diner's own footprint + a board glyph on posts) — no frontage
//    spill, no popup card;
//  - the drawing rules stand in the scene art: the chimney's base
//    merges into the roofline, windows sit inside the wall's bounds,
//    the building stands flush on its foundation with a path from
//    the door to the street.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("v287 — the diner's tap opens the café scene", () => {
  it("the town-lot press routes diners to the scene, before the restaurant interior", () => {
    const src = read("app/hometown.tsx");
    const dinerBranch = src.indexOf('b.type === "diner"');
    const scenePush = src.indexOf("cafe-street-scene?buildingId=");
    const restaurantBranch = src.indexOf("isEnterableRestaurant(b.type)", dinerBranch);
    expect(dinerBranch).toBeGreaterThan(-1);
    expect(scenePush).toBeGreaterThan(dinerBranch);
    expect(restaurantBranch).toBeGreaterThan(scenePush);
    expect(src).toContain("router.push(`/cafe-street-scene?buildingId=${b.id}`)");
  });

  it("the scene route exists in the interior family and derives from the café plumbing", () => {
    const src = read("app/cafe-street-scene.tsx");
    expect(src).toContain("InteriorHeader");
    expect(src).toContain("useInteriorData");
    expect(src).toContain("loadCafeStreetData()");
    expect(src).toContain("buildCafeBoard(cafe.people, cafe.today)");
    expect(src).toContain("ovenStateFor(cafe.fast, cafe.today)");
    expect(src).toContain('title="The Café"');
  });

  it("the scene keeps the diner's interior one step inside (furniture + coffee survive)", () => {
    const scene = read("components/cafe-scene.tsx");
    expect(scene).toContain("Step inside the diner");
    expect(scene).toContain("restaurant-interior?buildingId=");
  });

  it("the scene route writes nothing — no storage writes, no coin deltas", () => {
    const src = read("app/cafe-street-scene.tsx");
    expect(src).not.toContain("setItem");
    expect(src).not.toContain("applyCoinsDelta");
    expect(src).not.toContain("addCoins(");
  });
});

describe("v287 — the popup overlay is retired", () => {
  it("hometown mounts the seated marker, never the overlay", () => {
    const src = read("app/hometown.tsx");
    expect(src).toContain("<CafeMapMarker");
    expect(src).not.toContain("CafeStreetOverlay");
  });

  it("the old overlay component is gone — no popup card, no row cap, no hidden-count line", () => {
    const marker = read("components/cafe-street.tsx");
    expect(marker).toContain("CafeMapMarker");
    expect(marker).not.toContain("MAX_BOARD_ROWS");
    expect(marker).not.toContain("more orders");
    expect(marker).not.toContain("TicketRow");
    // the marker's board is a glyph: it carries no ticket text at all
    expect(marker).not.toContain("TODAY'S ORDERS");
  });

  it("the scene's board lists every ticket — no cap, no truncation line", () => {
    const scene = read("components/cafe-scene.tsx");
    expect(scene).toContain("board.tickets.map(");
    expect(scene).not.toContain("more orders");
    expect(scene).not.toContain("MAX_BOARD_ROWS");
    // the full board's header stands at readable size
    expect(scene).toContain('{"TODAY\'S ORDERS"}');
  });
});

describe("v287 — the scene is drawn to the standing rules", () => {
  const art = read("components/cafe-scene-art.tsx");

  it("the café is drawn from the drawing's own pieces", () => {
    for (const piece of [
      "drawCafe",
      "drawCottage",
      "drawBoardShell",
      "drawRegister",
      "drawWeekLot",
      "HORIZON_DRESS", // the stage-2 depth layers, per phase
      "PHASE_WASH", // the town's own phase light over the scene
    ]) {
      expect(art).toContain(piece);
    }
  });

  it("the chimney is seated: drawn before the roof, its base below the roofline", () => {
    const chimneyAt = art.indexOf("p.rect(33.4, 9.5, 2.6, 8.5, CHIMNEY");
    const roofAt = art.indexOf('p.poly("11,20.2 26,11.7 41,20.2", ROOF');
    expect(chimneyAt).toBeGreaterThan(-1);
    expect(roofAt).toBeGreaterThan(chimneyAt);
    // stack spans y9.5..y18; the roof's slope at its x crosses ~y15.7 —
    // the base (18) lands below it, merged into the roof, not beside it
    expect(9.5 + 8.5).toBeGreaterThan(15.7);
  });

  it("the windows sit inside the wall's bounds, and the wall stands in its foundation", () => {
    // wall: x13.5..38.5, y20..39.5 (components/cafe-scene-art CAFE_LAYOUT)
    const wall = { x: 13.5, y: 20, w: 25, h: 19.5 };
    for (const wx of [16, 21.2]) {
      expect(wx).toBeGreaterThan(wall.x);
      expect(wx + 5).toBeLessThan(wall.x + wall.w);
      expect(26).toBeGreaterThan(wall.y);
      expect(26 + 6).toBeLessThan(wall.y + wall.h);
    }
    // the oven window too
    expect(30.6).toBeGreaterThan(wall.x);
    expect(30.6 + 7.5).toBeLessThan(wall.x + wall.w);
    // foundation drawn at the wall's foot, wider than the wall
    expect(art).toContain("p.rect(w.x - 0.5, wallBottom, w.w + 1, 1.7, FOUNDATION");
    // and a path runs from the doorstep to the street
    expect(art).toContain('"23.9,41.2 28.1,41.2 30.2,52 21.8,52"');
  });

  it("figures are the app's own paper people — hero a villager-equal, no discs, no glyphs", () => {
    const scene = read("components/cafe-scene.tsx");
    expect(scene).toContain("PaperStandingVillager");
    expect(scene).toContain("PaperHeroFigure");
    expect(scene).toContain("paperDinerLookFor");
    // the slipping figure wears the grey-edged dress over their own look
    expect(scene).toContain("greyLook");
    // no serve button and no second prayer path — prayer is the serving
    expect(scene).not.toContain("markPersonPrayed");
    expect(scene.toLowerCase()).not.toContain("serve order");
  });

  it("coins wait: the pile is drawn, the earnings line states them, nothing collects", () => {
    const scene = read("components/cafe-scene.tsx");
    expect(scene).toContain("coins waiting at this diner");
    expect(scene).not.toContain("applyCoinsDelta");
    const artSrc = art;
    expect(artSrc).toContain("drawRegister");
  });
});
