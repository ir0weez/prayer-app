import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AvatarImage } from "@/components/avatar-system";
import { Person } from "@/lib/prayercircle-data";

interface StackedAvatarProps { people: Person[]; size?: number; }

export const StackedAvatar = React.memo(function StackedAvatar({ people, size = 48 }: StackedAvatarProps) {
  const largeSize = size;
  const smallSize = size * 0.6;
  const overlapLarge = largeSize * 0.25;
  const overlapSmall = smallSize * 0.3;
  const spouses = people.slice(0, 2);
  const children = people.slice(2);
  const displayChildren = children.slice(0, 2);
  const overflowCount = children.length - 2;
  let totalWidth = spouses.length ? largeSize + Math.max(0, spouses.length - 1) * (largeSize - overlapLarge) : 0;
  if (displayChildren.length) totalWidth += smallSize * 0.5 + smallSize + Math.max(0, displayChildren.length - 1) * (smallSize - overlapSmall);
  if (overflowCount > 0) totalWidth += smallSize * 0.5;
  return (
    <View style={[styles.container, { width: Math.max(totalWidth, largeSize) }]}>
      {spouses.map((person, index) => (
        <View key={person.id} style={[styles.avatarWrapper, { width: largeSize, height: largeSize, left: index * (largeSize - overlapLarge), zIndex: spouses.length - index }]}>
          <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={largeSize} thumbnail fallbackColor={person.avatarColor} />
        </View>
      ))}
      {displayChildren.length > 0 && (
        <View style={[styles.childrenContainer, { left: spouses.length * (largeSize - overlapLarge) + smallSize * 0.25, top: 12 }]}>
          {displayChildren.map((person, index) => (
            <View key={person.id} style={[styles.smallAvatarWrapper, { width: smallSize, height: smallSize, left: index * (smallSize - overlapSmall), zIndex: displayChildren.length - index, opacity: 1 - index * 0.4 }]}>
              <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={smallSize} thumbnail fallbackColor={person.avatarColor} />
            </View>
          ))}
          {overflowCount > 0 && <View style={[styles.smallAvatarWrapper, { width: smallSize, height: smallSize, left: displayChildren.length * (smallSize - overlapSmall), opacity: 0.4 }]}><View style={[styles.overflowAvatar, { width: smallSize, height: smallSize, borderRadius: smallSize / 2 }]}><Text style={[styles.avatarText, { fontSize: smallSize * 0.3 }]}>+{overflowCount}</Text></View></View>}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { position: "relative", height: 64 },
  avatarWrapper: { position: "absolute", justifyContent: "center", alignItems: "center" },
  childrenContainer: { position: "absolute", height: 32 },
  smallAvatarWrapper: { position: "absolute", justifyContent: "center", alignItems: "center" },
  overflowAvatar: { justifyContent: "center", alignItems: "center", backgroundColor: "#999", borderWidth: 2, borderColor: "#fff" },
  avatarText: { fontWeight: "600", color: "#fff" },
});
