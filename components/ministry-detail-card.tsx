import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { ScheduleMinistry } from "@/lib/schedule-data";
import { Person } from "@/lib/prayercircle-data";

interface MinistryDetailCardProps {
  ministry: ScheduleMinistry;
  people?: Person[];
  visible: boolean;
  onClose: () => void;
}

export function MinistryDetailCard({
  ministry,
  people = [],
  visible,
  onClose,
}: MinistryDetailCardProps) {
  const colors = useColors();

  const linkedPeople = ministry.linkedPeopleIds
    ? ministry.linkedPeopleIds
        .map((id) => people.find((p) => p.id === id))
        .filter((p) => p !== undefined) as Person[]
    : [];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: ministry.color || colors.surface,
              borderColor: ministry.color ? ministry.color + "40" : colors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={28} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {ministry.title}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Type */}
            {ministry.type && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons
                    name="category"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.sectionTitle, { color: colors.foreground }]}
                  >
                    Type
                  </Text>
                </View>
                <Text style={[styles.sectionContent, { color: colors.muted }]}>
                  {ministry.type}
                </Text>
              </View>
            )}

            {/* Date */}
            {ministry.date && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.sectionTitle, { color: colors.foreground }]}
                  >
                    Date
                  </Text>
                </View>
                <Text style={[styles.sectionContent, { color: colors.muted }]}>
                  {new Date(ministry.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            )}

            {/* Due Date */}
            {ministry.dueDate && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons
                    name="event-available"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.sectionTitle, { color: colors.foreground }]}
                  >
                    Due Date
                  </Text>
                </View>
                <Text style={[styles.sectionContent, { color: colors.muted }]}>
                  {new Date(ministry.dueDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            )}

            {/* Time */}
            {ministry.startTime && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons
                    name="schedule"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.sectionTitle, { color: colors.foreground }]}
                  >
                    Time
                  </Text>
                </View>
                <Text style={[styles.sectionContent, { color: colors.muted }]}>
                  {ministry.startTime}
                  {ministry.endTime ? ` – ${ministry.endTime}` : ""}
                </Text>
              </View>
            )}

            {/* Location */}
            {ministry.location && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons
                    name="location-on"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.sectionTitle, { color: colors.foreground }]}
                  >
                    Location
                  </Text>
                </View>
                <Text style={[styles.sectionContent, { color: colors.muted }]}>
                  {ministry.location}
                </Text>
              </View>
            )}

            {/* Notes */}
            {ministry.notes && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons
                    name="notes"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.sectionTitle, { color: colors.foreground }]}
                  >
                    Notes
                  </Text>
                </View>
                <Text style={[styles.sectionContent, { color: colors.muted }]}>
                  {ministry.notes}
                </Text>
              </View>
            )}

            {/* Bible Book */}
            {ministry.bibleBook && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons
                    name="book"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.sectionTitle, { color: colors.foreground }]}
                  >
                    Bible Book
                  </Text>
                </View>
                <Text style={[styles.sectionContent, { color: colors.muted }]}>
                  {ministry.bibleBook}
                </Text>
              </View>
            )}

            {/* Linked People */}
            {linkedPeople.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons
                    name="people"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.sectionTitle, { color: colors.foreground }]}
                  >
                    People ({linkedPeople.length})
                  </Text>
                </View>
                <View style={styles.peopleList}>
                  {linkedPeople.map((person) => (
                    <View key={person.id} style={styles.personItem}>
                      <View
                        style={[
                          styles.personAvatar,
                          {
                            backgroundColor: person.avatarColor || colors.primary,
                          },
                        ]}
                      >
                        <Text style={styles.personInitial}>
                          {person.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        style={[styles.personName, { color: colors.foreground }]}
                      >
                        {person.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: "80%",
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  peopleList: {
    gap: 12,
  },
  personItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  personInitial: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  personName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});
