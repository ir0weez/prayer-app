import React, { useState } from "react";
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
import { MinistryEditForm } from "./ministry-edit-form";

interface MinistryDetailCardProps {
  ministry: ScheduleMinistry;
  people?: Person[];
  visible: boolean;
  onClose: () => void;
  onEdit?: (updatedMinistry: ScheduleMinistry) => void;
}

export function MinistryDetailCard({
  ministry,
  people = [],
  visible,
  onClose,
  onEdit,
}: MinistryDetailCardProps) {
  const colors = useColors();
  const [editFormVisible, setEditFormVisible] = useState(false);

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
              backgroundColor: colors.surface,
              borderColor: colors.border,
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
            {onEdit && (
              <Pressable onPress={() => setEditFormVisible(true)}>
                <MaterialIcons name="edit" size={24} color={colors.primary} />
              </Pressable>
            )}
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
                <Text style={[styles.sectionContent, { color: colors.foreground }]}>
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
                <Text style={[styles.sectionContent, { color: colors.foreground }]}>
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
                <Text style={[styles.sectionContent, { color: colors.foreground }]}>
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
                <Text style={[styles.sectionContent, { color: colors.foreground }]}>
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
                <Text style={[styles.sectionContent, { color: colors.foreground }]}>
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
                <Text style={[styles.sectionContent, { color: colors.foreground }]}>
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
                <Text style={[styles.sectionContent, { color: colors.foreground }]}>
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
      {onEdit && (
        <MinistryEditForm
          ministry={ministry}
          visible={editFormVisible}
          onClose={() => setEditFormVisible(false)}
          onSave={(updatedMinistry: ScheduleMinistry) => {
            onEdit(updatedMinistry);
            setEditFormVisible(false);
          }}
        />
      )}
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
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: "85%",
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.15)",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  peopleList: {
    gap: 14,
    marginTop: 4,
  },
  personItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 4,
  },
  personAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  personInitial: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  personName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
});
