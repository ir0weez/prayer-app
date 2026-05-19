import { Pressable, View, Text, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Person } from "@/lib/prayercircle-data";

interface DraggablePersonCardProps {
  person: Person;
  index: number;
  totalCount: number;
  isDragged: boolean;
  onLongPress: (personId: string) => void;
  onPress: (person: Person) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCancel: () => void;
  renderAvatar: (person: Person, size: number) => React.ReactNode;
  getBirthdayText: (person: Person) => string;
  daysSince: number;
  reachColor: string;
  reachText: string;
  reachProgress: number;
  styles: any;
}

export function DraggablePersonCard({
  person,
  index,
  totalCount,
  isDragged,
  onLongPress,
  onPress,
  onMoveUp,
  onMoveDown,
  onCancel,
  renderAvatar,
  getBirthdayText,
  daysSince,
  reachColor,
  reachText,
  reachProgress,
  styles,
}: DraggablePersonCardProps) {
  return (
    <View style={[isDragged && { opacity: 0.6 }]}>
      <Pressable
        onLongPress={() => {
          onLongPress(person.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        onPress={() => !isDragged && onPress(person)}
        style={({ pressed }) => [
          styles.personCard,
          pressed && !isDragged && styles.pressed,
          isDragged && { backgroundColor: "#F0E8FF" },
        ]}
      >
        {renderAvatar(person, 44)}
        <View style={styles.personInfo}>
          <Text numberOfLines={1} style={styles.personName}>
            {person.name}
          </Text>
          <Text numberOfLines={1} style={styles.personMeta}>
            {getBirthdayText(person)}
          </Text>
        </View>
        <View style={styles.personActions}>
          {isDragged && (
            <View style={{ marginRight: 8 }}>
              <MaterialIcons name="drag-handle" size={20} color="#8B5CF6" />
            </View>
          )}
          {!isDragged && (
            <>
              <View
                style={[
                  styles.reachPill,
                  daysSince === 999 && styles.reachPillEmpty,
                ]}
              >
                <View
                  style={[
                    styles.reachPillFill,
                    {
                      backgroundColor: reachColor,
                      width:
                        reachProgress === 1
                          ? "100%"
                          : `${Math.round(reachProgress * 100)}%`,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.reachPillText,
                    (daysSince === 999 || reachProgress < 0.42) &&
                      styles.reachPillTextMuted,
                  ]}
                >
                  {reachText}
                </Text>
              </View>
              <MaterialIcons name="edit" size={18} color="#8B8199" />
            </>
          )}
          {isDragged && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {index > 0 && (
                <Pressable onPress={onMoveUp}>
                  <MaterialIcons name="arrow-upward" size={20} color="#8B5CF6" />
                </Pressable>
              )}
              {index < totalCount - 1 && (
                <Pressable onPress={onMoveDown}>
                  <MaterialIcons
                    name="arrow-downward"
                    size={20}
                    color="#8B5CF6"
                  />
                </Pressable>
              )}
              <Pressable onPress={onCancel}>
                <MaterialIcons name="close" size={20} color="#8B8199" />
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}
