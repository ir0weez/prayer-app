import React, { useState } from 'react';
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
 * Get a nice color based on album title for visual variety
 */
function getColorForAlbum(title: string): string {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#FFE66D', // Orange
    '#95E1D3', // Mint
    '#F38181', // Pink
    '#AA96DA', // Purple
    '#FFD3B6', // Peach
    '#FFAAA5', // Salmon
  ];
  
  // Use title to pick a consistent color
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Material Design album card with image on left, text on right
 * Uses a solid background color for visual appeal
 */
export function AlbumCard({ 
  title, 
  artist, 
  coverUrl, 
  onDelete,
}: AlbumCardProps) {
  const colors = useColors();
  const [imageError, setImageError] = useState(false);
  const [backgroundColor] = useState(() => getColorForAlbum(title));
  
  return (
    <View
      style={{
        backgroundColor,
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
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
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
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
              }}
            >
              <MaterialIcons name="music-note" size={32} color="#FFFFFF" />
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
              color: 'rgba(255, 255, 255, 0.9)',
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
