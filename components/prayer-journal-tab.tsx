import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DateTimePicker } from "@/components/date-time-picker";
import { useColors } from "@/hooks/use-colors";
import type { Person } from "@/lib/prayercircle-data";
import {
  addPrayerJournalReply,
  createPrayerJournalEntry,
  filterPrayerJournalEntries,
  formatPrayerJournalDate,
  groupPrayerJournalEntries,
  removePrayerJournalEntry,
  removePrayerJournalReply,
  togglePrayerJournalBookmark,
  type PrayerJournalEntry,
  type PrayerJournalTaggedPerson,
} from "@/lib/prayer-journal";

type PrayerJournalTabProps = {
  entries: PrayerJournalEntry[];
  people: Person[];
  onChange: (entries: PrayerJournalEntry[]) => void;
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function TaggedAvatar({ person }: { person: PrayerJournalTaggedPerson }) {
  if (person.photoUri) {
    return <Image source={{ uri: person.photoUri }} style={styles.taggedAvatarImage} contentFit="cover" />;
  }
  return (
    <View style={[styles.taggedAvatarFallback, { backgroundColor: person.avatarColor }]}>
      <Text style={[styles.taggedAvatarInitials, { color: person.accentColor }]}>{person.initials}</Text>
    </View>
  );
}

export function PrayerJournalTab({ entries, people, onChange }: PrayerJournalTabProps) {
  const colors = useColors();
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [showEntryComposer, setShowEntryComposer] = useState(false);
  const [replyEntryId, setReplyEntryId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [draftDate, setDraftDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [draftTaggedPersonIds, setDraftTaggedPersonIds] = useState<string[]>([]);
  const [draftReply, setDraftReply] = useState("");

  const filteredEntries = useMemo(
    () => filterPrayerJournalEntries(entries, bookmarksOnly),
    [bookmarksOnly, entries],
  );
  const sections = useMemo(
    () =>
      groupPrayerJournalEntries(filteredEntries).map((group) => ({
        title: group.label,
        date: group.date,
        data: group.entries,
      })),
    [filteredEntries],
  );
  const replyTarget = useMemo(
    () => entries.find((entry) => entry.id === replyEntryId) ?? null,
    [entries, replyEntryId],
  );

  const closeEntryComposer = () => {
    setShowEntryComposer(false);
    setDraftBody("");
    setDraftTaggedPersonIds([]);
  };

  const handleCreateEntry = () => {
    if (!draftBody.trim()) return;
    const taggedPeople = people.filter((person) => draftTaggedPersonIds.includes(person.id));
    onChange(
      createPrayerJournalEntry(
        entries,
        { body: draftBody, date: draftDate, taggedPeople },
        createId("journal"),
      ),
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    closeEntryComposer();
  };

  const handlePostReply = () => {
    if (!replyTarget || !draftReply.trim()) return;
    onChange(addPrayerJournalReply(entries, replyTarget.id, draftReply, createId("reply")));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setDraftReply("");
    setReplyEntryId(null);
  };

  const confirmDeleteEntry = (entry: PrayerJournalEntry) => {
    Alert.alert(
      "Delete journal entry?",
      "This will also delete every reply attached to this prayer entry.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onChange(removePrayerJournalEntry(entries, entry.id)),
        },
      ],
    );
  };

  const confirmDeleteReply = (entryId: string, replyId: string) => {
    Alert.alert("Delete reply?", "This journal update will be permanently removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onChange(removePrayerJournalReply(entries, entryId, replyId)),
      },
    ]);
  };

  const renderEntry = ({ item }: { item: PrayerJournalEntry }) => (
    <View style={[styles.entryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.entryTopRow}>
        <Text style={[styles.entryDate, { color: colors.muted }]}>{formatPrayerJournalDate(item.date)}</Text>
        <Pressable
          accessibilityLabel="Delete journal entry"
          hitSlop={8}
          onPress={() => confirmDeleteEntry(item)}
          style={({ pressed }) => [styles.deleteIconButton, pressed && styles.pressed]}
        >
          <MaterialIcons name="close" size={17} color={colors.muted} />
        </Pressable>
      </View>

      <Text style={[styles.entryBody, { color: colors.foreground }]}>{item.body}</Text>

      {item.taggedPeople.length > 0 ? (
        <View style={styles.taggedPeopleRow}>
          {item.taggedPeople.slice(0, 6).map((person) => (
            <View key={person.id} style={[styles.taggedAvatar, { borderColor: colors.background }]}>
              <TaggedAvatar person={person} />
            </View>
          ))}
          <Text numberOfLines={1} style={[styles.taggedNames, { color: colors.muted }]}>
            {item.taggedPeople.map((person) => person.name).join(", ")}
          </Text>
        </View>
      ) : null}

      <View style={styles.entryActions}>
        <Pressable
          onPress={() => {
            onChange(togglePrayerJournalBookmark(entries, item.id));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          }}
          style={({ pressed }) => [
            styles.outlineAction,
            { borderColor: colors.primary, backgroundColor: item.isBookmarked ? colors.primary : "transparent" },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons name={item.isBookmarked ? "bookmark" : "bookmark-border"} size={18} color={item.isBookmarked ? "#FFFFFF" : colors.primary} />
          <Text style={[styles.outlineActionText, { color: item.isBookmarked ? "#FFFFFF" : colors.primary }]}>
            {item.isBookmarked ? "Bookmarked" : "Bookmark"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setDraftReply("");
            setReplyEntryId(item.id);
          }}
          style={({ pressed }) => [styles.outlineAction, { borderColor: colors.primary }, pressed && styles.pressed]}
        >
          <MaterialIcons name="reply" size={18} color={colors.primary} />
          <Text style={[styles.outlineActionText, { color: colors.primary }]}>Reply</Text>
        </Pressable>
      </View>

      {item.replies.length > 0 ? (
        <View style={[styles.repliesSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.replyCount, { color: colors.muted }]}>
            {item.replies.length} {item.replies.length === 1 ? "reply" : "replies"}
          </Text>
          {item.replies.map((reply) => (
            <View key={reply.id} style={[styles.replyCard, { backgroundColor: colors.surface }]}>
              <View style={styles.replyTopRow}>
                <Text style={[styles.replyDate, { color: colors.muted }]}>
                  {formatPrayerJournalDate(reply.date)}
                </Text>
                <Pressable
                  accessibilityLabel="Delete journal reply"
                  hitSlop={8}
                  onPress={() => confirmDeleteReply(item.id, reply.id)}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <MaterialIcons name="close" size={17} color={colors.muted} />
                </Pressable>
              </View>
              <Text style={[styles.replyBody, { color: colors.foreground }]}>{reply.body}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Prayer Journal</Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel={bookmarksOnly ? "Show all journal entries" : "Show bookmarked journal entries"}
            accessibilityState={{ selected: bookmarksOnly }}
            onPress={() => setBookmarksOnly((current) => !current)}
            style={({ pressed }) => [
              styles.headerCircle,
              {
                backgroundColor: bookmarksOnly ? colors.primary : colors.background,
                borderColor: bookmarksOnly ? colors.primary : colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons name={bookmarksOnly ? "bookmark" : "bookmark-border"} size={23} color={bookmarksOnly ? "#FFFFFF" : colors.primary} />
          </Pressable>
          <Pressable
            accessibilityLabel="Add prayer journal entry"
            onPress={() => setShowEntryComposer(true)}
            style={({ pressed }) => [styles.headerCircle, { backgroundColor: colors.primary, borderColor: colors.primary }, pressed && styles.primaryPressed]}
          >
            <MaterialIcons name="add" size={29} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>{section.title}</Text>
        )}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, sections.length === 0 && styles.emptyListContent]}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "18" }]}>
              <MaterialIcons name={bookmarksOnly ? "bookmark-border" : "auto-stories"} size={30} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {bookmarksOnly ? "No bookmarked prayers" : "Your prayer journal is ready"}
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.muted }]}>
              {bookmarksOnly
                ? "Bookmark an entry to keep important prayers and answers close."
                : "Write a prayer, tag the people it concerns, and add updates as replies over time."}
            </Text>
            {!bookmarksOnly ? (
              <Pressable
                onPress={() => setShowEntryComposer(true)}
                style={({ pressed }) => [styles.emptyButton, { backgroundColor: colors.primary }, pressed && styles.primaryPressed]}
              >
                <MaterialIcons name="edit" size={18} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Write your first entry</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />

      <Modal transparent visible={showEntryComposer} animationType="slide" onRequestClose={closeEntryComposer}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={closeEntryComposer} />
          <SafeAreaView edges={["top", "bottom"]} style={[styles.composerSheet, { backgroundColor: colors.background }]}>
            <View style={[styles.composerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.composerTitle, { color: colors.foreground }]}>New Prayer Entry</Text>
              <Pressable onPress={closeEntryComposer} style={({ pressed }) => [pressed && styles.pressed]}>
                <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
              </Pressable>
            </View>
            <FlatList
              data={people}
              keyExtractor={(person) => person.id}
              numColumns={2}
              columnWrapperStyle={styles.peopleColumn}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.composerContent}
              ListHeaderComponent={
                <View>
                  <TextInput
                    value={draftBody}
                    onChangeText={setDraftBody}
                    placeholder="Write your prayer..."
                    placeholderTextColor={colors.muted}
                    multiline
                    textAlignVertical="top"
                    style={[styles.prayerInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                  />
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Entry Date</Text>
                  <DateTimePicker value={draftDate} onChange={setDraftDate} mode="date" label="Entry Date" />
                  <Text style={[styles.fieldLabel, styles.peopleLabel, { color: colors.foreground }]}>Tag People</Text>
                  {people.length === 0 ? (
                    <Text style={[styles.noPeopleText, { color: colors.muted }]}>Add contacts from the People tab to tag them here.</Text>
                  ) : null}
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = draftTaggedPersonIds.includes(item.id);
                return (
                  <Pressable
                    onPress={() =>
                      setDraftTaggedPersonIds((current) =>
                        current.includes(item.id)
                          ? current.filter((personId) => personId !== item.id)
                          : [...current, item.id],
                      )
                    }
                    style={({ pressed }) => [
                      styles.personChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text numberOfLines={1} style={[styles.personChipText, { color: isSelected ? "#FFFFFF" : colors.foreground }]}>
                      {item.name}
                    </Text>
                    {isSelected ? <MaterialIcons name="check" size={16} color="#FFFFFF" /> : null}
                  </Pressable>
                );
              }}
              ListFooterComponent={
                <Pressable
                  disabled={!draftBody.trim()}
                  onPress={handleCreateEntry}
                  style={({ pressed }) => [
                    styles.saveEntryButton,
                    { backgroundColor: colors.primary, opacity: draftBody.trim() ? (pressed ? 0.82 : 1) : 0.22 },
                  ]}
                >
                  <Text style={styles.saveEntryButtonText}>Save Entry</Text>
                </Pressable>
              }
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        transparent
        visible={Boolean(replyTarget)}
        animationType="slide"
        onRequestClose={() => {
          setReplyEntryId(null);
          setDraftReply("");
        }}
      >
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setReplyEntryId(null);
              setDraftReply("");
            }}
          />
          <SafeAreaView edges={["top", "bottom"]} style={[styles.replySheet, { backgroundColor: colors.background }]}>
            <View style={[styles.composerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.composerTitle, { color: colors.foreground }]}>Reply to Entry</Text>
              <Pressable
                onPress={() => {
                  setReplyEntryId(null);
                  setDraftReply("");
                }}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
              </Pressable>
            </View>
            <View style={styles.replyComposerContent}>
              <TextInput
                value={draftReply}
                onChangeText={setDraftReply}
                placeholder="Write your reply..."
                placeholderTextColor={colors.muted}
                multiline
                autoFocus
                textAlignVertical="top"
                style={[styles.replyInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
              />
              <Pressable
                disabled={!draftReply.trim()}
                onPress={handlePostReply}
                style={({ pressed }) => [
                  styles.saveEntryButton,
                  { backgroundColor: colors.primary, opacity: draftReply.trim() ? (pressed ? 0.82 : 1) : 0.22 },
                ]}
              >
                <Text style={styles.saveEntryButtonText}>Post Reply</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    minHeight: 86,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 140 },
  emptyListContent: { flexGrow: 1 },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: "700", marginTop: 18, marginBottom: 8, marginLeft: 4 },
  entryCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 14 },
  entryTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  entryDate: { fontSize: 14, lineHeight: 19, fontWeight: "700" },
  deleteIconButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  entryBody: { fontSize: 17, lineHeight: 25, marginTop: 8 },
  taggedPeopleRow: { marginTop: 14, minHeight: 38, flexDirection: "row", alignItems: "center" },
  taggedAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, overflow: "hidden", marginRight: -7 },
  taggedAvatarImage: { width: "100%", height: "100%" },
  taggedAvatarFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  taggedAvatarInitials: { fontSize: 11, fontWeight: "800" },
  taggedNames: { flex: 1, marginLeft: 14, fontSize: 12, lineHeight: 16 },
  entryActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  outlineAction: {
    minHeight: 42,
    borderWidth: 1.5,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  outlineActionText: { fontSize: 14, lineHeight: 18, fontWeight: "700" },
  repliesSection: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 14, gap: 10 },
  replyCount: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  replyCard: { borderRadius: 14, padding: 13 },
  replyTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  replyDate: { fontSize: 12, lineHeight: 16, fontWeight: "600" },
  replyBody: { fontSize: 15, lineHeight: 22 },
  emptyCard: {
    marginTop: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 14, fontSize: 19, lineHeight: 24, fontWeight: "800", textAlign: "center" },
  emptyDescription: { marginTop: 7, fontSize: 14, lineHeight: 21, textAlign: "center" },
  emptyButton: {
    marginTop: 20,
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(21, 16, 29, 0.48)" },
  composerSheet: { height: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  replySheet: { height: "78%", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  composerHeader: {
    minHeight: 66,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  composerTitle: { fontSize: 21, lineHeight: 27, fontWeight: "800" },
  doneText: { fontSize: 16, lineHeight: 22, fontWeight: "800", paddingVertical: 10 },
  composerContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },
  prayerInput: { minHeight: 150, borderWidth: 1, borderRadius: 18, padding: 16, fontSize: 17, lineHeight: 24 },
  fieldLabel: { marginTop: 20, marginBottom: 10, fontSize: 16, lineHeight: 21, fontWeight: "800" },
  peopleLabel: { marginTop: 22 },
  noPeopleText: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  peopleColumn: { gap: 10 },
  personChip: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 13,
    marginBottom: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  personChipText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: "600" },
  saveEntryButton: { minHeight: 50, borderRadius: 14, marginTop: 20, alignItems: "center", justifyContent: "center" },
  saveEntryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  replyComposerContent: { padding: 18 },
  replyInput: { minHeight: 170, borderWidth: 1, borderRadius: 18, padding: 16, fontSize: 17, lineHeight: 24 },
  pressed: { opacity: 0.68 },
  primaryPressed: { opacity: 0.86, transform: [{ scale: 0.97 }] },
});
