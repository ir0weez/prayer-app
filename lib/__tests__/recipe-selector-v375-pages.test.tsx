/**
 * v375 — the Food page in pick mode, first frame (the v336 rig:
 * react-dom/server over react-native-web). The stores answer
 * asynchronously, so the pin is the frame's contract: a page
 * opened for the editor's pick NEVER paints the day-card door's
 * Finished bar (finishing an event from the picker would be
 * wrong twice over), while the day-card route keeps it.
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
import { beginRecipePick, resetRecipePickForTests } from "../recipe-pick";

describe("v375 the Food page opened for a pick", () => {
  it("never carries the Finished bar, even with an event id in the params", () => {
    resetRecipePickForTests();
    const token = beginRecipePick({
      eventId: "ev-dinner",
      title: "Dinner",
      date: "2026-10-30",
      notes: "",
    });
    rig.params = { pick: "1", pickToken: String(token), eventId: "ev-dinner", eventDate: "2026-10-30" };
    const html = renderToString(<FoodPage />);
    expect(html).not.toContain("Finished");
    expect(html).toContain("Opening the kitchen…");
  });

  it("a stale pick token falls back to the plain page — no Add bar, no Finished bar without an event", () => {
    resetRecipePickForTests();
    rig.params = { pick: "1", pickToken: "999" };
    const html = renderToString(<FoodPage />);
    expect(html).not.toContain("Add to event");
    expect(html).not.toContain("Finished");
  });
});
