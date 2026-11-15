import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

// ─── Devotional share maker (v536) ──────────────────────────────────────────
// The native half of the devotional Share group: it draws the
// share card model (lib/devotional-share.ts — every number it
// paints by arrives in the spec) to a PNG still, or renders the
// living card frame by frame and muxes it with the devotional's
// own AAC audio into an MP4. Android only: the module's config
// declares no other platform, and this door reads as unavailable
// anywhere else so the Share group can say so plainly instead of
// failing mid-tap.

type DevotionalShareNativeModule = {
  renderCardPng(spec: Record<string, unknown>): Promise<void>;
  renderVideo(spec: Record<string, unknown>): Promise<void>;
};

let cached: DevotionalShareNativeModule | null | undefined;

function getNative(): DevotionalShareNativeModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== "android") return cached;
  try {
    cached = requireNativeModule<DevotionalShareNativeModule>("ExpoDevotionalShare");
  } catch {
    cached = null;
  }
  return cached;
}

/** True when the native share maker is linked in this build. */
export function isDevotionalShareAvailable(): boolean {
  return getNative() !== null;
}

/** Draws one share card (the spec's format) to a PNG at spec.outPath. */
export async function renderShareCardPng(spec: Record<string, unknown>): Promise<void> {
  const native = getNative();
  if (!native) throw new Error("This build cannot make share pictures or videos.");
  await native.renderCardPng(spec);
}

/** Renders the living card and muxes it with the devotional's
 * audio (spec.audioPath) into an MP4 at spec.outPath. Takes as
 * long as the encode takes — the caller wears a working state. */
export async function renderShareVideo(spec: Record<string, unknown>): Promise<void> {
  const native = getNative();
  if (!native) throw new Error("This build cannot make share pictures or videos.");
  await native.renderVideo(spec);
}
