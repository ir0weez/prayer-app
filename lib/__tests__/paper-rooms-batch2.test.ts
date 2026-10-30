/**
 * Paper rollout BATCH 2 guard pins (2026-10-21): every remaining
 * interior routes to a paper scene, the per-level dressing ladder
 * climbs for every room config, and no screen still routes a drawn
 * activity figure. Source-based, like the earlier batch pins.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { PAPER_ROOMS, paperRoomDressingFor, paperRoomPieceScore } from "../paper-rooms";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** Every interior screen in batch-2 scope -> the paper scene it routes. */
const SCREEN_SCENES: Record<string, string> = {
  "app/church-interior.tsx": "PaperChurchScene",
  "app/theater-interior.tsx": "PaperTheaterScene",
  "app/hospital-interior.tsx": "PaperHospitalScene",
  "app/bible-study-hall-interior.tsx": "PaperRoomScene",
  "app/fasting-house-interior.tsx": "PaperRoomScene",
  "app/gym-interior.tsx": "PaperRoomScene",
  "app/outreach-center-interior.tsx": "PaperRoomScene",
  "app/bank-interior.tsx": "PaperRoomScene",
  "app/market-interior.tsx": "PaperRoomScene",
  "app/farm-interior.tsx": "PaperRoomScene",
  "app/bookstore-interior.tsx": "PaperRoomScene",
  "app/carpenter-interior.tsx": "PaperRoomScene",
  "app/pottery-interior.tsx": "PaperRoomScene",
  "app/tailor-interior.tsx": "PaperRoomScene",
  "app/apothecary-interior.tsx": "PaperRoomScene",
  "app/music-hall-interior.tsx": "PaperRoomScene",
  "app/observatory-interior.tsx": "PaperRoomScene",
  "app/shop-interior.tsx": "PaperRoomScene",
  "app/bakery-interior.tsx": "PaperRoomScene",
  "app/food-court-interior.tsx": "PaperRoomScene",
  "app/classroom-interior.tsx": "PaperRoomScene",
  "app/library-interior.tsx": "PaperRoomScene",
  "app/grand-library-interior.tsx": "PaperRoomScene",
  "app/music-room-interior.tsx": "PaperRoomScene",
  "app/science-lab-interior.tsx": "PaperRoomScene",
  "app/art-studio-interior.tsx": "PaperRoomScene",
  "app/gymnasium-interior.tsx": "PaperRoomScene",
  "app/chapel-interior.tsx": "PaperRoomScene",
  "app/workshop-interior.tsx": "PaperRoomScene",
  // RE-BASED (v343): renamed with its route — app/school-cafeteria-interior.tsx.
  "app/school-cafeteria-interior.tsx": "PaperRoomScene",
  "app/main-office-interior.tsx": "PaperRoomScene",
  "app/inn-interior.tsx": "PaperRoomScene",
  "app/bathhouse-interior.tsx": "PaperRoomScene",
  "app/town-hall-interior.tsx": "PaperRoomScene",
  "app/post-office-interior.tsx": "PaperRoomScene",
  "app/hotel-interior.tsx": "PaperRoomScene",
  "app/apartments-interior.tsx": "PaperRoomScene",
  "app/art-gallery-interior.tsx": "PaperRoomScene",
  "app/clock-tower-interior.tsx": "PaperRoomScene",
  "app/coffee-roastery-interior.tsx": "PaperRoomScene",
  "app/department-store-interior.tsx": "PaperRoomScene",
  "app/embassy-interior.tsx": "PaperRoomScene",
  "app/flower-market-interior.tsx": "PaperRoomScene",
  "app/museum-interior.tsx": "PaperRoomScene",
  "app/music-studio-interior.tsx": "PaperRoomScene",
  "app/office-interior.tsx": "PaperRoomScene",
  "app/arcade-interior.tsx": "PaperRoomScene",
};

const DRAWN_FIGURES =
  /\b(StandingFigure|SeatedFigure|KneelingFigure|SingingFigure|WorkingFigure|WatchingFigure|SwimmingFigure|DoctorFigure|NurseFigure)\b/;

describe("batch 2: every interior routes to a paper scene", () => {
  for (const [file, scene] of Object.entries(SCREEN_SCENES)) {
    it(`${file} renders ${scene} and no drawn figures`, () => {
      const src = read(file);
      expect(src).toContain(scene);
      expect(src).toContain("components/paper-room");
      expect(DRAWN_FIGURES.test(src)).toBe(false);
    });
  }

  it("pawn-house figures are paper (hero + backyard villagers)", () => {
    const src = read("app/pawn-house.tsx");
    expect(src).toContain("PaperHeroFigure");
    expect(src).toContain("PaperSwimFigure");
    expect(src).toContain("PaperStandingVillager");
    expect(src).not.toContain("PawnPreview");
    expect(DRAWN_FIGURES.test(src)).toBe(false);
    // The interactive prayer candle wall keeps its tappable candles.
    expect(src).toContain("<Candle");
    expect(src).toContain("getPrayerCandles");
  });
});

describe("batch 2: room configs + upgrade ladders", () => {
  it("every routed room id has a paper config", () => {
    const ids = [
      "bible-study-hall", "fasting-house", "gym", "outreach-center",
      "bank", "market", "farm", "bookstore", "carpenter", "pottery",
      "tailor", "apothecary", "music-hall", "observatory", "shop",
      "bakery", "food-court", "classroom", "library", "grand-library",
      "music-room", "science-lab", "art-studio", "gymnasium", "chapel",
      "workshop", "cafeteria", "main-office", "inn", "bathhouse",
      "town-hall", "post-office", "hotel", "apartments", "art-gallery",
      "clock-tower", "coffee-roastery", "department-store", "embassy",
      "flower-market", "museum", "music-studio", "office", "arcade",
      "pawn-house",
    ];
    for (const id of ids) expect(PAPER_ROOMS[id], id).toBeDefined();
  });

  it("piece score strictly climbs L1 < L2 < L3", () => {
    const s1 = paperRoomPieceScore(paperRoomDressingFor(1));
    const s2 = paperRoomPieceScore(paperRoomDressingFor(2));
    const s3 = paperRoomPieceScore(paperRoomDressingFor(3));
    expect(s1).toBeLessThan(s2);
    expect(s2).toBeLessThan(s3);
  });

  it("dressing gains pieces at every level (signature, windows, overhead)", () => {
    const d1 = paperRoomDressingFor(1);
    const d2 = paperRoomDressingFor(2);
    const d3 = paperRoomDressingFor(3);
    expect(d2.signatureCount).toBeGreaterThan(d1.signatureCount);
    expect(d3.signatureCount).toBeGreaterThan(d2.signatureCount);
    expect(d2.windows).toBeGreaterThan(d1.windows);
    expect(d3.windows).toBeGreaterThan(d2.windows);
    expect(d1.rug).toBe(false);
    expect(d2.rug).toBe(true);
    expect(d3.richSignature).toBe(true);
  });
});

describe("batch 2: theater genre art + church modes stay keyed", () => {
  it("theater screen keys its paper screen art from the movie theme", () => {
    const src = read("app/theater-interior.tsx");
    expect(src).toContain("PaperTheaterScene");
    expect(src).toContain("movieThemeForTitle");
  });

  it("paper theater draws a distinct scene per genre", () => {
    const src = read("components/paper-room.tsx");
    for (const genre of ["horror", "comedy", "action", "romance", "christmas", "western", "scifi", "musical", "kids", "drama"]) {
      expect(src).toContain(genre);
    }
  });

  it("church scene keeps its ministry modes", () => {
    const src = read("app/church-interior.tsx");
    expect(src).toContain("PaperChurchScene");
    for (const mode of ["study", "prayer", "worship", "serve"]) {
      expect(src).toContain(`"${mode}"`);
    }
  });
});
