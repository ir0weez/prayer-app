/**
 * v336 — the News and Email pages render (react-dom/server over
 * react-native-web, the v241 rig). Pins:
 *  - the Email digest body renders a prepared digest whole: the
 *    standfirst count, the hero leads with their whys, the three
 *    groups with senders/subjects/previews, the Quietly filed line;
 *  - the Email page's empty state is calm and carries NO sample
 *    mail (its first paint, before the store answers, is the
 *    loading line — the populated and empty states are pinned at
 *    the store + view level);
 *  - the Finished bar renders on both pages ONLY when the route
 *    carries an originating event id;
 *  - the accordion item shows its summary + "Read the full story"
 *    only while open.
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
    usePathname: () => "/news",
    useLocalSearchParams: () => rig.params,
    useFocusEffect: (cb: any) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, [cb]);
    },
  };
});

vi.mock("expo-web-browser", () => ({
  openBrowserAsync: async () => ({}),
}));

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

// The pages' chrome (ScreenContainer / TopFade) is shared app
// furniture with its own pins — here it steps aside so these tests
// pin the pages' own content.
vi.mock("@/components/screen-container", async () => {
  const React = await import("react");
  const { View } = await import("react-native-web");
  return { ScreenContainer: ({ children }: any) => React.createElement(View, null, children) };
});
vi.mock("@/components/top-fade", async () => {
  const React = await import("react");
  // v338: the pages also call the fade's scroll-link helpers —
  // the mock mirrors the module's used surface: TopFade renders
  // nothing, the hook hands back a stand-in value, the handler
  // is a no-op.
  return {
    TopFade: () => React.createElement(React.Fragment, null),
    useTopFadeScrollY: () => ({ interpolate: () => 0 }),
    topFadeScrollHandler: () => () => {},
  };
});

vi.mock("@/hooks/use-colors", async () => {
  const { getThemedPalette } = await import("../color-themes");
  return { useColors: () => getThemedPalette("light", "default") };
});

import EmailPage from "../../app/email";
import NewsPage from "../../app/news";
import { EmailDigestView } from "@/components/email-digest-view";
import { NewsAccordionItem } from "@/components/news-accordion-item";
import { getThemedPalette } from "../color-themes";
import { deriveNewsEmailMaterial } from "../news-email-material";
import type { EmailDigest } from "../email-digest";
import type { NewsItem } from "../news";

const colors = getThemedPalette("light", "default");
const m = deriveNewsEmailMaterial(colors.primary, {
  background: colors.background,
  surface: colors.surface,
  foreground: colors.foreground,
  muted: colors.muted,
  border: colors.border,
});

const FIXTURE_DIGEST: EmailDigest = {
  preparedAt: "2026-10-29T14:04:00.000Z",
  digest: [
    { sender: "SoCal Edison", subject: "Edison bill — $86.12, due Nov 4", why: "A bill with a date on it this week." },
    { sender: "iLEAD", subject: "Melody's school — showcase Thursday", why: "It is on today's schedule." },
  ],
  groups: {
    reply: [
      { sender: "Anna Gutierrez", subject: "Sunday at our place?", preview: "Can you bring the chairs…", when: "9:41 AM" },
    ],
    money: [{ sender: "Chase", subject: "Your statement is ready", preview: "", when: "7:02 AM" }],
    people: [{ sender: "Mom", subject: "Photos from Sunday", preview: "", when: "Tue" }],
  },
  filedCount: 14,
};

describe("v336 Email digest view", () => {
  const html = renderToString(<EmailDigestView m={m} digest={FIXTURE_DIGEST} />);

  it("renders the digest whole: standfirst, leads with whys, groups, filed line", () => {
    expect(html).toContain("Two things in your inbox actually touch today.");
    expect(html).toContain("Prepared");
    expect(html).toContain("Edison bill — $86.12, due Nov 4");
    expect(html).toContain("A bill with a date on it this week.");
    // (React SSR escapes the apostrophe — the words are what pin.)
    expect(html).toContain("Melody&#x27;s school — showcase Thursday");
    expect(html).toContain("Needs a reply");
    expect(html).toContain("Anna Gutierrez");
    expect(html).toContain("Sunday at our place?");
    expect(html).toContain("Can you bring the chairs…");
    expect(html).toContain("Money &amp; bills");
    expect(html).toContain("From people you know");
    expect(html).toContain("Quietly filed");
    // SSR splits the count and its noun with comment nodes.
    expect(html.replace(/<!-- -->/g, "")).toContain("14 messages");
  });

  it("mail rows are static — no pressable affordances in the markup", () => {
    expect(html).not.toContain("chevron-right");
  });
});

describe("v336 the Finished bar's visibility rule", () => {
  it("Email page: no event param → no Finished; with one → Finished renders", () => {
    rig.params = {};
    const bare = renderToString(<EmailPage />);
    expect(bare).toContain("Morning Digest");
    expect(bare).not.toContain("Finished");
    rig.params = { eventId: "ev-mail", eventDate: "2026-10-29" };
    const fromEvent = renderToString(<EmailPage />);
    expect(fromEvent).toContain("Finished");
  });

  it("News page: no event param → no Finished; with one → Finished renders", () => {
    rig.params = {};
    const bare = renderToString(<NewsPage />);
    expect(bare).toContain("The Briefing");
    expect(bare).not.toContain("Finished");
    rig.params = { eventId: "ev-news", eventDate: "2026-10-29" };
    const fromEvent = renderToString(<NewsPage />);
    expect(fromEvent).toContain("Finished");
  });
});

describe("v336 the accordion item", () => {
  const item: NewsItem = {
    id: "https://example.com/x",
    sourceId: "ct",
    source: "Christianity Today",
    title: "Churches rally after the storm",
    link: "https://example.com/x",
    publishedAt: Date.parse("2026-10-29T10:00:00Z"),
    summary: "Local churches opened their doors and served hot meals.",
    area: "Church News",
  };
  const now = Date.parse("2026-10-29T17:00:00Z");

  it("open: summary and the read action show; closed: neither does", () => {
    const open = renderToString(
      <NewsAccordionItem m={m} item={item} chipLabel="1" open onPress={() => {}} now={now} />
    );
    expect(open).toContain("Churches rally after the storm");
    expect(open).toContain("Local churches opened their doors");
    expect(open).toContain("Read the full story");
    expect(open).toContain("7h ago");
    const closed = renderToString(
      <NewsAccordionItem m={m} item={item} chipLabel="1" open={false} onPress={() => {}} now={now} />
    );
    expect(closed).toContain("Churches rally after the storm");
    expect(closed).not.toContain("Read the full story");
    expect(closed).not.toContain("Local churches opened their doors");
  });
});
