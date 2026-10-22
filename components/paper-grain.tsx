import { memo } from "react";

/**
 * The Paper skin's grain overlay — REMOVED in v179.
 *
 * v174–v176 laid a speckle tile over paper surfaces. Jonathan's ruling
 * (2026-10-22): the speckles read as "little sprinkles" — they don't
 * look good and they don't look like paper. Paper is now FLAT ONLY:
 * full-strength color or warm neutral stock + the one offset shadow,
 * no texture anywhere.
 *
 * This component stays as the single, isolated grain point so every
 * existing call site (ScreenContainer, the tab screens, the paper
 * keyword scenes, the profile) keeps its shape — but it renders
 * nothing, under any skin. Classic never had the grain either. If a
 * future texture is ever approved, it lands here and only here.
 */
export const PaperGrainOverlay = memo(function PaperGrainOverlay({
  tone: _tone = "ink",
}: {
  /** Kept for call-site compatibility; the overlay renders nothing. */
  tone?: "ink" | "light";
}) {
  return null;
});
