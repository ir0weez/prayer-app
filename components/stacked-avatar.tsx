import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Person } from "@/lib/prayercircle-data";

interface StackedAvatarProps {
  people: Person[];
  size?: number;
  maxDisplay?: number;
}

/**
 * Displays multiple avatars stacked/overlapped for family groups.
 * Shows up to maxDisplay avatars, with a "+N" indicator if there are more.
 */
export function StackedAvatar({ people, size = 48, maxDisplay = 3 }: StackedAvatarProps) {
  const displayPeople = people.slice(0, maxDisplay);
  const overflow = Math.max(0, people.length - maxDisplay);
  const overlap = size * 0.35; // 35% overlap between avatars

  return (
    <View style={[styles.container, { width: size + (displayPeople.length - 1) * (size - overlap) + 8 }]}>
      {displayPeople.map((person, index) => (
        <View
          key={person.id}
          style={[
            styles.avatarWrapper,
            {
              width: size,
              height: size,
              left: index * (size - overlap),
              zIndex: displayPeople.length - index,
            },
          ]}
        >
          {person.photoUri ? (
            <Image
              source={{ uri: person.photoUri }}
              style={[
                styles.avatar,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: person.avatarColor,
                },
              ]}
            >
              <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{person.initials}</Text>
            </View>
          )}
        </View>
      ))}

      {overflow > 0 && (
        <View
          style={[
            styles.overflowBadge,
            {
              width: size * 0.6,
              height: size * 0.6,
              borderRadius: (size * 0.6) / 2,
              right: 0,
              bottom: 0,
            },
          ]}
        >
          <Text style={[styles.overflowText, { fontSize: size * 0.25 }]}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    height: 48,
  },
  avatarWrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarText: {
    fontWeight: "600",
    color: "#fff",
  },
  overflowBadge: {
    position: "absolute",
    backgroundColor: "#999",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  overflowText: {
    fontWeight: "700",
    color: "#fff",
  },
});
