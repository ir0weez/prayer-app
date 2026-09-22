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
  compact?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  mode,
  label,
  compact = false,
}: DateTimePickerProps) {
  const colors = useColors();
  const [showPicker, setShowPicker] = useState(false);
  const [draftValue, setDraftValue] = useState(value);

  const formatDisplay = () => {
    if (mode === "date") {
      if (!value) return "Select date";
      // Parse ISO date string (YYYY-MM-DD) without timezone conversion
      const [year, month, day] = value.split('-');
      if (year && month && day) {
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      return "Select date";
    } else {
      return value ? format12HourTime(value) : "Select time";
    }
  };

  const getCompactDateParts = () => {
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return null;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return {
      monthDay: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      year,
    };
  };

  const handleDateChange = (day: number, month: number, year: number) => {
    // Use local timezone instead of UTC to avoid date shift
    const date = new Date(year, month, day);
    const isoString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setDraftValue(isoString);
  };

  const handleTimeChange = (hour: number, minute: number) => {
    const timeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    setDraftValue(timeString);
  };

  const renderDatePicker = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const months = Array.from({ length: 12 }, (_, i) => i);
    // Keep the full 1900s available while still allowing forward planning.
    const years = Array.from({ length: currentYear + 10 - 1900 + 1 }, (_, i) => 1900 + i);

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
                  // Parse ISO date string (YYYY-MM-DD) without timezone conversion
                  let selectedDate;
                  if (draftValue && draftValue.includes('-')) {
                    const [year, month, day] = draftValue.split('-');
                    selectedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  } else {
                    selectedDate = new Date();
                  }
                  handleDateChange(
                    selectedDate.getDate(),
                    m,
                    selectedDate.getFullYear()
                  );
                }}
                style={[
                  pickerStyles.pickerItem,
                  draftValue && draftValue.includes('-') &&
                    parseInt(draftValue.split('-')[1] || '0', 10) - 1 === m &&
                    [pickerStyles.selectedPickerItem, { backgroundColor: colors.primary }],
                ]}
              >
                <Text
                  style={[
                    pickerStyles.pickerItemText,
                    { color: colors.foreground },
                    draftValue && draftValue.includes('-') &&
                      parseInt(draftValue.split('-')[1] || '0', 10) - 1 === m &&
                      { color: colors.background, fontWeight: '800' },
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
                  // Parse ISO date string (YYYY-MM-DD) without timezone conversion
                  let selectedDate;
                  if (draftValue && draftValue.includes('-')) {
                    const [year, month, day] = draftValue.split('-');
                    selectedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  } else {
                    selectedDate = new Date();
                  }
                  handleDateChange(
                    d,
                    selectedDate.getMonth(),
                    selectedDate.getFullYear()
                  );
                }}
                style={[
                  pickerStyles.pickerItem,
                  draftValue && draftValue.includes('-') &&
                    parseInt(draftValue.split('-')[2] || '0', 10) === d &&
                    [pickerStyles.selectedPickerItem, { backgroundColor: colors.primary }],
                ]}
              >
                <Text
                  style={[
                    pickerStyles.pickerItemText,
                    { color: colors.foreground },
                    draftValue && draftValue.includes('-') &&
                      parseInt(draftValue.split('-')[2] || '0', 10) === d &&
                      { color: colors.background, fontWeight: '800' },
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
                  // Parse ISO date string (YYYY-MM-DD) without timezone conversion
                  let selectedDate;
                  if (draftValue && draftValue.includes('-')) {
                    const [year, month, day] = draftValue.split('-');
                    selectedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  } else {
                    selectedDate = new Date();
                  }
                  handleDateChange(
                    selectedDate.getDate(),
                    selectedDate.getMonth(),
                    y
                  );
                }}
                style={[
                  pickerStyles.pickerItem,
                  draftValue && draftValue.includes('-') &&
                    parseInt(draftValue.split('-')[0] || '0', 10) === y &&
                    [pickerStyles.selectedPickerItem, { backgroundColor: colors.primary }],
                ]}
              >
                <Text
                  style={[
                    pickerStyles.pickerItemText,
                    { color: colors.foreground },
                    draftValue && draftValue.includes('-') &&
                      parseInt(draftValue.split('-')[0] || '0', 10) === y &&
                      { color: colors.background, fontWeight: '800' },
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
            onPress={() => { onChange(draftValue); setShowPicker(false); }}
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
                    const currentMinute = draftValue
                      ? parseInt(draftValue.split(":")[1] || "0")
                      : 0;
                    handleTimeChange(h, currentMinute);
                  }}
                  style={[
                    pickerStyles.pickerItem,
                    draftValue && parseInt(draftValue.split(':')[0] || '0', 10) === h &&
                      [pickerStyles.selectedPickerItem, { backgroundColor: colors.primary }],
                  ]}
                >
                  <Text
                    style={[
                      pickerStyles.pickerItemText,
                      { color: colors.foreground },
                      draftValue && parseInt(draftValue.split(':')[0] || '0', 10) === h &&
                        { color: colors.background, fontWeight: '800' },
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
                  const currentHour = draftValue ? parseInt(draftValue.split(":")[0] || "0") : 0;
                  handleTimeChange(currentHour, m);
                }}
                style={[
                  pickerStyles.pickerItem,
                  draftValue && parseInt(draftValue.split(':')[1] || '0', 10) === m &&
                    [pickerStyles.selectedPickerItem, { backgroundColor: colors.primary }],
                ]}
              >
                <Text
                  style={[
                    pickerStyles.pickerItemText,
                    { color: colors.foreground },
                    draftValue && parseInt(draftValue.split(':')[1] || '0', 10) === m &&
                      { color: colors.background, fontWeight: '800' },
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
            onPress={() => { onChange(draftValue); setShowPicker(false); }}
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
        onPress={() => {
          setDraftValue(value);
          setShowPicker(true);
        }}
        style={[
          pickerStyles.input,
          compact
            ? { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 0, borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent', marginBottom: 0, paddingHorizontal: 0, paddingVertical: 0, borderRadius: 0 }
            : { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        {compact && mode === "date" ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '500' }}>
              {getCompactDateParts()?.monthDay ?? 'Select date'}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '500' }}>
              {getCompactDateParts()?.year ?? ''}
            </Text>
          </View>
        ) : (
          <>
            <MaterialIcons
              name={mode === "date" ? "calendar-today" : "schedule"}
              size={20}
              color={colors.muted}
            />
            <Text
              style={[
                pickerStyles.inputText,
                { color: value ? colors.foreground : colors.muted, fontSize: compact ? 13 : 14, fontWeight: compact ? "700" : "400" },
              ]}
            >
              {formatDisplay()}
            </Text>
          </>
        )}
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
  selectedPickerItem: {
    borderRadius: 10,
    marginHorizontal: 4,
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
