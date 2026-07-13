import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { format12HourTime } from "@/lib/utils";

interface DateTimePickerProps {
  value: string; // ISO date string or time string (HH:mm)
  onChange: (value: string) => void;
  mode: "date" | "time";
  label: string;
}

export function DateTimePicker({
  value,
  onChange,
  mode,
  label,
}: DateTimePickerProps) {
  const colors = useColors();
  const [showPicker, setShowPicker] = useState(false);

  const formatDisplay = () => {
    if (mode === "date") {
      if (!value) return "Select date";
      const date = new Date(value);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } else {
      return value ? format12HourTime(value) : "Select time";
    }
  };

  const handleDateChange = (day: number, month: number, year: number) => {
    // Use local timezone instead of UTC to avoid date shift
    const date = new Date(year, month, day);
    const isoString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    onChange(isoString);
    setShowPicker(false);
  };

  const handleTimeChange = (hour: number, minute: number) => {
    const timeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    onChange(timeString);
    setShowPicker(false);
  };

  const renderDatePicker = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const months = Array.from({ length: 12 }, (_, i) => i);
    const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

    return (
      <View style={[pickerStyles.container, { backgroundColor: colors.background }]}>
        <View style={[pickerStyles.header, { borderBottomColor: colors.border }]}>
          <Text style={[pickerStyles.headerText, { color: colors.foreground }]}>
            {label}
          </Text>
          <Pressable onPress={() => setShowPicker(false)}>
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={pickerStyles.pickerRow}>
          <ScrollView style={pickerStyles.column}>
            {months.map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  const selectedDate = value ? new Date(value) : new Date();
                  handleDateChange(
                    selectedDate.getDate(),
                    m,
                    selectedDate.getFullYear()
                  );
                }}
                style={pickerStyles.pickerItem}
              >
                <Text
                  style={[
                    pickerStyles.pickerItemText,
                    { color: colors.foreground },
                  ]}
                >
                  {new Date(2024, m).toLocaleString("en-US", { month: "short" })}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView style={pickerStyles.column}>
            {days.map((d) => (
              <Pressable
                key={d}
                onPress={() => {
                  const selectedDate = value ? new Date(value) : new Date();
                  handleDateChange(
                    d,
                    selectedDate.getMonth(),
                    selectedDate.getFullYear()
                  );
                }}
                style={pickerStyles.pickerItem}
              >
                <Text
                  style={[
                    pickerStyles.pickerItemText,
                    { color: colors.foreground },
                  ]}
                >
                  {String(d).padStart(2, "0")}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView style={pickerStyles.column}>
            {years.map((y) => (
              <Pressable
                key={y}
                onPress={() => {
                  const selectedDate = value ? new Date(value) : new Date();
                  handleDateChange(
                    selectedDate.getDate(),
                    selectedDate.getMonth(),
                    y
                  );
                }}
                style={pickerStyles.pickerItem}
              >
                <Text
                  style={[
                    pickerStyles.pickerItemText,
                    { color: colors.foreground },
                  ]}
                >
                  {y}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={[pickerStyles.footer, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => setShowPicker(false)}
            style={[pickerStyles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={[pickerStyles.buttonText, { color: colors.background }]}>
              Done
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderTimePicker = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
      <View style={[pickerStyles.container, { backgroundColor: colors.background }]}>
        <View style={[pickerStyles.header, { borderBottomColor: colors.border }]}>
          <Text style={[pickerStyles.headerText, { color: colors.foreground }]}>
            {label}
          </Text>
          <Pressable onPress={() => setShowPicker(false)}>
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={pickerStyles.pickerRow}>
          <ScrollView style={pickerStyles.column}>
            {hours.map((h) => {
              const period = h >= 12 ? 'PM' : 'AM';
              const displayHour = h % 12 || 12;
              return (
                <Pressable
                  key={h}
                  onPress={() => {
                    const currentMinute = value
                      ? parseInt(value.split(":")[1] || "0")
                      : 0;
                    handleTimeChange(h, currentMinute);
                  }}
                  style={pickerStyles.pickerItem}
                >
                  <Text
                    style={[
                      pickerStyles.pickerItemText,
                      { color: colors.foreground },
                    ]}
                  >
                    {displayHour} {period}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[pickerStyles.separator, { color: colors.foreground }]}>
            :
          </Text>

          <ScrollView style={pickerStyles.column}>
            {minutes.map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  const currentHour = value ? parseInt(value.split(":")[0] || "0") : 0;
                  handleTimeChange(currentHour, m);
                }}
                style={pickerStyles.pickerItem}
              >
                <Text
                  style={[
                    pickerStyles.pickerItemText,
                    { color: colors.foreground },
                  ]}
                >
                  {String(m).padStart(2, "0")}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={[pickerStyles.footer, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => setShowPicker(false)}
            style={[pickerStyles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={[pickerStyles.buttonText, { color: colors.background }]}>
              Done
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[
          pickerStyles.input,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <MaterialIcons
          name={mode === "date" ? "calendar-today" : "schedule"}
          size={20}
          color={colors.muted}
        />
        <Text
          style={[
            pickerStyles.inputText,
            { color: value ? colors.foreground : colors.muted },
          ]}
        >
          {formatDisplay()}
        </Text>
      </Pressable>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={pickerStyles.modalOverlay}>
          {mode === "date" ? renderDatePicker() : renderTimePicker()}
        </View>
      </Modal>
    </>
  );
}

const pickerStyles = StyleSheet.create({
  input: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  inputText: {
    fontSize: 14,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
  },
  pickerRow: {
    flexDirection: "row",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  column: {
    flex: 1,
    maxHeight: 200,
  },
  pickerItem: {
    paddingVertical: 12,
    alignItems: "center",
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  separator: {
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
