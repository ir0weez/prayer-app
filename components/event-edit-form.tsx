import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { ScheduleEvent } from "@/lib/schedule-data";
import { DateTimePicker } from "./date-time-picker";

interface EventEditFormProps {
  event: ScheduleEvent;
  visible: boolean;
  onClose: () => void;
  onSave: (updatedEvent: ScheduleEvent) => void;
}

export function EventEditForm({
  event,
  visible,
  onClose,
  onSave,
}: EventEditFormProps) {
  const colors = useColors();
  const [formTitle, setFormTitle] = useState(event.title);
  const [formDate, setFormDate] = useState(event.date);
  const [formStartTime, setFormStartTime] = useState(event.startTime || "");
  const [formEndTime, setFormEndTime] = useState(event.endTime || "");
  const [formLocation, setFormLocation] = useState(event.location || "");
  const [formNotes, setFormNotes] = useState(event.notes || "");
  const [formColor, setFormColor] = useState(event.color || "#0a7ea4");

  const handleSave = () => {
    const updatedEvent: ScheduleEvent = {
      ...event,
      title: formTitle.trim(),
      date: formDate,
      startTime: formStartTime || undefined,
      endTime: formEndTime || undefined,
      location: formLocation || undefined,
      notes: formNotes || undefined,
      color: formColor,
    };
    onSave(updatedEvent);
    onClose();
  };

  const handleReset = () => {
    setFormTitle(event.title);
    setFormDate(event.date);
    setFormStartTime(event.startTime || "");
    setFormEndTime(event.endTime || "");
    setFormLocation(event.location || "");
    setFormNotes(event.notes || "");
    setFormColor(event.color || "#0a7ea4");
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <MaterialIcons name="close" size={28} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Edit Event
          </Text>
          <Pressable onPress={handleSave}>
            <Text style={[styles.saveButton, { color: colors.primary }]}>
              Save
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={[styles.label, { color: colors.muted }]}>TITLE</Text>
          <TextInput
            value={formTitle}
            onChangeText={setFormTitle}
            placeholder="Event title"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              { color: colors.foreground, borderColor: colors.border },
            ]}
          />

          {/* Date */}
          <Text style={[styles.label, { color: colors.muted }]}>DATE</Text>
          <DateTimePicker
            value={formDate}
            onChange={setFormDate}
            mode="date"
            label="Select Date"
          />

          {/* Start Time */}
          <Text style={[styles.label, { color: colors.muted }]}>
            START TIME (optional)
          </Text>
          <DateTimePicker
            value={formStartTime}
            onChange={setFormStartTime}
            mode="time"
            label="Select Start Time"
          />

          {/* End Time */}
          <Text style={[styles.label, { color: colors.muted }]}>
            END TIME (optional)
          </Text>
          <DateTimePicker
            value={formEndTime}
            onChange={setFormEndTime}
            mode="time"
            label="Select End Time"
          />

          {/* Location */}
          <Text style={[styles.label, { color: colors.muted }]}>
            LOCATION (optional)
          </Text>
          <TextInput
            value={formLocation}
            onChangeText={setFormLocation}
            placeholder="Event location"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              { color: colors.foreground, borderColor: colors.border },
            ]}
          />

          {/* Notes */}
          <Text style={[styles.label, { color: colors.muted }]}>
            NOTES (optional)
          </Text>
          <TextInput
            value={formNotes}
            onChangeText={setFormNotes}
            placeholder="Add notes about this event"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                minHeight: 80,
                textAlignVertical: "top",
              },
            ]}
            multiline
            numberOfLines={4}
          />

          {/* Color */}
          <Text style={[styles.label, { color: colors.muted }]}>COLOR</Text>
          <View style={styles.colorGrid}>
            {[
              "#0a7ea4",
              "#6366F1",
              "#EC4899",
              "#F59E0B",
              "#10B981",
              "#8B5CF6",
            ].map((color) => (
              <Pressable
                key={color}
                onPress={() => setFormColor(color)}
                style={[
                  styles.colorOption,
                  {
                    backgroundColor: color,
                    borderWidth: formColor === color ? 3 : 0,
                    borderColor: colors.foreground,
                  },
                ]}
              />
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleReset}
              style={[
                styles.button,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.foreground }]}>
                Reset
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.button, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
                Save Changes
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingTop: 40,
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
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
