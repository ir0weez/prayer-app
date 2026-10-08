import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useMemo, useRef, useState } from "react";
import { MarkdownText, extractHashtags } from "@/components/markdown-text";
import { MoodPicker, MoodChip, type JournalMood } from "@/components/mood-picker";
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
import { AvatarImage } from "@/components/avatar-system";
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
  updatePrayerJournalEntry,
  updatePrayerJournalReply,
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
  return <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={38} fallbackColor={person.avatarColor} />;
}

export function PrayerJournalTab({ entries, people, onChange }: PrayerJournalTabProps) {
  const colors = useColors();
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [showEntryComposer, setShowEntryComposer] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [replyEntryId, setReplyEntryId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [draftDate, setDraftDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [draftTaggedPersonIds, setDraftTaggedPersonIds] = useState<string[]>([]);
  const [draftReply, setDraftReply] = useState("");
  const [draftColor, setDraftColor] = useState<string | undefined>(undefined);
  const [draftLocation, setDraftLocation] = useState("");
  const [draftMood, setDraftMood] = useState<JournalMood | undefined>(undefined);
  const [tagSearch, setTagSearch] = useState("");
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const bodyInputRef = useRef<any>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const wrapSelection = (before: string, after: string) => {
    const { start, end } = selection;
    const selected = draftBody.slice(start, end) || "text";
    const newBody = draftBody.slice(0, start) + before + selected + after + draftBody.slice(end);
    setDraftBody(newBody);
  };

  const prefixLines = (prefix: string) => {
    const { start, end } = selection;
    const beforeCursor = draftBody.slice(0, start);
    const lineStart = beforeCursor.lastIndexOf("\n") + 1;
    const afterCursor = draftBody.slice(end);
    const selectedLines = draftBody.slice(lineStart, end).split("\n");
    const prefixed = selectedLines.map((line) => (line.startsWith(prefix) ? line : prefix + line)).join("\n");
    const newBody = draftBody.slice(0, lineStart) + prefixed + afterCursor;
    setDraftBody(newBody);
  };

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
    setEditingEntryId(null);
    setDraftBody("");
    setDraftTaggedPersonIds([]);
    setDraftColor(undefined);
    setDraftLocation("");
    setDraftMood(undefined);
    setTagSearch("");
  };

  const startEditEntry = (entry: PrayerJournalEntry) => {
    setEditingEntryId(entry.id);
    setDraftBody(entry.body);
    setDraftDate(entry.date);
    setDraftTaggedPersonIds(entry.taggedPeople.map((person) => person.id));
    setDraftColor(entry.color);
    setDraftLocation(entry.location ?? "");
    setDraftMood(entry.mood as JournalMood | undefined);
    setShowEntryComposer(true);
  };

  const handleSaveEntry = () => {
    if (!draftBody.trim()) return;
    const taggedPeople = people.filter((person) => draftTaggedPersonIds.includes(person.id));
    onChange(
      editingEntryId
        ? updatePrayerJournalEntry(entries, editingEntryId, { body: draftBody, date: draftDate, taggedPeople, color: draftColor, location: draftLocation.trim() || undefined, mood: draftMood })
        : createPrayerJournalEntry(entries, { body: draftBody, date: draftDate, taggedPeople, color: draftColor, location: draftLocation.trim() || undefined, mood: draftMood }, createId("journal")),
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    closeEntryComposer();
  };

  const startEditReply = (entryId: string, replyId: string, body: string) => {
    setReplyEntryId(entryId);
    setEditingReplyId(replyId);
    setDraftReply(body);
  };

  const closeReplyComposer = () => {
    setDraftReply("");
    setReplyEntryId(null);
    setEditingReplyId(null);
  };

  const handlePostReply = () => {
    if (!replyTarget || !draftReply.trim()) return;
    onChange(
      editingReplyId
        ? updatePrayerJournalReply(entries, replyTarget.id, editingReplyId, draftReply)
        : addPrayerJournalReply(entries, replyTarget.id, draftReply, createId("reply")),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    closeReplyComposer();
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

  const showEntryActions = (entry: PrayerJournalEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    Alert.alert("Journal entry", "Choose an action", [
      { text: "Cancel", style: "cancel" },
      { text: "Edit", onPress: () => startEditEntry(entry) },
      { text: "Delete", style: "destructive", onPress: () => confirmDeleteEntry(entry) },
    ]);
  };

  const showReplyActions = (entryId: string, replyId: string, body: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    Alert.alert("Journal reply", "Choose an action", [
      { text: "Cancel", style: "cancel" },
      { text: "Edit", onPress: () => startEditReply(entryId, replyId, body) },
      { text: "Delete", style: "destructive", onPress: () => confirmDeleteReply(entryId, replyId) },
    ]);
  };

  const renderEntry = ({ item }: { item: PrayerJournalEntry }) => {
    const isExpanded = expandedEntries.has(item.id);
    const hashtags = extractHashtags(item.body);
    const previewText = item.body.length > 150 && !isExpanded ? item.body.slice(0, 150) + "..." : item.body;
    return (
    <Pressable
      delayLongPress={500}
      onLongPress={() => showEntryActions(item)}
      onPress={() => {
        setExpandedEntries((prev) => {
          const next = new Set(prev);
          if (next.has(item.id)) next.delete(item.id);
          else next.add(item.id);
          return next;
        });
      }}
      style={({ pressed }) => [
        styles.entryCard,
        {
          backgroundColor: item.color ?? colors.surface,
        },
        pressed && styles.longPressed,
      ]}
    >
      <View style={styles.entryTopRow}>
        <Text style={[styles.entryDate, { color: colors.muted }]}>{formatPrayerJournalDate(item.date)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {item.body.length > 150 && (
            <MaterialIcons
              name={isExpanded ? "expand-less" : "expand-more"}
              size={20}
              color={colors.muted}
            />
          )}
          <Text style={[styles.holdHint, { color: colors.muted }]}>Hold for options</Text>
        </View>
      </View>

      <MarkdownText text={previewText} baseColor={colors.foreground} />

      {hashtags.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {hashtags.map((tag) => (
            <View
              key={tag}
              style={{ backgroundColor: colors.primary + "20", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {item.location && (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 4 }}>
          <MaterialIcons name="place" size={14} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>{item.location}</Text>
        </View>
      )}

      {item.mood && (
        <View style={{ marginTop: 8, alignSelf: "flex-start" }}>
          <MoodChip mood={item.mood as JournalMood} small />
        </View>
      )}

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
            <Pressable
              key={reply.id}
              delayLongPress={500}
              onLongPress={() => showReplyActions(item.id, reply.id, reply.body)}
              style={({ pressed }) => [styles.replyCard, { backgroundColor: colors.surface }, pressed && styles.longPressed]}
            >
              <View style={styles.replyTopRow}>
                <Text style={[styles.replyDate, { color: colors.muted }]}>
                  {formatPrayerJournalDate(reply.date)}
                </Text>
                <Text style={[styles.holdHint, { color: colors.muted }]}>Hold</Text>
              </View>
              <Text style={[styles.replyBody, { color: colors.foreground }]}>{reply.body}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>Journal</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{entries.length} entries</Text>
        </View>
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add prayer journal entry"
        onPress={() => setShowEntryComposer(true)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary },
          pressed && styles.primaryPressed,
        ]}
      >
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </Pressable>

      <Modal transparent visible={showEntryComposer} animationType="slide" onRequestClose={closeEntryComposer}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={closeEntryComposer} />
          <SafeAreaView edges={["top", "bottom"]} style={[styles.composerSheet, { backgroundColor: colors.background }]}>
            <View style={[styles.composerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.composerTitle, { color: colors.foreground }]}>New Prayer Entry</Text>
              <Pressable onPress={handleSaveEntry} style={({ pressed }) => [pressed && styles.pressed]}>
                <Text style={[styles.doneText, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>
            <FlatList
              data={people.filter((p) => p.name.toLowerCase().includes(tagSearch.toLowerCase()))}
              keyExtractor={(person) => person.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.composerContent}
              ListHeaderComponent={
                <View>
                  <View style={{ flexDirection: "row", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                    {[
                      { icon: "format-bold", action: () => wrapSelection("**", "**") },
                      { icon: "format-italic", action: () => wrapSelection("*", "*") },
                      { icon: "title", action: () => prefixLines("# ") },
                      { icon: "format-list-bulleted", action: () => prefixLines("- ") },
                      { icon: "format-quote", action: () => prefixLines("> ") },
                    ].map((btn, i) => (
                      <Pressable
                        key={i}
                        onPress={btn.action}
                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}
                      >
                        <MaterialIcons name={btn.icon as any} size={20} color={colors.foreground} />
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    ref={bodyInputRef}
                    value={draftBody}
                    onChangeText={setDraftBody}
                    onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                    placeholder="Write your prayer... (supports **bold**, *italic*, # headers, - lists)"
                    placeholderTextColor={colors.muted}
                    multiline
                    textAlignVertical="top"
                    style={[styles.prayerInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary }]}
                  />
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Entry Date</Text>
                  <DateTimePicker value={draftDate} onChange={setDraftDate} mode="date" label="Entry Date" />
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Color</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                    {[
                      { name: "White", hex: "#FFFFFF" },
                      { name: "Gray", hex: "#6B7280" },
                      { name: "Red", hex: "#EF4444" },
                      { name: "Orange", hex: "#F97316" },
                      { name: "Yellow", hex: "#FBBF24" },
                      { name: "Green", hex: "#10B981" },
                      { name: "Blue", hex: "#3B82F6" },
                      { name: "Purple", hex: "#A855F7" },
                    ].map((color) => {
                      const isSelected = (draftColor ?? "#FFFFFF") === color.hex;
                      return (
                        <Pressable
                          key={color.hex}
                          onPress={() => setDraftColor(color.hex === "#FFFFFF" ? undefined : color.hex)}
                          style={{
                            width: 40, height: 40, borderRadius: 20,
                            backgroundColor: color.hex,
                            borderWidth: isSelected ? 3 : 1,
                            borderColor: isSelected ? colors.primary : colors.border,
                            alignItems: "center", justifyContent: "center",
                          }}
                        >
                          {isSelected && (
                            <MaterialIcons
                              name="check"
                              size={20}
                              color={color.hex === "#FFFFFF" || color.hex === "#FBBF24" ? "#000000" : "#FFFFFF"}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Location (optional)</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 }}>
                    <MaterialIcons name="place" size={20} color={colors.muted} />
                    <TextInput
                      value={draftLocation}
                      onChangeText={setDraftLocation}
                      placeholder="Where were you?"
                      placeholderTextColor={colors.muted}
                      style={{ flex: 1, marginLeft: 8, fontSize: 16, color: colors.foreground }}
                    />
                  </View>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Mood</Text>
                  <View style={{ marginBottom: 16 }}>
                    <MoodPicker value={draftMood} onChange={setDraftMood} />
                  </View>
                  <Text style={[styles.fieldLabel, styles.peopleLabel, { color: colors.foreground }]}>Tag People</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 }}>
                    <MaterialIcons name="search" size={20} color={colors.muted} />
                    <TextInput
                      value={tagSearch}
                      onChangeText={setTagSearch}
                      placeholder="Search people..."
                      placeholderTextColor={colors.muted}
                      style={{ flex: 1, marginLeft: 8, fontSize: 16, color: colors.foreground }}
                    />
                    {tagSearch.length > 0 && (
                      <Pressable onPress={() => setTagSearch("")}>
                        <MaterialIcons name="close" size={20} color={colors.muted} />
                      </Pressable>
                    )}
                  </View>
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
                    style={({ pressed }) => [{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: isSelected ? `${colors.primary}14` : "transparent",
                    }, pressed && { opacity: 0.7 }]}
                  >
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: item.avatarColor || colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}>
                      {item.photoUri ? (
                        <Image source={{ uri: item.photoUri }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                      ) : (
                        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>{item.initials}</Text>
                      )}
                    </View>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, color: colors.foreground }}>
                      {item.name}
                    </Text>
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.primary : colors.muted,
                      backgroundColor: isSelected ? colors.primary : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      {isSelected && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
                    </View>
                  </Pressable>
                );
              }}
              ListFooterComponent={
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 8 }]}>Color</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8, marginBottom: 16 }}>
                    {["#9E9E9E", "#EF4444", "#F97316", "#F59E0B", "#22C55E", "#3B82F6", "#8B5CF6"].map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => setDraftColor(draftColor === c ? undefined : c)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: c,
                          borderWidth: draftColor === c ? 3 : 0,
                          borderColor: colors.foreground,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {draftColor === c && <MaterialIcons name="check" size={20} color="#FFFFFF" />}
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    disabled={!draftBody.trim()}
                    onPress={handleSaveEntry}
                  style={({ pressed }) => [
                    styles.saveEntryButton,
                    { backgroundColor: colors.primary, opacity: draftBody.trim() ? (pressed ? 0.82 : 1) : 0.22 },
                  ]}
                >
                  <Text style={styles.saveEntryButtonText}>Save Entry</Text>
                  </Pressable>
                </View>
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
            onPress={closeReplyComposer}
          />
          <SafeAreaView edges={["top", "bottom"]} style={[styles.replySheet, { backgroundColor: colors.background }]}>
            <View style={[styles.composerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.composerTitle, { color: colors.foreground }]}>Reply to Entry</Text>
              <Pressable
                onPress={closeReplyComposer}
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
  fab: {
    position: "absolute",
    right: 15,
    bottom: 60,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3E226B",
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    zIndex: 12,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 90, paddingBottom: 140 },
  emptyListContent: { flexGrow: 1 },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: "700", marginTop: 18, marginBottom: 8, marginLeft: 4 },
  entryCard: { borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  entryTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  entryDate: { fontSize: 14, lineHeight: 19, fontWeight: "700" },
  holdHint: { fontSize: 11, lineHeight: 15, fontWeight: "600", opacity: 0.78 },
  longPressed: { opacity: 0.78 },
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
  composerSheet: { height: "92%", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
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
  prayerInput: { minHeight: 150, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomWidth: 1, padding: 16, fontSize: 17, lineHeight: 24 },
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
