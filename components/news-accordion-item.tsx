/**
 * v336 — one Briefing / More item in the News page's accordion
 * (his ruling, Oct 29): one item open at a time; the open item
 * wears the seed-derived primary-container box with a filled
 * number chip, source + time, the big headline and its summary,
 * and a "Read the full story" action; tapping another item
 * animates the swap — this one folds back to a plain card while
 * the tapped one grows into the container colour — on the Material
 * emphasized curve, no bounce, no springs.
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as WebBrowser from "expo-web-browser";

import { relativeNewsTime, type NewsItem } from "@/lib/news";
import type { NewsEmailMaterialFamily } from "@/lib/news-email-material";

export const NEWS_ACCORDION_EASING = Easing.bezier(0.2, 0, 0, 1);

export function NewsAccordionItem({
  m,
  item,
  chipLabel,
  open,
  onPress,
  now,
}: {
  m: NewsEmailMaterialFamily;
  item: NewsItem;
  /** The briefing's number; More rows pass undefined and get a dot. */
  chipLabel?: string;
  open: boolean;
  onPress: () => void;
  now: number;
}) {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 300,
      easing: NEWS_ACCORDION_EASING,
      useNativeDriver: false,
    }).start();
  }, [open, progress]);

  const boxColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [m.card, m.openBox],
  });
  const revealOpacity = progress;
  const revealLift = progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });

  const ink = open ? m.openInk : m.ink;
  const inkSoft = open ? m.openInkSoft : m.inkSoft;
  const time = relativeNewsTime(item.publishedAt, now);

  const openStory = () => {
    WebBrowser.openBrowserAsync(item.link).catch(() => {
      Linking.openURL(item.link).catch(() => undefined);
    });
  };

  return (
    <Animated.View
      style={[
        styles.box,
        { backgroundColor: boxColor, shadowColor: m.shadow },
      ]}
    >
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={item.title}>
        <View style={styles.headRow}>
          {chipLabel ? (
            <View
              style={[
                styles.chip,
                { backgroundColor: open ? m.chipOnOpen : m.chipOnCard },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: open ? m.chipOnOpenInk : m.chipOnCardInk },
                ]}
              >
                {chipLabel}
              </Text>
            </View>
          ) : (
            <View style={[styles.dot, { backgroundColor: open ? m.openInk : m.deep }]} />
          )}
          <View style={styles.headText}>
            {open ? (
              <Text style={[styles.sourceLine, { color: inkSoft }]}>
                {item.source}
                {time ? ` · ${time}` : ""}
              </Text>
            ) : null}
            <Text style={[open ? styles.headlineOpen : styles.headlineClosed, { color: ink }]}>
              {item.title}
            </Text>
            {!open ? (
              <Text style={[styles.sourceLine, { color: inkSoft }]}>
                {item.source}
                {time ? ` · ${time}` : ""}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
      {open ? (
        <Animated.View style={{ opacity: revealOpacity, transform: [{ translateY: revealLift }] }}>
          {item.summary ? (
            <Text style={[styles.summary, { color: ink }]}>{item.summary}</Text>
          ) : null}
          <Pressable
            onPress={openStory}
            accessibilityRole="button"
            accessibilityLabel="Read the full story"
            style={styles.readRow}
          >
            <Text style={[styles.readText, { color: ink }]}>Read the full story</Text>
            <MaterialIcons name="open-in-new" size={14} color={ink} />
          </Pressable>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headRow: { flexDirection: "row", gap: 12 },
  chip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  chipText: { fontSize: 13, fontWeight: "800" },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8, marginHorizontal: 9 },
  headText: { flex: 1 },
  sourceLine: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  headlineOpen: { fontSize: 18, fontWeight: "800", lineHeight: 24, marginTop: 3 },
  headlineClosed: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  summary: { fontSize: 13.5, lineHeight: 20, marginTop: 10, marginLeft: 38 },
  readRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    marginLeft: 38,
  },
  readText: { fontSize: 13, fontWeight: "800" },
});
