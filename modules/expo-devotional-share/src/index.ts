import { Platform } from "react-native";
import { EventEmitter, requireNativeModule } from "expo-modules-core";

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
//
// PROGRESS AND PROOF (v539): a video render reports its frames
// as it goes (the onRenderProgress event: done of total, a flat
// pair of numbers) so the working chip can show a percentage
// instead of sitting mute for a minute or more; and
// probeShareVideoAudio asks the maker whether a finished MP4
// actually carries its audio — the v538 device run saved a
// complete-looking video with no audio in it, so a cached video
// is probed before the Share flow trusts it again.

type DevotionalShareNativeModule = {
  renderCardPng(specJson: string): Promise<void>;
  renderVideo(specJson: string): Promise<void>;
  probeVideoAudio(path: string): Promise<boolean>;
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

// The progress emitter, in the prayer timer's shape: the native
// module wrapped once in an EventEmitter. Built lazily and only
// when a caller actually wants progress — a build or a test rig
// without the emitter leaves renders working, just unreported.
let emitter: {
  addListener(
    eventName: string,
    listener: (event: { done?: unknown; total?: unknown }) => void,
  ): { remove(): void };
} | null = null;

function getEmitter(): typeof emitter {
  const native = getNative();
  if (!native) return null;
  if (!emitter) {
    try {
      emitter = new (EventEmitter as any)(native);
    } catch {
      emitter = null;
    }
  }
  return emitter;
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
 * long as the encode takes — the caller wears a working state.
 * onProgress, when given, hears frames done of the total as the
 * render commits them; it is best-effort (a render never fails
 * because its reporting did) and stops when the render settles. */
export async function renderShareVideo(
  spec: Record<string, unknown>,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const native = getNative();
  if (!native) throw new Error("This build cannot make share pictures or videos.");
  let subscription: { remove(): void } | null = null;
  if (onProgress) {
    try {
      subscription =
        getEmitter()?.addListener("onRenderProgress", (event) => {
          const done = event?.done;
          const total = event?.total;
          if (typeof done === "number" && typeof total === "number") {
            onProgress(done, total);
          }
        }) ?? null;
    } catch {
      subscription = null;
    }
  }
  try {
    await native.renderVideo(JSON.stringify(spec));
  } finally {
    subscription?.remove();
  }
}

/** Asks the maker whether the MP4 at path actually carries an
 * audio track with samples in it. Any doubt — no maker, no such
 * function, a file that cannot be read — answers false, so the
 * caller re-makes the video rather than sharing a silent one. */
export async function probeShareVideoAudio(path: string): Promise<boolean> {
  const native = getNative();
  if (!native || typeof native.probeVideoAudio !== "function") return false;
  try {
    return await native.probeVideoAudio(path);
  } catch {
    return false;
  }
}
