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
  const overflowPeople = people.slice(maxDisplay);
  const overlap = size * 0.35; // 35% overlap between avatars
  const smallSize = size * 0.5; // Small avatars are 50% of main size

  return (
    <View style={[styles.container, { width: size + (displayPeople.length - 1) * (size - overlap) + smallSize + 8 }]}>
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

      {overflowPeople.length > 0 && (
        <View style={[styles.smallAvatarsContainer, { right: 0, bottom: 0 }]}>
          {overflowPeople.slice(0, 2).map((person, index) => (
            <View
              key={person.id}
              style={[
                styles.smallAvatarWrapper,
                {
                  width: smallSize,
                  height: smallSize,
                  left: index * (smallSize * 0.5),
                  zIndex: 2 - index,
                },
              ]}
            >
              {person.photoUri ? (
                <Image
                  source={{ uri: person.photoUri }}
                  style={[
                    styles.avatar,
                    {
                      width: smallSize,
                      height: smallSize,
                      borderRadius: smallSize / 2,
                    },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    {
                      width: smallSize,
                      height: smallSize,
                      borderRadius: smallSize / 2,
                      backgroundColor: person.avatarColor,
                    },
                  ]}
                >
                  <Text style={[styles.avatarText, { fontSize: smallSize * 0.35 }]}>{person.initials}</Text>
                </View>
              )}
            </View>
          ))}
          {overflowPeople.length > 2 && (
            <View
              style={[
                styles.smallAvatarWrapper,
                {
                  width: smallSize,
                  height: smallSize,
                  left: 2 * (smallSize * 0.5),
                  zIndex: 0,
                },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    width: smallSize,
                    height: smallSize,
                    borderRadius: smallSize / 2,
                    backgroundColor: "#999",
                  },
                ]}
              >
                <Text style={[styles.avatarText, { fontSize: smallSize * 0.35 }]}>+{overflowPeople.length - 2}</Text>
              </View>
            </View>
          )}
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
  smallAvatarsContainer: {
    position: "absolute",
  },
  smallAvatarWrapper: {
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
