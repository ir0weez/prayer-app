import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";
import type { BibleSection } from "@/lib/bible-section-parser";
import type { CommentaryNote } from "@/lib/commentary-data";

interface StudyModeVerseCardsProps {
  section: BibleSection;
  book: string;
  chapter: number;
  version: "kjv" | "csb";
  commentaries: CommentaryNote[];
  sectionNumber: number;
  sectionCount: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onComplete?: () => void;
}

function labelCase(value: string) {
  return value.toUpperCase();
}

function formatReference(book: string, chapter: number, verse: number, version: string) {
  return `${book.toUpperCase()} ${chapter}:${verse} · ${version.toUpperCase()}`;
}

export function StudyModeVerseCards({
  section,
  book,
  chapter,
  version,
  commentaries,
  sectionNumber,
  sectionCount,
  onClose,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  onComplete,
}: StudyModeVerseCardsProps) {
  const colors = useColors();
  const [expandedOriginalLanguage, setExpandedOriginalLanguage] = useState<number | null>(null);
  const verses = section.verses ?? [];

  const commentsByVerse = useMemo(() => {
    const grouped = new Map<number, CommentaryNote[]>();
    for (const comment of commentaries) {
      const verse = comment.startVerse ?? comment.verse;
      if (typeof verse !== "number") continue;
      const existing = grouped.get(verse) ?? [];
      existing.push(comment);
      grouped.set(verse, existing);
    }
    return grouped;
  }, [commentaries]);

  const cardStyles = {
    verse: { backgroundColor: colors.studyVerseCard, borderColor: colors.studyBorder },
    deepDive: { backgroundColor: colors.studyDeepDiveCard, borderColor: colors.studyBorder },
    explanation: { backgroundColor: colors.studyExplanationCard, borderColor: colors.studyBorder },
    original: { backgroundColor: colors.studyOriginalCard, borderColor: colors.studyBorder },
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.studyBackground }]}> 
      <View style={[styles.header, { borderBottomColor: colors.studyBorder }]}> 
        <Pressable accessibilityRole="button" accessibilityLabel="Close Study Mode" onPress={onClose} style={styles.headerButton}>
          <MaterialIcons name="close" size={25} color={colors.studyInk} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.studyMuted }]}>{labelCase(book)} {chapter}</Text>
          <Text style={[styles.headerTitle, { color: colors.studyInk }]} numberOfLines={1}>Deep Dive</Text>
        </View>
        <Text style={[styles.progress, { color: colors.studyMuted }]}>{sectionNumber} / {sectionCount}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {section.title && (
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionKicker, { color: colors.studyAccent }]}>{labelCase(section.title)}</Text>
            <Text style={[styles.sectionTitle, { color: colors.studyInk }]}>{section.startVerse === section.endVerse ? `Verse ${section.startVerse}` : `Verses ${section.startVerse}-${section.endVerse}`}</Text>
          </View>
        )}

        {verses.length === 0 ? (
          <View style={[styles.emptySection, { backgroundColor: colors.studySurface, borderColor: colors.studyBorder }]}>
            <MaterialIcons name="menu-book" size={28} color={colors.studyAccent} />
            <Text style={[styles.emptyTitle, { color: colors.studyInk }]}>No verse text available</Text>
            <Text style={[styles.emptyBody, { color: colors.studyMuted }]}>This study section does not have verse text to display yet.</Text>
          </View>
        ) : verses.map((verse) => {
          const verseComments = commentsByVerse.get(verse.verse) ?? [];
          const originalExpanded = expandedOriginalLanguage === verse.verse;
          return (
            <View key={verse.verse} style={styles.verseGroup}>
              <View style={[styles.card, cardStyles.verse]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.cardLabel, { color: colors.studyAccent }]}>{formatReference(book, chapter, verse.verse, version)}</Text>
                  <View style={[styles.verseIcon, { backgroundColor: colors.studyAccentSoft }]}>
                    <MaterialIcons name="auto-stories" size={19} color={colors.studyAccent} />
                  </View>
                </View>
                <Text style={[styles.scripture, { color: colors.studyInk, fontFamily: Fonts.serif }]} selectable>“{verse.text}”</Text>
              </View>

              <View style={[styles.card, cardStyles.deepDive]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.cardLabel, { color: colors.studyAccent }]}>{labelCase(`${book} ${chapter}:${verse.verse} deep dive`)}</Text>
                  <MaterialIcons name="check-circle" size={19} color={colors.studyAccent} />
                </View>
                {verseComments.length > 0 ? verseComments.map((comment) => (
                  <Text key={comment.id} style={[styles.body, { color: colors.studyInk }]}>{comment.text}</Text>
                )) : (
                  <Text style={[styles.emptyBody, { color: colors.studyMuted }]}>No deep-dive notes are available for this verse yet.</Text>
                )}
              </View>

              <View style={[styles.card, cardStyles.explanation]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.cardLabel, { color: colors.studyAccent }]}>{labelCase(`${book} ${chapter}:${verse.verse} explanation`)}</Text>
                  <MaterialIcons name="check-circle" size={19} color={colors.studyAccent} />
                </View>
                <Text style={[styles.emptyBody, { color: colors.studyMuted }]}>A plain-language explanation is not available for this verse yet.</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Original language for ${book} ${chapter}:${verse.verse}`}
                onPress={() => setExpandedOriginalLanguage(originalExpanded ? null : verse.verse)}
                style={[styles.card, cardStyles.original]}
              >
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.cardLabel, { color: colors.studyAccent }]}>{labelCase(`${book} ${chapter}:${verse.verse} original language`)}</Text>
                  <MaterialIcons name={originalExpanded ? "expand-less" : "expand-more"} size={21} color={colors.studyAccent} />
                </View>
                <Text style={[styles.emptyBody, { color: colors.studyMuted }]}>Original-language words and transliterations are not available for this verse yet.</Text>
                {originalExpanded && (
                  <View style={[styles.expandedNote, { borderTopColor: colors.studyBorder }]}> 
                    <Text style={[styles.emptyBody, { color: colors.studyMuted }]}>When Hebrew or Greek word data is added, it will appear here with transliteration and expanded detail.</Text>
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.studyBorder, backgroundColor: colors.studySurface }]}> 
        <Pressable accessibilityRole="button" accessibilityLabel="Previous study section" disabled={!canGoPrevious} onPress={onPrevious} style={[styles.navButton, { borderColor: colors.studyBorder, opacity: canGoPrevious ? 1 : 0.35 }]}>
          <MaterialIcons name="chevron-left" size={23} color={colors.studyInk} />
          <Text style={[styles.navText, { color: colors.studyInk }]}>Previous</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={canGoNext ? "Next study section" : "Complete study"} onPress={canGoNext ? onNext : onComplete} style={[styles.nextButton, { backgroundColor: colors.studyAccent }]}>
          <Text style={styles.nextText}>{canGoNext ? "Next section" : "Complete"}</Text>
          <MaterialIcons name={canGoNext ? "chevron-right" : "check"} size={21} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 15, borderBottomWidth: 1 },
  headerButton: { width: 38, height: 38, alignItems: "flex-start", justifyContent: "center" },
  headerCopy: { flex: 1, marginHorizontal: 8 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  headerTitle: { fontSize: 22, fontWeight: "800", marginTop: 2 },
  progress: { fontSize: 12, fontWeight: "700" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 26 },
  sectionHeading: { marginBottom: 16 },
  sectionKicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  sectionTitle: { fontSize: 25, fontWeight: "800", marginTop: 5 },
  verseGroup: { gap: 12, marginBottom: 22 },
  card: { borderWidth: 1, borderRadius: 20, padding: 18, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  cardLabel: { flex: 1, fontSize: 10, fontWeight: "800", letterSpacing: 1.05 },
  verseIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  scripture: { fontSize: 23, lineHeight: 34, fontWeight: "500" },
  body: { fontSize: 16, lineHeight: 25, marginBottom: 12 },
  emptySection: { borderWidth: 1, borderRadius: 20, padding: 22, alignItems: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginTop: 10 },
  emptyBody: { fontSize: 14, lineHeight: 21 },
  expandedNote: { borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
  footer: { flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18, borderTopWidth: 1 },
  navButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 },
  navText: { fontSize: 13, fontWeight: "700" },
  nextButton: { flex: 1.25, minHeight: 48, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  nextText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});
