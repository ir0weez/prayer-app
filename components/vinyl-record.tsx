import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface VinylRecordProps {
  albumArtUrl?: string;
  size?: number;
  isPlaying?: boolean;
}

export function VinylRecord({
  albumArtUrl,
  size = 100,
  isPlaying = true,
}: VinylRecordProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isPlaying) {
      rotation.value = withRepeat(
        withTiming(360, {
          duration: 8000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [isPlaying, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.vinyl,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          animatedStyle,
        ]}
      >
        {/* Vinyl record grooves */}
        <View
          style={[
            styles.groove,
            {
              width: size * 0.95,
              height: size * 0.95,
              borderRadius: (size * 0.95) / 2,
            },
          ]}
        />
        <View
          style={[
            styles.groove,
            {
              width: size * 0.85,
              height: size * 0.85,
              borderRadius: (size * 0.85) / 2,
            },
          ]}
        />
        <View
          style={[
            styles.groove,
            {
              width: size * 0.75,
              height: size * 0.75,
              borderRadius: (size * 0.75) / 2,
            },
          ]}
        />

        {/* Album art center */}
        <View
          style={[
            styles.albumArtContainer,
            {
              width: size * 0.6,
              height: size * 0.6,
              borderRadius: (size * 0.6) / 2,
            },
          ]}
        >
          {albumArtUrl ? (
            <Image
              source={{ uri: albumArtUrl }}
              style={[
                styles.albumArt,
                {
                  width: size * 0.6,
                  height: size * 0.6,
                  borderRadius: (size * 0.6) / 2,
                },
              ]}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View
              style={[
                styles.placeholderAlbumArt,
                {
                  width: size * 0.6,
                  height: size * 0.6,
                  borderRadius: (size * 0.6) / 2,
                },
              ]}
            />
          )}
        </View>

        {/* Center spindle */}
        <View
          style={[
            styles.spindle,
            {
              width: size * 0.15,
              height: size * 0.15,
              borderRadius: (size * 0.15) / 2,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  vinyl: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  groove: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  albumArtContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  albumArt: {
    backgroundColor: '#333',
  },
  placeholderAlbumArt: {
    backgroundColor: '#666',
  },
  spindle: {
    position: 'absolute',
    backgroundColor: '#FFD700',
    borderWidth: 1,
    borderColor: '#FFA500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});
