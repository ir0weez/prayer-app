// v460 — "Let me pick the game from the shelf" (Jonathan, Nov 6:
// he wanted to choose what to play). The deal still chooses at
// random; the shelf gained a door. These pins hold:
//   1. An OWNED game's shelf card is a play door — it carries a
//      quiet "Play" pill and its press hands the screen that
//      game's id through onPlay (render + source pins).
//   2. A LOCKED game's card has no play door and no Play pill —
//      its only action is the Unlock button, exactly as before.
//   3. The chapter and the Word Dig are never shelf picks, even
//      though both are always "unlocked".
//   4. The launch walks the shared path: the screen's pickGame
//      settles the table and calls applyDeal(poolItem(id)) — the
//      same launch a dealt game walks — while dealAgain and the
//      opening deal still draw through dealItem (source pins).
//   5. Best-score lines on the shelf are unchanged.
//
// Renders mount under react-dom/server over react-native-web
// (the v241/v395 harness). Presses can't fire under SSR, so the
// press wiring itself is pinned at the source, in the house style
// of the v397 shelf pin.

import React from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
    getAllKeys: async () => [],
    multiGet: async (ks: string[]) => ks.map((k) => [k, null]),
    multiSet: async () => {},
  },
}));

vi.mock("react-native", async () => {
  const rnw = await import("react-native-web");
  return {
    ...rnw,
    Platform: { OS: "android", select: (o: any) => o.android ?? o.default },
  };
});

import { GamesShelf } from "@/components/keep-me-occupied/games-shelf";
import { deriveKeepMeOccupiedMaterial } from "@/lib/keep-me-occupied-material";
import { KMO_POOL, dealItem, poolItem } from "@/lib/keep-me-occupied";
import { parseKmoProgression, type KmoProgression } from "@/lib/kmo-progression";

const m = deriveKeepMeOccupiedMaterial("#2E6BE6", {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  foreground: "#241B38",
  muted: "#6B6480",
  border: "#E5E0F0",
});

/** SSR splits interpolated text with comment markers; read through them. */
const plain = (html: string) => html.replace(/<!-- -->/g, "");

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

function shelfHtml(progression: KmoProgression, balance = 0): string {
  return plain(
    renderToString(
      <GamesShelf
        m={m}
        progression={progression}
        balance={balance}
        onUnlock={() => {}}
        onPlay={() => {}}
        onBack={() => {}}
      />,
    ),
  );
}

/** The pill is a bare text node: >Play< (aria labels never match this). */
const playPills = (html: string) => (html.match(/>Play</g) ?? []).length;

describe("v460 the shelf pick — renders", () => {
  it("every owned starter game carries a Play pill; nothing else does", () => {
    // Defaults: echo-lights, sort-it-out, stack owned. The dig and
    // the chapter are always open too but are never picks, and
    // every other game is locked.
    const html = shelfHtml(parseKmoProgression(null));
    expect(playPills(html)).toBe(3);
    expect(html).toContain("Echo Lights");
    expect(html).toContain("Word Dig");
    expect(html).toContain("A Chapter");
  });

  it("a locked game shows its price and Unlock — and no Play pill", () => {
    const html = shelfHtml(parseKmoProgression(null), 0);
    expect(html).toContain("Locked · 2,000 coins");
    expect(html).toContain("Unlock · 2,000");
    // Only the three owned starters carry pills (previous pin's count).
    expect(playPills(html)).toBe(3);
  });

  it("unlocking a game turns its card into a play door", () => {
    const prog = parseKmoProgression({ unlocked: ["runner"], best: {} });
    const html = shelfHtml(prog, 0);
    expect(playPills(html)).toBe(4);
    expect(html).not.toContain("Locked · 2,000 coins");
  });

  it("a bought chance game is pickable too — picks are not starters-only", () => {
    const prog = parseKmoProgression({ unlocked: ["coin-call"], best: {} });
    const html = shelfHtml(prog, 0);
    expect(playPills(html)).toBe(4);
    expect(html).toContain("Coin Call");
  });

  it("best-score lines stand exactly as they did", () => {
    const prog = parseKmoProgression({ unlocked: [], best: { "echo-lights": 2590 } });
    const html = shelfHtml(prog, 0);
    expect(html).toContain("Best 2590");
    expect(html).toContain("In the deck. No best score yet.");
    expect(html).toContain("Always open — never locked, never sold.");
    expect(html).toContain("Back to the deal");
  });
});

describe("v460 the shelf pick — wiring", () => {
  const shelf = read("components/keep-me-occupied/games-shelf.tsx");
  const screen = read("app/keep-me-occupied.tsx");

  it("the play door is gated on owning a GAME — not the dig, not the chapter", () => {
    expect(shelf).toContain('const playable = owned && item.kind === "game";');
    expect(shelf).toContain("onPlay: (id: KmoItemId) => void;");
  });

  it("the card itself is the pressable, and it is the only onPlay call site", () => {
    expect(shelf).toContain("onPress={() => onPlay(item.id)}");
    expect(shelf.match(/onPlay\(item\.id\)/g)).toHaveLength(1);
    expect(shelf).toContain("accessibilityLabel={`Play ${item.title}`}");
    // The launch stays the screen's job: the shelf never applies a deal.
    expect(shelf).not.toContain("applyDeal(");
  });

  it("the screen wires the pick through settle + applyDeal, the dealt launch path", () => {
    expect(screen).toContain("onPlay={pickGame}");
    const pick = screen.slice(screen.indexOf("const pickGame"));
    const body = pick.slice(0, pick.indexOf(");", pick.indexOf("applyDeal")) + 2);
    expect(body).toContain("void settleSession();");
    expect(body).toContain("applyDeal(poolItem(id));");
    expect(body.indexOf("settleSession()")).toBeLessThan(body.indexOf("applyDeal(poolItem(id))"));
  });

  it("the deal path is unchanged — the opening deal and re-deals still draw at random", () => {
    expect(screen).toContain("applyDeal(dealItem(Math.random, undefined, progRef.current.unlocked))");
    expect(screen).toContain("applyDeal(dealItem(Math.random, deal.item.id, progRef.current.unlocked))");
    expect(screen).toContain("onUnlock={onUnlock}");
  });

  it("a pick resolves through the pool registry, for every game on the ladder", () => {
    for (const item of KMO_POOL) {
      expect(poolItem(item.id).id).toBe(item.id);
      expect(poolItem(item.id).kind).toBe(item.kind);
    }
    expect(poolItem("coin-call").title).toBe("Coin Call");
    // And the deal still refuses locked games when handed the owned list.
    const dealt = dealItem(() => 0.999, undefined, ["echo-lights", "sort-it-out", "stack"]);
    expect(["echo-lights", "sort-it-out", "stack", "word-dig", "chapter"]).toContain(dealt.id);
  });
});
