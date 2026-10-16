export type MonumentDesign = "cairn" | "pillar" | "altar" | "well" | "tree" | "star";

export const MONUMENT_STORAGE_KEY = "prayercircle.monuments.v1";

export const MONUMENT_DESIGNS: Record<
  MonumentDesign,
  { name: string; icon: string; reference: string }
> = {
  cairn: { name: "Cairn", icon: "🪨", reference: "Jacob & Laban — Mizpah" },
  pillar: { name: "Pillar", icon: "🗿", reference: "Jacob at Bethel" },
  altar: { name: "Altar", icon: "🔥", reference: "Abraham's altars" },
  well: { name: "Well", icon: "💧", reference: "Abraham's wells" },
  tree: { name: "Tamarisk", icon: "🌳", reference: "Abraham at Beersheba" },
  star: { name: "Star", icon: "⭐", reference: "The covenant promise" },
};

const ALL_DESIGNS = Object.keys(MONUMENT_DESIGNS) as MonumentDesign[];

export function pickRandomMonument(exclude?: MonumentDesign | null): MonumentDesign {
  const pool = exclude ? ALL_DESIGNS.filter((d) => d !== exclude) : ALL_DESIGNS;
  const list = pool.length > 0 ? pool : ALL_DESIGNS;
  return list[Math.floor(Math.random() * list.length)];
}

export function parseMonuments(value: unknown): Record<string, MonumentDesign> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, MonumentDesign> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === "string" && (ALL_DESIGNS as string[]).includes(val)) {
      result[key] = val as MonumentDesign;
    }
  }
  return result;
}
