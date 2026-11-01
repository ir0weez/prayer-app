// v395 — "Keep Me Occupied" renders. The door card, the wave
// check, the Word Dig board and an Echo Lights board mount under
// react-dom/server over react-native-web (the v241 harness), with
// the material hook fed a fixed palette so the pins hold structure
// and words, not a theme. Effects never fire under SSR — which is
// itself the point for the games: their FIRST paint is already the
// game, plain-mounted, no sheet, no animation gate.

import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
    getAllKeys: async () => [],
    multiGet: async (ks: string[]) => ks.map((k) => [k, null]),
  },
}));

vi.mock("react-native", async () => {
  const rnw = await import("react-native-web");
  return {
    ...rnw,
    Platform: { OS: "android", select: (o: any) => o.android ?? o.default },
  };
});

vi.mock("@expo/vector-icons/MaterialIcons", async () => {
  const React = await import("react");
  const { Text } = await import("react-native-web");
  const Stub = (props: any) => React.createElement(Text, props, props?.name ?? "");
  return { __esModule: true, default: Stub };
});

vi.mock("@/hooks/use-keep-me-occupied-material", async () => {
  const { deriveKeepMeOccupiedMaterial } = await import("@/lib/keep-me-occupied-material");
  const family = deriveKeepMeOccupiedMaterial("#2E6BE6", {
    background: "#FFFFFF",
    surface: "#FFFFFF",
    foreground: "#241B38",
    muted: "#6B6480",
    border: "#E5E0F0",
  });
  return { useKeepMeOccupiedMaterial: () => family };
});

import { KeepMeOccupiedCard } from "@/components/keep-me-occupied/door-card";
import { EchoLightsGame } from "@/components/keep-me-occupied/echo-lights";
import { WaveCheck } from "@/components/keep-me-occupied/wave-check";
import { WordDigGame } from "@/components/keep-me-occupied/word-dig";
import { deriveKeepMeOccupiedMaterial } from "@/lib/keep-me-occupied-material";
import type { DigTarget } from "@/lib/keep-me-occupied";

const m = deriveKeepMeOccupiedMaterial("#2E6BE6", {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  foreground: "#241B38",
  muted: "#6B6480",
  border: "#E5E0F0",
});

/** SSR splits interpolated text with comment markers; read through them. */
const plain = (html: string) => html.replace(/<!-- -->/g, "");

describe("v395 renders", () => {
  it("the door card carries the title, the one line, and the one pill", () => {
    const html = plain(renderToString(<KeepMeOccupiedCard onPress={() => {}} />));
    expect(html).toContain("Keep Me Occupied");
    expect(html).toContain("Deal me something");
    expect(html).toContain("no choosing");
  });

  // v401 (dated note): the wave check no longer takes an entry
  // rating at all — the entry row was removed from the dealt
  // screen (his screenshot feedback), so the before/after read
  // this file pinned in v395 is retired. What remains is the one
  // question, asked once.
  it("the wave check shows the session line and all three doors", () => {
    const html = plain(renderToString(
      <WaveCheck
        m={m}
        sessionLineText="You played Echo Lights for 11 minutes."
        onDoor={() => {}}
      />,
    ));
    expect(html).toContain("How strong is it now?");
    expect(html).toContain("You played Echo Lights for 11 minutes.");
    expect(html).toContain("Deal me another");
    expect(html).toContain("Pray it out");
    expect(html).toContain("Back to my day");
  });

  it("the wave check asks the one question — no before/after is invented", () => {
    const html = plain(renderToString(
      <WaveCheck m={m} sessionLineText="You read Psalm 91 for 12 minutes." onDoor={() => {}} />,
    ));
    expect(html).toContain("How strong is it now?");
    expect(html).not.toContain("when you came in");
  });

  it("the dig board stands on the verse with the word buried", () => {
    const target: DigTarget = {
      book: "Psalms",
      chapter: 23,
      verse: 2,
      verseText: "He maketh me to lie down in green pastures: he leadeth me beside the still waters.",
      word: "GREEN",
    };
    const html = plain(renderToString(<WordDigGame m={m} target={target} loading={false} onNextDig={() => {}} />));
    expect(html).toContain("PSALMS 23 : 2");
    expect(html).toContain("▁▁▁▁▁");
    expect(html).toContain("DIG");
  });

  it("a game board's first paint is already the game", () => {
    const html = plain(renderToString(<EchoLightsGame m={m} />));
    expect(html).toContain("pattern length 1");
    expect(html).toContain("riding the wave");
  });
});
