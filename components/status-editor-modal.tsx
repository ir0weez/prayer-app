import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export interface StatusData {
  text: string;
  gifUrl?: string;
  song?: { title: string; artist: string };
}

interface StatusEditorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (status: StatusData) => void;
  initialStatus?: StatusData;
}

const PURPLE = "#8557D9";
const SOFT_PURPLE = "#F0E8FF";
const BORDER = "#DAC8F6";
const DEEP_TEXT = "#141326";
const MUTED_TEXT = "#7E7C88";

export function StatusEditorModal({
  visible,
  onClose,
  onSave,
  initialStatus,
}: StatusEditorModalProps) {
  const [statusText, setStatusText] = useState(initialStatus?.text || "");
  const [gifUrl, setGifUrl] = useState(initialStatus?.gifUrl);
  const [song, setSong] = useState(initialStatus?.song);

  const handleSave = useCallback(() => {
    onSave({
      text: statusText,
      gifUrl,
      song,
    });
    handleClose();
  }, [statusText, gifUrl, song, onSave]);

  const handleClose = useCallback(() => {
    setStatusText(initialStatus?.text || "");
    setGifUrl(initialStatus?.gifUrl);
    setSong(initialStatus?.song);
    onClose();
  }, [initialStatus, onClose]);

  const handleRemoveGif = useCallback(() => {
    setGifUrl(undefined);
  }, []);

  const handleRemoveSong = useCallback(() => {
    setSong(undefined);
  }, []);

  const handleAddSong = useCallback(() => {
    Alert.prompt(
      "Add Song",
      "Enter song title and artist (format: Title - Artist)",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Add",
          onPress: (input: string | undefined) => {
            if (input) {
              const [title, artist] = input.split(" - ").map((s: string) => s.trim());
              if (title && artist) {
                setSong({ title, artist });
              } else {
                Alert.alert("Invalid Format", "Please use format: Title - Artist");
              }
            }
          },
        },
      ]
    );
  }, []);

  const handleAddGif = useCallback(() => {
    Alert.prompt(
      "Add GIF",
      "Enter GIF URL",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Add",
          onPress: (url: string | undefined) => {
            if (url) {
              setGifUrl(url);
            }
          },
        },
      ]
    );
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.headerButton}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Your Status</Text>
          <Pressable onPress={handleSave} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.headerButtonPrimary}>Share</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status Text Input */}
          <View style={styles.inputSection}>
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind?"
              placeholderTextColor={MUTED_TEXT}
              value={statusText}
              onChangeText={setStatusText}
              multiline
              maxLength={280}
            />
            <Text style={styles.charCount}>{statusText.length}/280</Text>
          </View>

          {/* GIF Preview */}
          {gifUrl && (
            <View style={styles.mediaPreview}>
              <Image source={{ uri: gifUrl }} style={styles.gifPreview} />
              <Pressable onPress={handleRemoveGif} style={styles.removeButton}>
                <MaterialIcons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          )}

          {/* Song Badge */}
          {song && (
            <View style={styles.songBadge}>
              <MaterialIcons name="music-note" size={18} color={PURPLE} />
              <Text style={styles.songText}>
                {song.title} • {song.artist}
              </Text>
              <Pressable onPress={handleRemoveSong}>
                <MaterialIcons name="close" size={18} color={PURPLE} />
              </Pressable>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              onPress={handleAddGif}
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            >
              <MaterialIcons name="image" size={22} color={PURPLE} />
              <Text style={styles.actionButtonText}>GIF</Text>
            </Pressable>

            <Pressable
              onPress={handleAddSong}
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            >
              <MaterialIcons name="music-note" size={22} color={PURPLE} />
              <Text style={styles.actionButtonText}>Song</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            >
              <MaterialIcons name="location-on" size={22} color={PURPLE} />
              <Text style={styles.actionButtonText}>Location</Text>
            </Pressable>
          </View>

          {/* Share Options */}
          <View style={styles.shareSection}>
            <Text style={styles.shareSectionTitle}>Share with</Text>
            <View style={styles.shareOptions}>
              <Pressable style={styles.shareOption}>
                <View style={styles.shareIcon}>
                  <MaterialIcons name="people" size={20} color={PURPLE} />
                </View>
                <Text style={styles.shareOptionText}>Friends</Text>
              </Pressable>
              <Pressable style={styles.shareOption}>
                <View style={styles.shareIcon}>
                  <MaterialIcons name="public" size={20} color={PURPLE} />
                </View>
                <Text style={styles.shareOptionText}>Everyone</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DEEP_TEXT,
  },
  headerButton: {
    fontSize: 24,
    color: MUTED_TEXT,
  },
  headerButtonPrimary: {
    fontSize: 16,
    fontWeight: "700",
    color: PURPLE,
  },
  pressed: {
    opacity: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  inputSection: {
    marginBottom: 20,
  },
  textInput: {
    fontSize: 16,
    fontWeight: "500",
    color: DEEP_TEXT,
    minHeight: 100,
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginBottom: 8,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: MUTED_TEXT,
    textAlign: "right",
  },
  mediaPreview: {
    position: "relative",
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  gifPreview: {
    width: "100%",
    height: 160,
    borderRadius: 12,
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  songBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: SOFT_PURPLE,
    marginBottom: 16,
  },
  songText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: PURPLE,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: SOFT_PURPLE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: PURPLE,
  },
  shareSection: {
    marginTop: 20,
  },
  shareSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: DEEP_TEXT,
    marginBottom: 12,
  },
  shareOptions: {
    flexDirection: "row",
    gap: 12,
  },
  shareOption: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: SOFT_PURPLE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  shareIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  shareOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: DEEP_TEXT,
  },
});
