import React from 'react';
import { Dimensions, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/use-colors';
import type { StoredWorshipAlbum } from '@/lib/worship-album-state';

export interface WorshipAlbumDetailProps {
  album: StoredWorshipAlbum | null;
  visible: boolean;
  dateLabel: string;
  onClose: () => void;
  onAddToDate: () => void;
  onEdit: () => void;
  onToggleSaved: () => void;
}

export function WorshipAlbumDetail({ album, visible, dateLabel, onClose, onAddToDate, onEdit, onToggleSaved }: WorshipAlbumDetailProps) {
  const colors = useColors();
  // Keep the detail view calm and grounded beneath bright or busy cover art.
  // This deep warm accent is used consistently for the page and its controls.
  const albumSurface = '#241715';
  const albumControl = '#4A2921';
  if (!album) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: albumSurface }}>
        <View style={{ position: 'absolute', zIndex: 3, top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close album details" onPress={onClose} style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 21, backgroundColor: albumControl, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1 }]}>
            <MaterialIcons name="keyboard-arrow-down" size={30} color="#FFFFFF" />
          </Pressable>
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 1.2 }}>WORSHIP SETLIST</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={album.isSaved ? 'Remove album from saved' : 'Save album'} onPress={onToggleSaved} style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 21, backgroundColor: albumControl, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1 }]}>
            <MaterialIcons name={album.isSaved ? 'star' : 'star-border'} size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 34 }}>
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 24 }}>
            <View style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').width, overflow: 'hidden', backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
              {album.coverUrl ? <Image source={{ uri: album.coverUrl }} contentFit="cover" style={{ width: '100%', height: '100%' }} /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="music-note" size={90} color={colors.primary} /></View>}
            </View>
            <View style={{ width: '100%', paddingHorizontal: 24, paddingTop: 26 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 30, lineHeight: 36, fontWeight: '800' }}>{album.title}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 19, lineHeight: 25, fontWeight: '600', marginTop: 5 }}>{album.artist}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.56)', fontSize: 13, marginTop: 8 }}>For {dateLabel}</Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: 24, marginBottom: 18 }} />
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginHorizontal: 24, marginBottom: 12 }}>Songs in this setlist</Text>
          {album.tracks?.length ? album.tracks.map((track, index) => (
            <View key={track.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 24, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
              <Text style={{ width: 24, color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '800', textAlign: 'center' }}>{index + 1}</Text>
              <View style={{ width: 38, height: 38, borderRadius: 7, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.14)' }}>{album.coverUrl ? <Image source={{ uri: album.coverUrl }} contentFit="cover" style={{ width: '100%', height: '100%' }} /> : null}</View>
              <View style={{ flex: 1 }}><Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{track.title}</Text>{track.key && <Text style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13, marginTop: 3 }}>Key of {track.key}</Text>}</View>
              <MaterialIcons name="drag-handle" size={22} color="rgba(255,255,255,0.46)" />
            </View>
          )) : <Text style={{ color: 'rgba(255,255,255,0.62)', paddingHorizontal: 24, paddingVertical: 18 }}>No songs have been added to this setlist yet.</Text>}
          <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 18, marginTop: 24 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Add ${album.title} to ${dateLabel}`} onPress={onAddToDate} style={({ pressed }) => [{ flex: 1, minHeight: 54, borderRadius: 16, backgroundColor: albumControl, borderWidth: 1, borderColor: '#6A3D31', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: pressed ? 0.75 : 1 }]}><MaterialIcons name="event" size={21} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Add to date</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${album.title}`} onPress={onEdit} style={({ pressed }) => [{ width: 58, minHeight: 54, borderRadius: 16, backgroundColor: albumControl, borderWidth: 1, borderColor: '#6A3D31', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 }]}><MaterialIcons name="edit" size={23} color="#FFFFFF" /></Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
