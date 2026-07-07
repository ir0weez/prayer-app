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
  onToggle?: () => void;
}

export function MinistryDetailCard({
  ministry,
  people = [],
  visible,
  onClose,
  onEdit,
  onToggle,
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
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {onToggle && (
                <Pressable
                  onPress={() => {
                    onToggle();
                    onClose();
                  }}
                  style={({ pressed }) => [{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    opacity: pressed ? 0.8 : 1,
                  }]}
                >
                  <MaterialIcons name="check" size={18} color="#FFFFFF" />
                </Pressable>
              )}
              {onEdit && (
                <Pressable onPress={() => setEditFormVisible(true)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                  <MaterialIcons name="edit" size={22} color={colors.primary} />
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: 24 }}
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
    borderRadius: 24,
    borderWidth: 1,
    maxHeight: "85%",
    width: "100%",
    maxWidth: 440,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    flex: 1,
    textAlign: "left",
    marginHorizontal: 12,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
  },
  peopleList: {
    gap: 12,
    marginTop: 8,
  },
  personItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 8,
  },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  personInitial: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  personName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
});
