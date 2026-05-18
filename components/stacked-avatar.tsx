import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Person } from "@/lib/prayercircle-data";

interface StackedAvatarProps {
  people: Person[];
  size?: number;
}

/**
 * Displays family avatars with visual hierarchy:
 * - First 2 people (spouses) shown as large avatars side-by-side
 * - Children shown as smaller avatars with gradient opacity fade
 * - After 4 total avatars, remaining count shown as "+N"
 */
export function StackedAvatar({ people, size = 48 }: StackedAvatarProps) {
  const largeSize = size; // 48px for spouses
  const smallSize = size * 0.6; // 28.8px for children
  const overlapLarge = largeSize * 0.25; // 25% overlap between large avatars
  const overlapSmall = smallSize * 0.3; // 30% overlap for small avatars
  const childrenOffsetY = 24; // Position children 24px down from top (below spouses)

  // Separate spouses (first 2) from children
  const spouses = people.slice(0, 2);
  const children = people.slice(2);
  const displayChildren = children.slice(0, 2); // Show up to 2 children
  const overflowCount = children.length - 2;

  // Calculate total width needed
  let totalWidth = 0;
  if (spouses.length > 0) {
    totalWidth += largeSize;
    if (spouses.length > 1) {
      totalWidth += largeSize - overlapLarge;
    }
  }
  if (displayChildren.length > 0) {
    totalWidth += smallSize * 0.5; // Spacing before children
    totalWidth += smallSize;
    if (displayChildren.length > 1) {
      totalWidth += smallSize - overlapSmall;
    }
  }
  if (overflowCount > 0) {
    totalWidth += smallSize * 0.5; // Spacing before overflow badge
  }

  return (
    <View style={[styles.container, { width: Math.max(totalWidth, largeSize) }]}>
      {/* Large spouse avatars */}
      {spouses.map((person, index) => (
        <View
          key={person.id}
          style={[
            styles.avatarWrapper,
            {
              width: largeSize,
              height: largeSize,
              left: index * (largeSize - overlapLarge),
              zIndex: spouses.length - index,
            },
          ]}
        >
          {person.photoUri ? (
            <Image
              source={{ uri: person.photoUri }}
              style={[
                styles.avatar,
                {
                  width: largeSize,
                  height: largeSize,
                  borderRadius: largeSize / 2,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                {
                  width: largeSize,
                  height: largeSize,
                  borderRadius: largeSize / 2,
                  backgroundColor: person.avatarColor,
                },
              ]}
            >
              <Text style={[styles.avatarText, { fontSize: largeSize * 0.4 }]}>
                {person.initials}
              </Text>
            </View>
          )}
        </View>
      ))}

      {/* Children avatars with gradient opacity fade */}
      {displayChildren.length > 0 && (
        <View
          style={[
            styles.childrenContainer,
            {
              left: spouses.length * (largeSize - overlapLarge) + smallSize * 0.25,
              top: childrenOffsetY, // Position children below spouses
            },
          ]}
        >
          {displayChildren.map((person, index) => {
            // Calculate opacity: first child at 1, second at 0.6
            const opacity = 1 - index * 0.4;
            return (
              <View
                key={person.id}
                style={[
                  styles.smallAvatarWrapper,
                  {
                    width: smallSize,
                    height: smallSize,
                    left: index * (smallSize - overlapSmall),
                    zIndex: displayChildren.length - index,
                    opacity,
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
                    <Text style={[styles.avatarText, { fontSize: smallSize * 0.35 }]}>
                      {person.initials}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Overflow badge for remaining children */}
          {overflowCount > 0 && (
            <View
              style={[
                styles.smallAvatarWrapper,
                {
                  width: smallSize,
                  height: smallSize,
                  left: displayChildren.length * (smallSize - overlapSmall),
                  zIndex: 0,
                  opacity: 0.4,
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
                <Text style={[styles.avatarText, { fontSize: smallSize * 0.3 }]}>
                  +{overflowCount}
                </Text>
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
    height: 64, // Increased to accommodate children positioned lower
  },
  avatarWrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  childrenContainer: {
    position: "absolute",
    height: 32,
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
});
