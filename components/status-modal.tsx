import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, Image, ScrollView, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';

interface StatusModalProps {
  visible: boolean;
  statusText: string;
  statusPhotoUri?: string;
  onClose: () => void;
  onSave: (text: string, photoUri?: string) => void;
  primaryColor: string;
}

export function StatusModal({
  visible,
  statusText,
  statusPhotoUri,
  onClose,
  onSave,
  primaryColor,
}: StatusModalProps) {
  const [draftText, setDraftText] = useState(statusText || '');
  const [draftPhotoUri, setDraftPhotoUri] = useState(statusPhotoUri);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setDraftPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    onSave(draftText, draftPhotoUri);
    setDraftText('');
    setDraftPhotoUri(undefined);
    onClose();
  };

  const handleClose = () => {
    setDraftText(statusText || '');
    setDraftPhotoUri(statusPhotoUri);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleClose}>
            <MaterialIcons name="close" size={28} color="#000" />
          </Pressable>
          <Text style={styles.headerTitle}>Add Status</Text>
          <Pressable onPress={handleSave}>
            <Text style={[styles.saveButton, { color: primaryColor }]}>Save</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Photo Preview or Picker */}
          <Pressable onPress={handlePickImage} style={styles.photoSection}>
            {draftPhotoUri ? (
              <Image source={{ uri: draftPhotoUri }} style={styles.photoPreview} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: `${primaryColor}20` }]}>
                <MaterialIcons name="add-a-photo" size={48} color={primaryColor} />
                <Text style={[styles.photoPlaceholderText, { color: primaryColor }]}>Add Photo</Text>
              </View>
            )}
          </Pressable>

          {/* Status Text Input */}
          <View style={styles.inputSection}>
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#999"
              value={draftText}
              onChangeText={setDraftText}
              multiline
              maxLength={280}
            />
            <Text style={styles.charCount}>{draftText.length}/280</Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Pressable style={styles.actionButton}>
              <MaterialIcons name="music-note" size={24} color={primaryColor} />
              <Text style={styles.actionLabel}>Music</Text>
            </Pressable>
            <Pressable style={styles.actionButton}>
              <MaterialIcons name="location-on" size={24} color={primaryColor} />
              <Text style={styles.actionLabel}>Location</Text>
            </Pressable>
            <Pressable style={styles.actionButton}>
              <MaterialIcons name="image" size={24} color={primaryColor} />
              <Text style={styles.actionLabel}>GIF</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  photoSection: {
    marginBottom: 24,
  },
  photoPreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 24,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
  },
  actionLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
});
