/**
 * v308 — renders a sub-line's segments with the show's name in its
 * title font (lib/show-fonts.ts). Used inside an existing <Text>:
 * the marked segment is a nested <Text> carrying ONLY the fontFamily,
 * so it inherits the sub-line's size, weight and colour — the name
 * changes lettering, nothing else (his ruling, Oct 28: "I like the
 * small font the way it is for the show name right now").
 */

import { Text } from "react-native";
import type { ReactNode } from "react";
import { splitShowName, type ShowFontEntry } from "@/lib/show-fonts";

/**
 * The segments of `text` around the show's name. When the entry is
 * null or the name doesn't appear, returns the plain string —
 * callers render that exactly as they rendered before v308.
 */
export function showNameSegments(text: string, entry: ShowFontEntry | null): ReactNode {
  if (!entry) return text;
  const segments = splitShowName(text, entry);
  if (segments.length === 1 && !segments[0].show) return text;
  return segments.map((seg, i) =>
    seg.show ? (
      <Text key={i} style={{ fontFamily: entry.fontFamily }}>
        {seg.text}
      </Text>
    ) : (
      seg.text
    ),
  );
}
