// Paper keyword routing (v174) — the pure half of the schedule's
// theme-adaptive keyword art. Under the Paper skin, the schedule asks
// this module which paper rendition (if any) a card's keyword gets;
// components/paper-keyword-scenes.tsx turns the kind into cut-paper
// artwork. Under Classic this is never consulted and the original
// scenes render byte-for-byte as before.
//
// v174 covers the highest-use illustrations on Jonathan's daily cards:
// meals (burger / lunch / breakfast / dinner), photos, travel, and
// church/ministry. Every other keyword keeps its original artwork
// under Paper too for now — the remainder is the immediate follow-up,
// tracked in the v174 build report.

export type PaperKeywordSceneKind =
  | "burger"
  | "lunch"
  | "breakfast"
  | "dinner"
  | "photo"
  | "travel"
  | "church";

/** Burger-chain locations route to the paper diner scene, mirroring
 *  the original LunchScene's location table. */
const BURGER_CHAIN_LOCATIONS = [
  "mcdonald",
  "in-n-out",
  "in n out",
  "burger king",
  "wendy",
  "five guys",
  "shake shack",
  "carl's jr",
  "carls jr",
  "jack in the box",
  "sonic",
  "habit burger",
];

export function paperKeywordSceneKind(
  label: string,
  title: string,
  location: string,
  notes: string
): PaperKeywordSceneKind | null {
  const t = title.toLowerCase();
  const loc = location.toLowerCase();
  const n = notes.toLowerCase();
  switch (label) {
    case "Meal": {
      if (n.includes("burger") || n.includes("hamburger") || n.includes("cheeseburger")) return "burger";
      if (BURGER_CHAIN_LOCATIONS.some((c) => loc.includes(c))) return "lunch";
      if (t.includes("breakfast") || t.includes("brunch")) return "breakfast";
      if (t.includes("dinner")) return "dinner";
      if (t.includes("lunch")) return "lunch";
      return null;
    }
    case "Photo":
      return "photo";
    case "Travel":
      return "travel";
    case "Church":
      return "church";
    default:
      return null;
  }
}
