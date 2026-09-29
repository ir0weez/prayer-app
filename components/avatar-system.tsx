import React, { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  AVATAR_DEFINITIONS,
  SHINY_ACHIEVEMENTS,
  SHINY_AVATARS,
  STYLE_ORDER,
  getAvatarDefinitionForPerson,
  type AvatarGender,
  type AvatarStyle,
} from "@/lib/avatar-system";
import { useColors } from "@/hooks/use-colors";

type AvatarImageProps = {
  id: string;
  name?: string;
  gender?: AvatarGender;
  avatarAsset?: string;
  photoUri?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  fallbackColor?: string;
};

export function AvatarImage({ id, name, gender, avatarAsset, photoUri, size = 48, style, imageStyle, fallbackColor }: AvatarImageProps) {
  const colors = useColors();
  const definition = getAvatarDefinitionForPerson(id, gender, avatarAsset);
  const initials = name?.trim().split(/\s+/).map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "?";
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: fallbackColor || colors.surface }, style]}>
      {photoUri ? <Image source={{ uri: photoUri }} style={[{ width: "100%", height: "100%" }, imageStyle]} /> : definition ? <Image source={definition.source} style={[{ width: "100%", height: "100%" }, imageStyle]} /> : <Text style={{ color: colors.foreground, fontWeight: "800" }}>{initials}</Text>}
    </View>
  );
}

type AvatarPickerProps = {
  visible: boolean;
  initialAvatarAsset?: string;
  gender?: AvatarGender;
  unlockedShinyIds?: string[];
  onClose: () => void;
  onSelect: (avatarAsset: string | undefined) => void;
  onUpload?: () => void;
  initialTab?: AvatarStyle | "Shiny";
};

const STYLE_LABELS: Record<AvatarStyle, string> = { "90s": "90s", "1920s": "1920s", "1950s": "1950s", "1970s": "1970s", "1980s": "1980s", Y2K: "Y2K" };

export function AvatarPicker({ visible, initialAvatarAsset, gender, unlockedShinyIds = [], onClose, onSelect, onUpload, initialTab = "90s" }: AvatarPickerProps) {
  const colors = useColors();
  const [style, setStyle] = useState<AvatarStyle | "Shiny">(initialTab);
  const [selectedGender, setSelectedGender] = useState<AvatarGender | "all">(gender || "all");
  const [selected, setSelected] = useState<string | undefined>(initialAvatarAsset);
  useEffect(() => { if (visible) { setSelected(initialAvatarAsset); setStyle(initialTab); setSelectedGender(gender || "all"); } }, [gender, initialAvatarAsset, initialTab, visible]);
  const unlocked = new Set(unlockedShinyIds);
  const regular = useMemo(() => AVATAR_DEFINITIONS.filter((avatar) => avatar.style === style && (selectedGender === "all" || avatar.gender === selectedGender)), [style, selectedGender]);
  const selectedDefinition = getAvatarDefinitionForPerson("picker", gender, selected);
  const select = (asset?: string) => { setSelected(asset); onSelect(asset); onClose(); };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={styles.header}><Text style={[styles.title, { color: colors.foreground }]}>Choose avatar</Text><Pressable onPress={onClose}><MaterialIcons name="close" size={28} color={colors.foreground} /></Pressable></View>
        <View style={[styles.previewRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <AvatarImage id="picker" avatarAsset={selected} gender={gender} size={64} />
          <View style={{ flex: 1 }}><Text style={[styles.previewLabel, { color: colors.muted }]}>SELECTED AVATAR</Text><Text style={[styles.previewName, { color: colors.foreground }]}>{selectedDefinition?.animal || "Default"}</Text></View>
          <View style={{ gap: 6 }}><Pressable onPress={onUpload} style={[styles.clearButton, { borderColor: colors.border }]}><Text style={{ color: colors.primary, fontWeight: "800" }}>Upload photo</Text></Pressable><Pressable onPress={() => select(undefined)} style={[styles.clearButton, { borderColor: colors.border }]}><Text style={{ color: colors.primary, fontWeight: "800" }}>Default</Text></Pressable></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {[...STYLE_ORDER, "Shiny" as const].map((tab) => <Pressable key={tab} onPress={() => setStyle(tab)} style={[styles.tab, { borderColor: colors.border }, style === tab && { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={{ color: style === tab ? "#fff" : colors.foreground, fontWeight: "800", fontSize: 12 }}>{tab === "Shiny" ? "Shiny" : STYLE_LABELS[tab]}</Text></Pressable>)}
        </ScrollView>
        {style !== "Shiny" && <View style={styles.genderRow}>{(["all", "m", "f"] as const).map((value) => <Pressable key={value} onPress={() => setSelectedGender(value)} style={[styles.genderButton, { borderColor: colors.border }, selectedGender === value && { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={{ color: selectedGender === value ? "#fff" : colors.foreground, fontWeight: "800" }}>{value === "all" ? "All" : value === "m" ? "Male" : "Female"}</Text></Pressable>)}</View>}
        <ScrollView contentContainerStyle={styles.grid}>
          {style === "Shiny" ? SHINY_ACHIEVEMENTS.map((achievement) => { const isUnlocked = unlocked.has(achievement.avatarId); return <Pressable key={achievement.id} onPress={() => isUnlocked ? select(achievement.avatarId) : undefined} style={[styles.shinyCard, { borderColor: colors.border, backgroundColor: colors.surface }]}><Image source={SHINY_AVATARS[achievement.avatarId as keyof typeof SHINY_AVATARS]} style={[styles.shinyImage, !isUnlocked && { opacity: 0.18 }]} /><Text style={[styles.shinyName, { color: colors.foreground }]}>{isUnlocked ? achievement.name : "Locked"}</Text><Text style={[styles.hint, { color: colors.muted }]}>{achievement.hint}</Text></Pressable>; }) : regular.map((avatar) => <Pressable key={avatar.id} onPress={() => select(avatar.id)} style={[styles.avatarCard, { borderColor: selected === avatar.id ? colors.primary : colors.border, backgroundColor: colors.surface }, selected === avatar.id && { borderWidth: 3 }]}><Image source={avatar.source} style={styles.avatarImage} /><Text numberOfLines={1} style={[styles.avatarName, { color: colors.foreground }]}>{avatar.animal}</Text></Pressable>)}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, paddingTop: 52, paddingHorizontal: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "900" },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 12, borderRadius: 18, borderWidth: 1, marginBottom: 14 },
  previewLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  previewName: { fontSize: 20, fontWeight: "900", textTransform: "capitalize" },
  clearButton: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  tabs: { gap: 8, paddingBottom: 12 },
  tab: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  genderRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  genderButton: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingBottom: 40 },
  avatarCard: { width: "30%", minWidth: 92, alignItems: "center", borderWidth: 1.5, borderRadius: 16, padding: 8 },
  avatarImage: { width: 78, height: 78, borderRadius: 39 },
  avatarName: { marginTop: 5, fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  shinyCard: { width: "47%", alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 10 },
  shinyImage: { width: 118, height: 118, borderRadius: 59 },
  shinyName: { fontWeight: "900", marginTop: 5 },
  hint: { fontSize: 11, textAlign: "center", marginTop: 4 },
});
