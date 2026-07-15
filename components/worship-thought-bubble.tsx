import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';

interface WorshipThoughtBubbleProps {
  albumTitle: string;
  artistName: string;
}

export function WorshipThoughtBubble({
  albumTitle,
  artistName,
}: WorshipThoughtBubbleProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primary,
          },
        ]}
      >
        <Text
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {albumTitle}
        </Text>
        <Text
          style={[styles.artist, { color: colors.muted }]}
          numberOfLines={1}
        >
          {artistName}
        </Text>
      </View>
      {/* Tail pointer */}
      <View
        style={[
          styles.tail,
          {
            borderTopColor: colors.surface,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: 200,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  artist: {
    fontSize: 12,
    fontWeight: '500',
  },
  tail: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 8,
    borderLeftWidth: 8,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginLeft: 8,
    marginTop: -2,
  },
});
