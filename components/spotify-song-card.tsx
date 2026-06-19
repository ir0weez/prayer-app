import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import * as WebBrowser from 'expo-web-browser';

export interface SpotifySongCardProps {
  title: string;
  artist: string;
  album?: string;
  imageUrl?: string;
  spotifyUrl: string;
  duration?: string;
  onRemove?: () => void;
}

export function SpotifySongCard({
  title,
  artist,
  album,
  imageUrl,
  spotifyUrl,
  duration,
  onRemove,
}: SpotifySongCardProps) {
  const colors = useColors();

  const handleOpenSpotify = async () => {
    try {
      await WebBrowser.openBrowserAsync(spotifyUrl);
    } catch (error) {
      console.error('Error opening Spotify:', error);
    }
  };

  return (
    <Pressable
      onPress={handleOpenSpotify}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={styles.albumArt}
        />
      )}
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.artist, { color: colors.muted }]} numberOfLines={1}>
          {artist}
        </Text>
        {album && (
          <Text style={[styles.album, { color: colors.muted }]} numberOfLines={1}>
            {album}
          </Text>
        )}
        {duration && (
          <Text style={[styles.duration, { color: colors.muted }]}>
            {duration}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <MaterialIcons name="open-in-new" size={20} color={colors.primary} />
        {onRemove && (
          <Pressable
            onPress={onRemove}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="close" size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    gap: 12,
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
    marginBottom: 2,
  },
  album: {
    fontSize: 11,
    marginBottom: 4,
  },
  duration: {
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
});
