/**
 * v370 — the Food page renders (the v336 rig: react-dom/server
 * over react-native-web). SSR paints the page's first frame —
 * the stores answer asynchronously, so the pins cover what the
 * first frame must already get right: the page loads and paints
 * its chrome without crashing, and the Finished bar follows the
 * same visibility rule as News/Email (only an originating event
 * id carries one). The loaded states are pinned at the store
 * level in food-v370.test.ts.
 */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const rig = vi.hoisted(() => ({
  params: {} as Record<string, string>,
}));

const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: async (k: string) => {
      store.delete(k);
    },
    getAllKeys: async () => [...store.keys()],
    multiGet: async (ks: string[]) => ks.map((k) => [k, store.get(k) ?? null]),
  },
}));

vi.mock("react-native", async () => {
  const rnw = await import("react-native-web");
  return {
    ...rnw,
    Platform: { OS: "android", select: (o: any) => o.android ?? o.default },
  };
});

vi.mock("expo-router", async () => {
  const React = await import("react");
  return {
    useRouter: () => ({ push: () => {}, back: () => {}, replace: () => {}, navigate: () => {}, setParams: () => {} }),
    usePathname: () => "/food",
    useLocalSearchParams: () => rig.params,
    useFocusEffect: (cb: any) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, [cb]);
    },
  };
});

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 12, left: 0 }),
  SafeAreaView: ({ children }: any) => children,
}));

vi.mock("@expo/vector-icons/MaterialIcons", async () => {
  const React = await import("react");
  const { Text } = await import("react-native-web");
  return {
    default: (props: any) =>
      React.createElement(Text, { style: { color: props.color, fontSize: props.size } }, `icon:${props.name}`),
  };
});

vi.mock("@/components/screen-container", async () => {
  const React = await import("react");
  const { View } = await import("react-native-web");
  return { ScreenContainer: ({ children }: any) => React.createElement(View, null, children) };
});

vi.mock("@/hooks/use-colors", async () => {
  const { getThemedPalette } = await import("../color-themes");
  return { useColors: () => getThemedPalette("light", "default") };
});

import FoodPage from "../../app/food";

describe("v370 the Food page's first frame", () => {
  it("paints its chrome and the opening line without an event", () => {
    rig.params = {};
    const bare = renderToString(<FoodPage />);
    expect(bare).toContain("Food");
    expect(bare).toContain("Opening the kitchen…");
    expect(bare).not.toContain("Finished");
  });

  it("carries the Finished bar when opened from an event", () => {
    rig.params = { eventId: "ev-dinner", eventDate: "2026-10-30" };
    const fromEvent = renderToString(<FoodPage />);
    expect(fromEvent).toContain("Finished");
  });
});
