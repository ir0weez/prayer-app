import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

// ─── Devotional share maker (v536; boundary fixed v538) ─────────────
// The native half of the devotional Share group: it draws the
// share card model (lib/devotional-share.ts — every number it
// paints by arrives in the spec) to a PNG still, or renders the
// living card frame by frame and muxes it with the devotional's
// own AAC audio into an MP4. Android only: the module's config
// declares no other platform, and this door reads as unavailable
// anywhere else so the Share group can say so plainly instead of
// failing mid-tap.
//
// THE BOUNDARY (v538): the spec crosses as ONE JSON STRING, never
// as a JS object. v536 handed the Kotlin side a
// Map<String, Any?> and the first device run threw "[renderVideo]
// Cannot convert '[object Object]' to a Kotlin type": in
// expo-modules-core 3.0.30 a nested object's values are converted
// by the Any converter, which recurses with no null handling
// (nulls are only carried at the map's top level), so the story
// layout's nested null — layout.ghostBottom, the model's one
// nullable measure — killed the conversion of the whole argument.
// A string is a string in every converter ever shipped: the JS
// side stringifies the model's spec, the Kotlin side parses it
// with org.json, and no object graph crosses at all.

type DevotionalShareNativeModule = {
  renderCardPng(specJson: string): Promise<void>;
  renderVideo(specJson: string): Promise<void>;
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
  await native.renderCardPng(JSON.stringify(spec));
}

/** Renders the living card and muxes it with the devotional's
 * audio (spec.audioPath) into an MP4 at spec.outPath. Takes as
 * long as the encode takes — the caller wears a working state. */
export async function renderShareVideo(spec: Record<string, unknown>): Promise<void> {
  const native = getNative();
  if (!native) throw new Error("This build cannot make share pictures or videos.");
  await native.renderVideo(JSON.stringify(spec));
}
