// ─── v259: the app tab bar, shared ──────────────────────────────────────────
// The bar used to live inline in the shell (app/(tabs)/index.tsx),
// which is why the Bible section — a set of root-stack screens the
// Bible tab LAUNCHED to — never carried it and felt like a separate
// app (Jonathan, Oct 25 22:46: "it feels like it brings me to a
// completely separate area of the app..."). The bar moved here and
// was mounted by both the shell and every Bible-section screen.
//
// ─── v265: ONE bar, in the shell ────────────────────────────────────
// Study is a pane inside the shell now, so the shell's mount is
// the only one the app navigates with — the indicator glides for
// Study because it is literally the same component and animation
// value as every other switch. The BibleTabBar wrapper below
// remains for the legacy Bible route screens (deep-link landings)
// and sends every press home to the shell.
//
// Dress is derived, never pinned, from the SAME sources the shell
// always used: useColors + useSkin tokens + the people-material
// family (usePeopleMaterial / usePeopleFrontDoor — the v256
// front-door derivation, seed × light/dark). Classic wears Concept
// 2 (Expressive) from tabbar-concepts-v1; Paper/8-bit/Terminal keep
// their own bar dress exactly as the shell rendered it. There is no
// second nav palette anywhere.
//
// The tab's visible name is "Study" (his call, Oct 25 22:47) — the
// internal key stays "bible", as do the routes and the Bible
// section's own in-page headings.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ReAnimated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { PaperGrainOverlay } from "@/components/paper-grain";
import { useColors } from "@/hooks/use-colors";
import { usePeopleFrontDoor, usePeopleMaterial } from "@/hooks/use-people-material";
import { useSkin } from "@/hooks/use-skin";
import type { PeopleFrontDoorFamily } from "@/lib/people-material";
import {
  BIT_ON_DUSK_FAINT,
  BIT_PANEL,
  BIT_PURPLE,
  TERM_BG,
  TERM_MID,
  TERM_PANEL,
  TERM_PHOS,
  skinText,
  type SkinTokens,
} from "@/lib/skin-themes";

export type AppNavTab = "people" | "schedule" | "bible" | "journal" | "more";

export const APP_TAB_ORDER: AppNavTab[] = ["people", "schedule", "bible", "journal", "more"];

export const APP_TAB_ITEMS: { tab: AppNavTab; label: string; icon: string }[] = [
  { tab: "people", label: "People", icon: "groups" },
  { tab: "schedule", label: "Schedule", icon: "event-note" },
  { tab: "bible", label: "Study", icon: "menu-book" },
  { tab: "journal", label: "Journal", icon: "article" },
  { tab: "more", label: "More", icon: "more-horiz" },
];

function iconName(name: string) {
  return name as keyof typeof MaterialIcons.glyphMap;
}

/**
 * The vertical space the bar occupies at the foot of the screen —
 * content on bar-carrying screens clears it by this much (plus its
 * own breathing room). Classic: the attached Expressive bar is
 * 13 (top pad) + 58 (tab cell) + 20 (bottom pad) = 91. The skins'
 * floating bar sits at bottom 52 with height 74, so its top edge
 * rides 126 from the screen's foot.
 */
export function useTabBarOccupiedHeight(): number {
  const { tokens } = useSkin();
  return tokens.id === "classic" ? 91 : 126;
}

function createStyles(colors: ReturnType<typeof useColors>, skin?: SkinTokens | null) {
  // Mirrors the shell's createStyles values for the bar (v256): the
  // paper surface and the kit's one offset shadow under Paper, the
  // Classic values untouched everywhere else.
  const paperSurface = skin?.surface ?? undefined;
  const cardShadow = skin?.cardShadow ? { boxShadow: skin.cardShadow.boxShadow, elevation: skin.cardShadow.elevation } : {};
  return StyleSheet.create({
    bottomNav: {
      position: "absolute",
      left: 18,
      right: 83,
      bottom: 52,
      height: 74,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: paperSurface ?? colors.surface,
      overflow: "hidden",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingHorizontal: 3,
      shadowColor: "#4D405F",
      shadowOpacity: 0.12,
      ...cardShadow,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
      zIndex: 9,
    },
    tabItem: {
      height: 66,
      flex: 1,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    tabLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      lineHeight: 14,
    },
    tabLabelActive: {
      color: "#FFFFFF",
    },
    pressed: {
      opacity: 0.75,
    },
  });
}

export function AppTabBar({
  activeTab,
  onPressTab,
  hidden = false,
}: {
  /** The nav slot wearing the active dress — already resolved to
   * one of the five (the shell maps home→people, settings→more). */
  activeTab: AppNavTab;
  onPressTab: (tab: AppNavTab) => void;
  /** The shell's journal-composer gate: while the composer morph is
   * open the bar steps aside (opacity 0, no touches). */
  hidden?: boolean;
}) {
  const colors = useColors();
  const { tokens: skinTokens, motion: skinMotion } = useSkin();
  const pm = usePeopleMaterial();
  const frontDoorFamily = usePeopleFrontDoor();
  const styles = createStyles(colors, skinTokens);
  // v256: pmf — the front-door family. Under Classic it is the
  // DERIVED family (seed × light/dark); under the material skins it
  // falls back to pm, so their bar keeps their own dress. The exact
  // computation the shell ran inline before v259 — one source, now
  // shared by every screen that mounts the bar.
  const isClassicSkin = skinTokens.id === "classic";
  const pmf: PeopleFrontDoorFamily = isClassicSkin
    ? frontDoorFamily
    : { ...pm, washSub: pm.inkSoft, queueTeal: pm.tealDeep, navGround: pm.card, navInk: pm.inkSoft, navActiveInk: pm.deep, navInd: pm.wash2, navTick: pm.seed, container: pm.wash };

  // ---- Expressive glass tab bar: the active pill slides between
  // tabs (withTiming, Material easing — no spring) ----
  const [navWidth, setNavWidth] = useState(0);
  const tabPillX = useSharedValue(0);
  const navFirstLayout = useRef(true);
  const activeTabIndex = Math.max(0, APP_TAB_ORDER.indexOf(activeTab));

  useEffect(() => {
    if (navWidth <= 0) return;
    // v256: under Classic the pill is Concept 2's (Expressive) tonal
    // blob behind the active ICON — a fixed 58px capsule centered on
    // the tab's cell; the bar carries 10px side padding, so the cell
    // math runs off navWidth - 20. The material skins keep the
    // floating bar's full-cell pill math. First layout SETS the
    // pill (no slide from a wrong slot — a Bible screen's bar opens
    // already standing on Study).
    const tabW = (navWidth - (isClassicSkin ? 20 : 6)) / 5;
    const target = Math.max(0, activeTabIndex) * tabW;
    if (navFirstLayout.current) {
      tabPillX.value = target;
      navFirstLayout.current = false;
    } else {
      // M3 Expressive emphasized easing: liquid and smooth, no bounce.
      tabPillX.value = withTiming(target, skinMotion.slide);
    }
  }, [activeTabIndex, navWidth, tabPillX, isClassicSkin, skinMotion]);

  const tabPillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabPillX.value }],
    width: navWidth > 0 ? (isClassicSkin ? 58 : (navWidth - 6) / 5 - 12) : 0,
  }));

  const renderTab = (tab: AppNavTab, label: string, icon: string) => {
    const isActive = activeTab === tab;
    return (
      <Pressable
        key={tab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPressTab(tab);
        }}
        style={({ pressed }) => [styles.tabItem, isClassicSkin ? { height: 58, justifyContent: "flex-start", gap: 0 } : null, pressed && styles.pressed]}
      >
        {/* Terminal (v188): the mockup's tab bar is a TEXT menu — no
            icons at all. v186 kept the icons AND bracketed every label,
            which overflowed the ~72px tab cells and collided ("[ JOURNAL
            ]" into "[ SETTINGS", a stray bracket under Settings). */}
        {skinTokens.isTerminal ? null : isClassicSkin ? (
          <View style={{ height: 34, justifyContent: "center", alignItems: "center" }}>
            <MaterialIcons name={iconName(icon)} size={24} color={isActive ? pmf.navActiveInk : pmf.navInk} />
          </View>
        ) : (
          <MaterialIcons name={iconName(icon)} size={28} color={isActive ? "#FFFFFF" : skinTokens.isEightBit ? BIT_ON_DUSK_FAINT : "#5F6670"} />
        )}
        <Text numberOfLines={skinTokens.isTerminal ? 1 : undefined} style={[styles.tabLabel, isActive && styles.tabLabelActive, skinTokens.isTerminal ? { color: isActive ? TERM_BG : TERM_MID } : skinTokens.isEightBit ? { color: isActive ? "#FFFFFF" : BIT_ON_DUSK_FAINT } : null, null, skinTokens.displayFont ? { fontFamily: skinTokens.displayFont, fontSize: 8, lineHeight: 13 } : null, skinTokens.isTerminal ? { fontSize: 13, lineHeight: 16 } : null, skinTokens.isPaper ? skinText(skinTokens, skinTokens.type.labelText, 16) : null, isClassicSkin ? { color: isActive ? pmf.navActiveInk : pmf.navInk, fontSize: 11.5, lineHeight: 14, fontWeight: isActive ? "800" as const : "600" as const, marginTop: 4 } : null]}>{skinTokens.isTerminal ? (isActive ? `[${label.toUpperCase()}]` : label.toUpperCase()) : label}</Text>
        {/* v256 · Concept 2 (Expressive): the short seed tick under
            the ACTIVE label — the concept's finishing mark. */}
        {isClassicSkin && isActive ? (
          <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: pmf.navTick, marginTop: 3, alignSelf: "center" }} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <View
      onLayout={(event) => setNavWidth(event.nativeEvent.layout.width)}
      pointerEvents={hidden ? "none" : "auto"}
      style={[styles.bottomNav, {
        // v204: hidden while the Journal composer morph is open —
        // the morphing box stands in the bar's place.
        opacity: hidden ? 0 : 1,
        borderColor: colors.border,
        // 8-bit (v184): the tab bar is the mockup's cartridge panel —
        // darkest HUD indigo, square corners, 3px ink edge, the one
        // hard block shadow. Other skins keep their surface.
        backgroundColor: skinTokens.isTerminal ? TERM_PANEL : skinTokens.isEightBit ? BIT_PANEL : skinTokens.surface ?? colors.surface,
        elevation: skinTokens.cardShadow?.elevation ?? 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: skinTokens.cardShadow ? 0 : 0.1,
        shadowRadius: 4,
        ...(skinTokens.cardShadow ?? {}),
        ...(skinTokens.frame ?? {}),
        // v256: under Classic the bar is tabbar-concepts-v1's
        // Concept 2 (Expressive) — attached and taller, the
        // seed-tinted surface from the front-door derivation
        // (pmf.navGround), top corners rounded 24, a soft upward
        // shadow, NO floating and NO + button beside it. The
        // skins keep the floating bar as drawn for them.
        ...(isClassicSkin ? {
          left: 0,
          right: 0,
          bottom: 0,
          height: undefined,
          borderRadius: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderWidth: 0,
          backgroundColor: pmf.navGround,
          paddingTop: 13,
          paddingBottom: 20,
          paddingHorizontal: 10,
          alignItems: "flex-start" as const,
          shadowColor: pmf.shadow,
          shadowOpacity: 1,
          shadowOffset: { width: 0, height: -6 },
          shadowRadius: 20,
          elevation: 8,
        } : {}),
      }]}
    >
      {skinTokens.cardShadow ? <PaperGrainOverlay /> : null}
      {/* sliding expressive pill — v256: under Classic this is
          Concept 2's wide tonal blob behind the active ICON
          (58×34, radius 17, the derivation's navInd), sliding
          between tabs on the same withTiming motion; the skins
          keep the filled full-cell pill. */}
      <ReAnimated.View
        style={[
          isClassicSkin
            ? {
                position: "absolute" as const,
                left: 10 + Math.max(0, (navWidth - 20) / 5 - 58) / 2,
                top: 13,
                height: 34,
                borderRadius: 17,
                backgroundColor: pmf.navInd,
              }
            : {
                position: "absolute" as const,
                left: 9,
                top: 4,
                bottom: 4,
                borderRadius: (skinTokens.isEightBit || skinTokens.isTerminal) ? 2 : 18,
                backgroundColor: skinTokens.isTerminal ? TERM_PHOS : skinTokens.isEightBit ? BIT_PURPLE : colors.primary,
              },
          tabPillAnimatedStyle,
        ]}
      />

      {APP_TAB_ITEMS.map((item) => renderTab(item.tab, item.label, item.icon))}
    </View>
  );
}

/**
 * v259: the bar as the Bible section wears it — Study active, and
 * every destination goes HOME to the shell carrying the tab it
 * should open on (the shell consumes the navTab param the way it
 * consumes the notification params).
 *
 * v265: Study lives in the shell now (a pane, not a section of
 * root-stack routes), so this bar survives only on the legacy
 * Bible ROUTE screens — the deep-link landings nothing in the app
 * navigates to anymore — and every slot on it, Study included,
 * goes home to the shell: Study lands on the pane (Books root by
 * default landing), the others on their tabs. There is no
 * in-section bar anymore; inside the pane the shell's own bar
 * stands.
 */
export function BibleTabBar() {
  const router = useRouter();
  const onPressTab = (tab: AppNavTab) => {
    router.navigate({ pathname: "/(tabs)", params: { navTab: tab } });
  };
  return <AppTabBar activeTab="bible" onPressTab={onPressTab} />;
}
