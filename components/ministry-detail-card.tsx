import { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
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

const formatTime12Hour = (time: string): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
};

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

  const screenHeight = Dimensions.get("window").height;
  const sheetHeight = screenHeight * 0.85;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.4)" }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              height: sheetHeight,
              borderTopColor: colors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {ministry.title}
              </Text>
              {ministry.bibleBook && (
                <Text style={[styles.subtitle, { color: colors.muted }]}>
                  {ministry.bibleBook}
                </Text>
              )}
            </View>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={28} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {onToggle && (
              <Pressable
                onPress={() => {
                  onToggle();
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.checkButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <MaterialIcons name="check" size={20} color="#FFFFFF" />
                <Text style={styles.checkButtonText}>Mark Complete</Text>
              </Pressable>
            )}
            {onEdit && (
              <Pressable
                onPress={() => setEditFormVisible(true)}
                style={({ pressed }) => [
                  styles.editButton,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <MaterialIcons name="edit" size={20} color={colors.primary} />
                <Text style={[styles.editButtonText, { color: colors.primary }]}>
                  Edit
                </Text>
              </Pressable>
            )}
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Type */}
            {ministry.type && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                  TYPE
                </Text>
                <Text style={[styles.sectionValue, { color: colors.foreground }]}>
                  {ministry.type}
                </Text>
              </View>
            )}

            {/* Date */}
            {ministry.date && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                  DATE
                </Text>
                <Text style={[styles.sectionValue, { color: colors.foreground }]}>
                  {new Date(ministry.date).toLocaleDateString("en-US", {
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
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                  TIME
                </Text>
                <Text style={[styles.sectionValue, { color: colors.foreground }]}>
                  {formatTime12Hour(ministry.startTime)}
                  {ministry.endTime ? ` – ${formatTime12Hour(ministry.endTime)}` : ""}
                </Text>
              </View>
            )}

            {/* Location */}
            {ministry.location && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                  LOCATION
                </Text>
                <Text style={[styles.sectionValue, { color: colors.foreground }]}>
                  {ministry.location}
                </Text>
              </View>
            )}

            {/* People */}
            {linkedPeople.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                  PEOPLE ({linkedPeople.length})
                </Text>
                <View style={styles.peopleList}>
                  {linkedPeople.map((person) => (
                    <View key={person.id} style={styles.personItem}>
                      {person.photoUri ? (
                        <Image
                          source={{ uri: person.photoUri }}
                          style={styles.personAvatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.personAvatar,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Text style={styles.personInitial}>
                            {person.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.personName, { color: colors.foreground }]}>
                        {person.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {editFormVisible && (
            <MinistryEditForm
              ministry={ministry}
              visible={editFormVisible}
              onClose={() => setEditFormVisible(false)}
              onSave={(updated) => {
                onEdit?.(updated);
                setEditFormVisible(false);
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  checkButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  checkButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  sectionValue: {
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 26,
  },
  peopleList: {
    gap: 12,
    marginTop: 8,
  },
  personItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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
