import React, { useState, useEffect } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';

export interface AlbumCardProps {
  title: string;
  artist: string;
  coverUrl?: string;
  onDelete?: () => void;
}

/**
 * Extract dominant color from image URL using a simple hash-based approach
 * This creates a consistent color based on the URL without loading the full image
 */
function getDominantColorFromUrl(url: string): string {
  if (!url) return '#7C5CFF'; // Default purple
  
  // Simple hash function to generate a color from URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert hash to hex color
  const hue = Math.abs(hash) % 360;
  const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
  const lightness = 55 + (Math.abs(hash) % 15); // 55-70%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Material Design album card with image on left, text on right
 * Background color matches the album cover
 */
export function AlbumCard({ 
  title, 
  artist, 
  coverUrl, 
  onDelete,
}: AlbumCardProps) {
  const colors = useColors();
  const [imageError, setImageError] = useState(false);
  const [dominantColor, setDominantColor] = useState(getDominantColorFromUrl(coverUrl || ''));
  
  useEffect(() => {
    // Update dominant color when coverUrl changes
    setDominantColor(getDominantColorFromUrl(coverUrl || ''));
  }, [coverUrl]);
  
  return (
    <View
      style={{
        backgroundColor: dominantColor,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          gap: 12,
        }}
      >
        {/* Album Cover Image */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: colors.muted,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
        >
          {!imageError && coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={{ width: '100%', height: '100%' }}
              onError={() => setImageError(true)}
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.muted,
              }}
            >
              <MaterialIcons name="music-note" size={32} color={colors.foreground} />
            </View>
          )}
        </View>

        {/* Album Info */}
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: '#FFFFFF',
            }}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.8)',
            }}
            numberOfLines={1}
          >
            {artist}
          </Text>
        </View>

        {/* Delete Button */}
        {onDelete && (
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.6 : 1,
                padding: 8,
              },
            ]}
          >
            <MaterialIcons name="close" size={20} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
