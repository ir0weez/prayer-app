import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import type { BibleSection } from "@/lib/bible-section-parser";
import type { CommentaryNote } from "@/lib/commentary-data";

type StudyCommentsByVerse = Record<string, CommentaryNote[]>;

interface StudyModeContentCardsProps {
  sections: BibleSection[];
  book: string;
  chapter: number;
  version: "kjv" | "csb";
  commentsByVerse: StudyCommentsByVerse;
}

function reference(book: string, chapter: number, verse: number, version: string) {
  return `${book.toUpperCase()} ${chapter}:${verse} · ${version.toUpperCase()}`;
}

export function StudyModeContentCards({ sections, book, chapter, version, commentsByVerse }: StudyModeContentCardsProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.studyAccent }]}>{section.title.toUpperCase()}</Text>
          <Text style={[styles.sectionRange, { color: colors.foreground }]}>
            {section.startVerse === section.endVerse ? `Verse ${section.startVerse}` : `Verses ${section.startVerse}-${section.endVerse}`}
          </Text>

          {section.verses.map((verse) => {
            const key = `${book}-${chapter}-${verse.verse}`;
            const comments = commentsByVerse[key] ?? [];
            return (
              <View key={key} style={styles.verseGroup}>
                <View style={[styles.card, { backgroundColor: colors.studyVerseCard, borderColor: colors.studyBorder }]}>
                  <View style={styles.headerRow}>
                    <Text style={[styles.label, { color: colors.studyAccent }]}>{reference(book, chapter, verse.verse, version)}</Text>
                    <View style={[styles.iconBubble, { backgroundColor: colors.studyAccentSoft }]}>
                      <MaterialIcons name="auto-stories" size={18} color={colors.studyAccent} />
                    </View>
                  </View>
                  <Text style={[styles.scripture, { color: colors.studyInk, fontFamily: Fonts.serif }]} selectable>“{verse.text}”</Text>
                </View>

                <View style={[styles.card, { backgroundColor: colors.studyDeepDiveCard, borderColor: colors.studyBorder }]}>
                  <View style={styles.headerRow}>
                    <Text style={[styles.label, { color: colors.studyAccent }]}>{`${book} ${chapter}:${verse.verse} DEEP DIVE`.toUpperCase()}</Text>
                    <MaterialIcons name="check-circle" size={18} color={colors.studyAccent} />
                  </View>
                  {comments.length > 0 ? comments.map((comment) => (
                    <Text key={comment.id} style={[styles.body, { color: colors.studyInk }]}>{comment.text}</Text>
                  )) : (
                    <Text style={[styles.empty, { color: colors.studyMuted }]}>No deep-dive notes are available for this verse yet.</Text>
                )}
              </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginTop: 5 },
  sectionRange: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  verseGroup: { gap: 12, marginBottom: 22 },
  card: { borderWidth: 1, borderRadius: 20, padding: 18, shadowColor: "#000000", shadowOpacity: 0.04, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  label: { flex: 1, fontSize: 10, fontWeight: "800", letterSpacing: 1.05 },
  iconBubble: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  scripture: { fontSize: 23, lineHeight: 34, fontWeight: "500" },
  body: { fontSize: 16, lineHeight: 25, marginBottom: 12 },
  empty: { fontSize: 14, lineHeight: 21 },
});
