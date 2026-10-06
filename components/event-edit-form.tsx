import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useColors } from "@/hooks/use-colors";
import { ScheduleEvent } from "@/lib/schedule-data";
import { extractPosterColor } from "@/lib/poster-color";
import { DateTimePicker } from "./date-time-picker";

function addHourToTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const total = Math.min(hours * 60 + minutes + 60, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

interface EventEditFormProps {
  event: ScheduleEvent;
  visible: boolean;
  onClose: () => void;
  onSave: (updatedEvent: ScheduleEvent) => void;
  isNew?: boolean;
}

export function EventEditForm({
  event,
  visible,
  onClose,
  onSave,
  isNew = false,
}: EventEditFormProps) {
  const colors = useColors();
  const [formTitle, setFormTitle] = useState(event.title);
  const [formDate, setFormDate] = useState(event.date);
  const [formStartTime, setFormStartTime] = useState(event.startTime || "");
  const [formEndTime, setFormEndTime] = useState(event.endTime || "");
  const [formReminderMinutesBefore, setFormReminderMinutesBefore] = useState(event.reminderMinutesBefore ?? 0);
  const [formLocation, setFormLocation] = useState(event.location || "");
  const [formTravelTime, setFormTravelTime] = useState(event.travelTimeMinutes ? String(event.travelTimeMinutes) : "");
  const [formNotes, setFormNotes] = useState(event.notes || "");
  const [formColor, setFormColor] = useState(event.color || "#6B7280");
  const [formOffEvent, setFormOffEvent] = useState(event.isOffEvent === true);
  const [formPosterImage, setFormPosterImage] = useState(event.posterImageUri || "");
  const [formPosterColor, setFormPosterColor] = useState(event.posterColor);

  useEffect(() => {
    if (!visible) return;
    setFormTitle(event.title);
    setFormDate(event.date);
    setFormStartTime(event.startTime || "");
    setFormEndTime(event.endTime || "");
    setFormReminderMinutesBefore(event.reminderMinutesBefore ?? 0);
    setFormLocation(event.location || "");
    setFormTravelTime(event.travelTimeMinutes ? String(event.travelTimeMinutes) : "");
    setFormNotes(event.notes || "");
    setFormColor(event.color || "#6B7280");
    setFormOffEvent(event.isOffEvent === true);
    setFormPosterImage(event.posterImageUri || "");
    setFormPosterColor(event.posterColor);
  }, [event, visible]);

  const handleStartTimeChange = (value: string) => {
    setFormStartTime(value);
    if (!formEndTime && value) setFormEndTime(addHourToTime(value));
  };

  const handleSave = () => {
    const updatedEvent: ScheduleEvent = {
      ...event,
      title: formTitle.trim(),
      date: formDate,
      startTime: formStartTime || undefined,
      endTime: formEndTime || undefined,
      reminderMinutesBefore: formStartTime ? formReminderMinutesBefore : undefined,
      travelTimeMinutes: formTravelTime ? parseInt(formTravelTime, 10) || undefined : undefined,
      location: formLocation || undefined,
      notes: formNotes || undefined,
      color: formColor,
      isOffEvent: formOffEvent,
      posterImageUri: formPosterImage || undefined,
      posterColor: formPosterColor,
    };
    onSave(updatedEvent);
    onClose();
  };

  const handleReset = () => {
    setFormTitle(event.title);
    setFormDate(event.date);
    setFormStartTime(event.startTime || "");
    setFormEndTime(event.endTime || "");
    setFormReminderMinutesBefore(event.reminderMinutesBefore ?? 0);
    setFormLocation(event.location || "");
    setFormTravelTime(event.travelTimeMinutes ? String(event.travelTimeMinutes) : "");
    setFormNotes(event.notes || "");
    setFormColor(event.color || "#6B7280");
    setFormOffEvent(event.isOffEvent === true);
    setFormPosterImage(event.posterImageUri || "");
    setFormPosterColor(event.posterColor);
  };

  const pickPoster = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;
    setFormPosterImage(uri);
    setFormPosterColor(await extractPosterColor(uri, formColor));
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
            {isNew ? "New Event" : "Edit Event"}
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

          <View style={[styles.offEventRow, { borderColor: formColor + "45", backgroundColor: formColor + "10" }]}>
            <View style={styles.offEventCopy}>
              <Text style={[styles.label, { color: colors.foreground, marginTop: 0, marginBottom: 2 }]}>OFF EVENT</Text>
              <Text style={[styles.offEventHint, { color: colors.muted }]}>Show this event only on time-off days</Text>
            </View>
            <Switch value={formOffEvent} onValueChange={setFormOffEvent} trackColor={{ false: colors.border, true: formColor }} thumbColor="#FFFFFF" />
          </View>

          {formOffEvent && (
            <Pressable onPress={pickPoster} style={[styles.posterPicker, { borderColor: formColor, backgroundColor: formColor + "10" }]}>
              {formPosterImage ? <Image source={{ uri: formPosterImage }} style={styles.posterImage} contentFit="cover" /> : <><MaterialIcons name="add-photo-alternate" size={32} color={formColor} /><Text style={[styles.posterPrompt, { color: formColor }]}>Add poster</Text></>}
            </Pressable>
          )}

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
            onChange={handleStartTimeChange}
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

          <Text style={[styles.label, { color: colors.muted }]}>REMIND ME BEFORE</Text>
          <View style={styles.reminderOptions}>
            {[0, 5, 15, 30, 60].map((minutes) => (
              <Pressable
                key={minutes}
                onPress={() => setFormReminderMinutesBefore(minutes)}
                style={[
                  styles.reminderOption,
                  {
                    borderColor: formReminderMinutesBefore === minutes ? colors.primary : colors.border,
                    backgroundColor: formReminderMinutesBefore === minutes ? `${colors.primary}18` : colors.surface,
                  },
                ]}
              >
                <Text style={{ color: formReminderMinutesBefore === minutes ? colors.primary : colors.foreground, fontWeight: "700", fontSize: 12 }}>
                  {minutes === 0 ? "At start" : `${minutes} min`}
                </Text>
              </Pressable>
            ))}
          </View>

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

          {/* Time to leave */}
          <Text style={[styles.label, { color: colors.muted }]}>
            TIME TO LEAVE (minutes, optional)
          </Text>
          <TextInput
            value={formTravelTime}
            onChangeText={setFormTravelTime}
            placeholder="e.g. 15"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
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
              "#6B7280",
              "#EF4444",
              "#F97316",
              "#FBBF24",
              "#10B981",
              "#3B82F6",
              "#A855F7",
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
  offEventRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  offEventCopy: { flex: 1, paddingRight: 12 },
  offEventHint: { fontSize: 12 },
  posterPicker: {
    height: 120,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: 12,
  },
  posterImage: { width: "100%", height: "100%" },
  posterPrompt: { fontWeight: "700", marginTop: 6 },
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
  reminderOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  reminderOption: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
