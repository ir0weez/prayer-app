import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Modal } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";

interface BibleStudyDay {
  dayName: string;
  date: string;
  book: string;
  chapter: number;
}

interface BibleStudyDaySelectorProps {
  days: BibleStudyDay[];
  selectedDay: string | null;
  onDaySelect: (dayName: string) => void;
  currentStudy: string;
}

export function BibleStudyDaySelector({
  days,
  selectedDay,
  onDaySelect,
  currentStudy,
}: BibleStudyDaySelectorProps) {
  const colors = useColors();
  const [showDropdown, setShowDropdown] = useState(false);

  if (days.length === 0) {
    return (
      <Text style={{ fontWeight: "700" }}>
        <MaterialIcons name="school" size={16} color={colors.foreground} /> {currentStudy}
      </Text>
    );
  }

  // Get the display day name (selected or first/most recent)
  const displayDay = selectedDay || days[0]?.dayName || "Monday";

  return (
    <>
      <Pressable
        onPress={() => setShowDropdown(true)}
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.7 : 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          },
        ]}
      >
        <MaterialIcons name="school" size={16} color={colors.foreground} />
        <Text
          style={{
            fontWeight: "700",
            color: colors.foreground,
            borderBottomWidth: 1,
            
            borderBottomColor: colors.primary,
            paddingBottom: 2,
          }}
        >
          {displayDay}
        </Text>
        <Text style={{ fontWeight: "700", color: colors.foreground, marginLeft: 4 }}>
          {currentStudy}
        </Text>
      </Pressable>

      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setShowDropdown(false)}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 16,
              maxWidth: "80%",
              maxHeight: "60%",
              borderColor: colors.border,
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.foreground,
                marginBottom: 12,
              }}
            >
              Select Bible Study Day
            </Text>

            <ScrollView
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={true}
            >
              {days.map((day) => (
                <Pressable
                  key={day.dayName}
                  onPress={() => {
                    onDaySelect(day.dayName);
                    setShowDropdown(false);
                  }}
                  style={({ pressed }) => [
                    {
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      marginVertical: 4,
                      borderRadius: 8,
                      backgroundColor:
                        selectedDay === day.dayName
                          ? colors.primary + "20"
                          : "transparent",
                      borderWidth: selectedDay === day.dayName ? 1 : 0,
                      borderColor:
                        selectedDay === day.dayName ? colors.primary : "transparent",
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.foreground,
                      fontWeight: selectedDay === day.dayName ? "600" : "400",
                      fontSize: 14,
                    }}
                  >
                    {day.dayName}: {day.book} {day.chapter}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
