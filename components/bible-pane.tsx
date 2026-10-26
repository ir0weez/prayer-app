// ─── v265: the Study pane ────────────────────────────────────────
// The Bible section, living inside the shell as a real tab pane.
// The shell owns the stack (lib/bible-pane.ts) and hands it here;
// this component renders every stack entry — covered entries stay
// MOUNTED (display: none), the way the native stack kept them, so
// a book's selected chapter and a list's scroll survive a trip
// into the reader and back — and only the top entry is visible.
//
// The pane container carries the tab bar's occupied height ONCE,
// at its foot (the screens dropped their per-screen spacers and
// bars in pane mode): the shell's one AppTabBar overlays exactly
// this much of every pane, Study included.
//
// Screens are imported from their route files: the same components
// serve the legacy root-stack routes (deep-link landings) in
// router mode and the pane here in pane mode — one surface, two
// doors, and only the pane door is used from inside the app.

import { View } from "react-native";

import BibleBooksScreen from "@/app/bible-chapters";
import BibleBookScreen from "@/app/bible-book";
import BibleChapterScreen from "@/app/bible-chapter";
import BibleQueueScreen from "@/app/bible-queue";
import { useTabBarOccupiedHeight } from "@/components/app-tab-bar";
import {
  biblePaneRouteKey,
  type BiblePaneNav,
  type BiblePaneRoute,
} from "@/lib/bible-pane";

export function BiblePane({
  stack,
  tabActive,
  bookNavNonce,
  nav,
}: {
  stack: BiblePaneRoute[];
  /** The Study tab is the shell's visible tab. */
  tabActive: boolean;
  /** The shell bumps this when an external entry (Schedule's
   * Personal Study card) asks Books to open its Jump-to-Book
   * sheet on arrival. */
  bookNavNonce: number;
  nav: BiblePaneNav;
}) {
  const tabBarHeight = useTabBarOccupiedHeight();
  return (
    <View style={{ flex: 1, paddingBottom: tabBarHeight }}>
      {stack.map((route, index) => {
        const isTop = index === stack.length - 1;
        const focused = tabActive && isTop;
        const entryStyle = {
          flex: 1,
          display: isTop ? ("flex" as const) : ("none" as const),
        };
        const key = `${index}:${biblePaneRouteKey(route)}`;
        switch (route.name) {
          case "books":
            return (
              <View key={key} style={entryStyle}>
                <BibleBooksScreen pane={{ nav, focused, bookNavNonce }} />
              </View>
            );
          case "book":
            return (
              <View key={key} style={entryStyle}>
                <BibleBookScreen pane={{ nav, focused, book: route.book }} />
              </View>
            );
          case "chapter":
            return (
              <View key={key} style={entryStyle}>
                <BibleChapterScreen
                  pane={{ nav, book: route.book, chapter: route.chapter, stories: route.stories }}
                />
              </View>
            );
          case "queue":
            return (
              <View key={key} style={entryStyle}>
                <BibleQueueScreen pane={{ nav, focused }} />
              </View>
            );
        }
      })}
    </View>
  );
}
