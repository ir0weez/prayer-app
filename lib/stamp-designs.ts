/**
 * Per-person stamp designs (2026-10-21).
 *
 * Both new skins — the commemorative POSTAGE sticker and the struck
 * COIN — carry a real Christian emblem, and the emblem belongs to the
 * PERSON, not to the stamp: the same person always gets the same
 * design, on both skins, on every stamp of theirs. Assignment is a
 * pure hash of the same `personId:personName` string the stamp
 * variation hash uses (components/reached-stamp-row.tsx), mod the
 * design count — deterministic, no storage, no migration.
 */

export type StampDesignId =
  | "sunrise-cross"
  | "ichthys"
  | "dove"
  | "anchor"
  | "lighthouse"
  | "loaves-fishes"
  | "empty-tomb"
  | "mustard-tree";

export const STAMP_DESIGNS: Array<{ id: StampDesignId; name: string }> = [
  { id: "sunrise-cross", name: "Sunrise Cross" },
  { id: "ichthys", name: "Ichthys" },
  { id: "dove", name: "Dove" },
  { id: "anchor", name: "Anchor" },
  { id: "lighthouse", name: "Lighthouse" },
  { id: "loaves-fishes", name: "Loaves & Fishes" },
  { id: "empty-tomb", name: "Empty Tomb" },
  { id: "mustard-tree", name: "Mustard Tree" },
];

/** The stamp hash family: (hash * 31 + code) | 0, absolute value. */
export function hashStampPerson(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return Math.abs(hash);
}

/** The design this person always carries, on postage and coin alike. */
export function getStampDesignId(personId: string, personName: string): StampDesignId {
  const hash = hashStampPerson(`${personId}:${personName}`);
  return STAMP_DESIGNS[hash % STAMP_DESIGNS.length].id;
}

/**
 * The perforated outline of a postage stamp: a rectangle whose four
 * edges are rows of semicircular notches bitten INTO the body (the
 * punched-perforation silhouette of a real mail stamp). Traverses the
 * outline clockwise; each notch is an arc with sweep 1, which dips
 * into the rectangle on every side. Units are the stamp's 124-box.
 */
export function postagePerforationPath(
  x: number,
  y: number,
  w: number,
  h: number,
  notchRadius: number,
  pitch: number,
): string {
  const nx = Math.max(1, Math.round(w / pitch));
  const ny = Math.max(1, Math.round(h / pitch));
  const r = notchRadius;
  let d = `M ${x} ${y}`;
  for (let i = 1; i <= nx; i += 1) {
    const cx = x + (i - 0.5) * pitch;
    d += ` L ${cx - r} ${y} A ${r} ${r} 0 0 1 ${cx + r} ${y}`;
  }
  d += ` L ${x + w} ${y}`;
  for (let i = 1; i <= ny; i += 1) {
    const cy = y + (i - 0.5) * pitch;
    d += ` L ${x + w} ${cy - r} A ${r} ${r} 0 0 1 ${x + w} ${cy + r}`;
  }
  d += ` L ${x + w} ${y + h}`;
  for (let i = nx; i >= 1; i -= 1) {
    const cx = x + (i - 0.5) * pitch;
    d += ` L ${cx + r} ${y + h} A ${r} ${r} 0 0 1 ${cx - r} ${y + h}`;
  }
  d += ` L ${x} ${y + h}`;
  for (let i = ny; i >= 1; i -= 1) {
    const cy = y + (i - 0.5) * pitch;
    d += ` L ${x} ${cy + r} A ${r} ${r} 0 0 1 ${x} ${cy - r}`;
  }
  return `${d} Z`;
}

/** Darken a #RRGGBB hex color by a factor (0 = black, 1 = unchanged). */
export function darkenHex(hex: string, factor: number): string {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  const scale = Math.max(0, Math.min(1, factor));
  const channel = (shift: number) => Math.round(((value >> shift) & 0xff) * scale);
  const toHex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(channel(16))}${toHex(channel(8))}${toHex(channel(0))}`;
}
