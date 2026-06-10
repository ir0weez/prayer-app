import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { Person } from "@/lib/prayercircle-data";
import { StackedAvatar } from "./stacked-avatar";

interface AvatarPeopleSelectorProps {
  people: Person[];
  selectedIds: string[];
  onToggle: (personId: string) => void;
}

/**
 * Avatar-based people selector for schedule forms
 * Shows people as clickable avatar circles instead of a long list
 */
export function AvatarPeopleSelector({
  people,
  selectedIds,
  onToggle,
}: AvatarPeopleSelectorProps) {
  const colors = useColors();

  // Group people by relationship type for better organization
    const groupedPeople = useMemo(() => {
    const groups: Record<string, Person[]> = {
      Family: [],
      Friends: [],
      Ministry: [],
      Prospect: [],
    };

    people.forEach((person) => {
      const type = person.relationship || "Friends";
      if (type in groups) {
        groups[type as keyof typeof groups].push(person);
      }
    });

    return groups;
  }, [people]);

  const renderPeopleGroup = (title: string, groupPeople: Person[]) => {
    if (groupPeople.length === 0) return null;

    return (
      <View key={title} style={styles.groupContainer}>
        <Text style={[styles.groupTitle, { color: colors.muted }]}>
          {title}
        </Text>
        <View style={styles.avatarGrid}>
          {groupPeople.map((person) => {
            const isSelected = selectedIds.includes(person.id);
            return (
              <Pressable
                key={person.id}
                onPress={() => onToggle(person.id)}
                style={[
                  styles.avatarWrapper,
                  isSelected && styles.avatarWrapperSelected,
                ]}
              >
                <View
                  style={[
                    styles.avatarContainer,
                    isSelected && {
                      borderColor: colors.primary,
                      borderWidth: 3,
                    },
                  ]}
                >
                  <StackedAvatar
                    people={[person]}
                    size={48}
                  />
                </View>
                <Text
                  style={[styles.personName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {person.name.split(" ")[0]}
                </Text>
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      scrollEnabled={true}
    >
      {Object.entries(groupedPeople).map(([title, groupPeople]) =>
        renderPeopleGroup(title, groupPeople)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 300,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    gap: 12,
  },
  avatarWrapper: {
    alignItems: "center",
    width: "33.33%",
    paddingHorizontal: 8,
  },
  avatarWrapperSelected: {
    opacity: 1,
  },
  avatarContainer: {
    borderRadius: 40,
    overflow: "hidden",
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "transparent",
  },
  personName: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: -4,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
