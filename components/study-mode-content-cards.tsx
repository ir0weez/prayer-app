import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  const [expandedOriginalLanguage, setExpandedOriginalLanguage] = useState<string | null>(null);

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
            const isExpanded = expandedOriginalLanguage === key;
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

                <View style={[styles.card, { backgroundColor: colors.studyExplanationCard, borderColor: colors.studyBorder }]}>
                  <View style={styles.headerRow}>
                    <Text style={[styles.label, { color: colors.studyAccent }]}>{`${book} ${chapter}:${verse.verse} EXPLANATION`.toUpperCase()}</Text>
                    <MaterialIcons name="check-circle" size={18} color={colors.studyAccent} />
                  </View>
                  <Text style={[styles.empty, { color: colors.studyMuted }]}>A plain-language explanation is not available for this verse yet.</Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Original language for ${reference(book, chapter, verse.verse, version)}`}
                  onPress={() => setExpandedOriginalLanguage(isExpanded ? null : key)}
                  style={[styles.card, { backgroundColor: colors.studyOriginalCard, borderColor: colors.studyBorder }]}
                >
                  <View style={styles.headerRow}>
                    <Text style={[styles.label, { color: colors.studyAccent }]}>{`${book} ${chapter}:${verse.verse} ORIGINAL LANGUAGE`.toUpperCase()}</Text>
                    <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={20} color={colors.studyAccent} />
                  </View>
                  <Text style={[styles.empty, { color: colors.studyMuted }]}>Original-language words and transliterations are not available for this verse yet.</Text>
                  {isExpanded && (
                    <View style={[styles.expanded, { borderTopColor: colors.studyBorder }]}>
                      <Text style={[styles.empty, { color: colors.studyMuted }]}>When Hebrew or Greek word data is added, it will appear here with transliteration and expanded detail.</Text>
                    </View>
                  )}
                </Pressable>
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
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.15, marginTop: 5 },
  sectionRange: { fontSize: 21, fontWeight: "800", marginBottom: 7 },
  verseGroup: { gap: 12, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 18, padding: 17 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 11 },
  label: { flex: 1, fontSize: 10, fontWeight: "800", letterSpacing: 0.95 },
  iconBubble: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  scripture: { fontSize: 22, lineHeight: 32, fontWeight: "500" },
  body: { fontSize: 15, lineHeight: 24, marginBottom: 11 },
  empty: { fontSize: 14, lineHeight: 21 },
  expanded: { borderTopWidth: 1, marginTop: 13, paddingTop: 13 },
});
