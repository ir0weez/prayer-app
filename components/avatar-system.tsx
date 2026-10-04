import React, { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Animated, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  AVATAR_DEFINITIONS,
  SHINY_ACHIEVEMENTS,
  SHINY_AVATARS,
  SHINY_AVATAR_THUMBNAILS,
  STYLE_ORDER,
  getAvatarDefinitionForPerson,
  type AvatarGender,
  type AvatarStyle,
} from "@/lib/avatar-system";
import { BOOK_AVATAR_BY_ID, BOOK_AVATAR_DEFINITIONS } from "@/lib/book-avatars";
import { useColors } from "@/hooks/use-colors";
import { auraRingStyle, getAvatarAura, getPersonalProfileAura, type AvatarAuraStyle } from "@/lib/avatar-aura";

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
  thumbnail?: boolean;
  auraId?: string;
  auraMode?: "static" | "animated" | "none";
  profileLevel?: number;
};

const AURA_PARTICLES: Record<AvatarAuraStyle, Array<{ left: number; top: number; size: number; color: "primary" | "secondary" | "accent" }>> = {
  rays: [{ left: 8, top: -3, size: 4, color: "secondary" }, { left: 46, top: 2, size: 3, color: "accent" }],
  rings: [],
  "stained-glass": [{ left: 2, top: 10, size: 4, color: "accent" }, { left: 50, top: 36, size: 4, color: "secondary" }, { left: 20, top: 52, size: 3, color: "accent" }],
  embers: [{ left: 5, top: 38, size: 4, color: "primary" }, { left: 48, top: 20, size: 3, color: "accent" }, { left: 32, top: -2, size: 3, color: "secondary" }],
  stars: [{ left: 0, top: 12, size: 3, color: "secondary" }, { left: 52, top: 8, size: 3, color: "primary" }, { left: 46, top: 48, size: 2, color: "secondary" }],
  dust: [{ left: 4, top: 24, size: 3, color: "primary" }, { left: 52, top: 28, size: 3, color: "secondary" }, { left: 18, top: -1, size: 2, color: "accent" }],
  radiant: [{ left: 8, top: -2, size: 3, color: "secondary" }, { left: 48, top: 6, size: 3, color: "accent" }],
  prismatic: [{ left: 0, top: 8, size: 4, color: "accent" }, { left: 52, top: 12, size: 4, color: "secondary" }, { left: 8, top: 48, size: 3, color: "accent" }, { left: 48, top: 48, size: 3, color: "primary" }],
};

export const AvatarImage = React.memo(function AvatarImage({ id, name, gender, avatarAsset, photoUri, size = 48, style, imageStyle, fallbackColor, thumbnail = false, auraId, auraMode = "static", profileLevel = 1 }: AvatarImageProps) {
  const colors = useColors();
  const definition = getAvatarDefinitionForPerson(id, gender, avatarAsset);
  const bookDefinition = avatarAsset ? BOOK_AVATAR_BY_ID[avatarAsset] : undefined;
  const shinySource = avatarAsset ? SHINY_AVATARS[avatarAsset as keyof typeof SHINY_AVATARS] : undefined;
  const shinyThumbnail = avatarAsset ? SHINY_AVATAR_THUMBNAILS[avatarAsset as keyof typeof SHINY_AVATAR_THUMBNAILS] : undefined;
  const aura = id === "profile" ? getPersonalProfileAura(avatarAsset, auraId, profileLevel) : getAvatarAura(avatarAsset, auraId);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const pulse = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReducedMotion(value); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  React.useEffect(() => {
    if (!aura || auraMode !== "animated" || reducedMotion) { pulse.stopAnimation(); pulse.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [aura, auraMode, pulse, reducedMotion]);
  const animated = Boolean(aura && auraMode === "animated" && !reducedMotion);
  const particles = aura ? AURA_PARTICLES[aura.style] : [];
  const particleColor = (kind: "primary" | "secondary" | "accent") => kind === "primary" ? aura?.glowColor : kind === "secondary" ? aura?.secondaryColor : aura?.accentColors[0];
  const initials = name?.trim().split(/\s+/).map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "?";
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      {aura && auraMode !== "none" && <Animated.View style={[auraRingStyle(aura, size, animated), animated && { transform: [{ scale: pulse }] }]} pointerEvents="none" />}
      {aura && animated && particles.map((particle, index) => <View key={`${aura.id}-particle-${index}`} pointerEvents="none" style={[styles.auraParticle, { left: particle.left, top: particle.top, width: particle.size, height: particle.size, borderRadius: particle.size / 2, backgroundColor: particleColor(particle.color) }]} />)}
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: fallbackColor || colors.surface }}>
        {photoUri ? <Image source={{ uri: photoUri }} style={[{ width: "100%", height: "100%" }, imageStyle]} /> : definition ? <Image source={thumbnail ? definition.thumbnail : definition.source} style={[{ width: "100%", height: "100%" }, imageStyle]} /> : bookDefinition ? <Image source={thumbnail ? bookDefinition.thumbnail : bookDefinition.source} style={[{ width: "100%", height: "100%" }, imageStyle]} /> : shinySource ? <Image source={thumbnail ? shinyThumbnail : shinySource} style={[{ width: "100%", height: "100%" }, imageStyle]} /> : <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>{initials}</Text>}
      </View>
    </View>
  );
});

type AvatarPickerProps = {
  visible: boolean;
  initialAvatarAsset?: string;
  gender?: AvatarGender;
  unlockedShinyIds?: string[];
  onClose: () => void;
  onSelect: (avatarAsset: string | undefined) => void;
  onUpload?: () => void;
  unlockedBookIds?: string[];
  initialTab?: AvatarStyle | "Shiny" | "Books";
};

const STYLE_LABELS: Record<AvatarStyle, string> = { "90s": "90s", "1920s": "1920s", "1950s": "1950s", "1970s": "1970s", "1980s": "1980s", Y2K: "Y2K" };

export function AvatarPicker({ visible, initialAvatarAsset, gender, unlockedShinyIds = [], unlockedBookIds = [], onClose, onSelect, onUpload, initialTab = "90s" }: AvatarPickerProps) {
  const colors = useColors();
  const [style, setStyle] = useState<AvatarStyle | "Shiny" | "Books">(initialTab);
  const [selectedGender, setSelectedGender] = useState<AvatarGender | "all">(gender || "all");
  const [selected, setSelected] = useState<string | undefined>(initialAvatarAsset);
  useEffect(() => { if (visible) { setSelected(initialAvatarAsset); setStyle(initialTab); setSelectedGender(gender || "all"); } }, [gender, initialAvatarAsset, initialTab, visible]);
  const unlocked = new Set(unlockedShinyIds);
  const unlockedBooks = new Set(unlockedBookIds);
  const regular = useMemo(() => AVATAR_DEFINITIONS.filter((avatar) => avatar.style === style && (selectedGender === "all" || avatar.gender === selectedGender)), [style, selectedGender]);
  const books = useMemo(() => BOOK_AVATAR_DEFINITIONS, []);
  const selectedDefinition = getAvatarDefinitionForPerson("picker", gender, selected);
  const selectedBook = selected ? BOOK_AVATAR_BY_ID[selected] : undefined;
  const select = (asset?: string) => { setSelected(asset); onSelect(asset); onClose(); };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={styles.header}><Text style={[styles.title, { color: colors.foreground }]}>Choose avatar</Text><Pressable onPress={onClose}><MaterialIcons name="close" size={28} color={colors.foreground} /></Pressable></View>
        <View style={[styles.previewRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <AvatarImage id="picker" avatarAsset={selected} gender={gender} size={64} />
          <View style={{ flex: 1 }}><Text style={[styles.previewLabel, { color: colors.muted }]}>SELECTED AVATAR</Text><Text style={[styles.previewName, { color: colors.foreground }]}>{selectedBook?.book || selectedDefinition?.animal || "Default"}</Text></View>
          <View style={{ gap: 6 }}><Pressable onPress={onUpload} style={[styles.clearButton, { borderColor: colors.border }]}><Text style={{ color: colors.primary, fontWeight: "800" }}>Upload photo</Text></Pressable><Pressable onPress={() => select(undefined)} style={[styles.clearButton, { borderColor: colors.border }]}><Text style={{ color: colors.primary, fontWeight: "800" }}>Default</Text></Pressable></View>
        </View>
        <ScrollView horizontal style={styles.tabsScroll} contentContainerStyle={styles.tabs} showsHorizontalScrollIndicator={false} bounces={false} nestedScrollEnabled>
          {[...STYLE_ORDER, "Books" as const, "Shiny" as const].map((tab) => <Pressable key={tab} onPress={() => setStyle(tab)} style={[styles.tab, { borderColor: colors.border }, style === tab && { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={{ color: style === tab ? "#fff" : colors.foreground, fontWeight: "800", fontSize: 12 }}>{tab === "Shiny" || tab === "Books" ? tab : STYLE_LABELS[tab]}</Text></Pressable>)}
        </ScrollView>
        {style !== "Shiny" && style !== "Books" && <View style={styles.genderRow}>{(["all", "m", "f"] as const).map((value) => <Pressable key={value} onPress={() => setSelectedGender(value)} style={[styles.genderButton, { borderColor: colors.border }, selectedGender === value && { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={{ color: selectedGender === value ? "#fff" : colors.foreground, fontWeight: "800" }}>{value === "all" ? "All" : value === "m" ? "Male" : "Female"}</Text></Pressable>)}</View>}
        {style === "Books" ? (
          <FlatList
            key="book-avatar-grid"
            data={books}
            keyExtractor={(book) => book.id}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.grid}
            extraData={[selected, unlockedBookIds]}
            initialNumToRender={9}
            maxToRenderPerBatch={9}
            windowSize={5}
            removeClippedSubviews
            renderItem={({ item: book }) => {
              const isUnlocked = unlockedBooks.has(book.id);
              return <Pressable onPress={() => isUnlocked && select(book.id)} style={[styles.avatarCard, { borderColor: selected === book.id ? colors.primary : colors.border, backgroundColor: colors.surface }, selected === book.id && { borderWidth: 3 }, !isUnlocked && { opacity: 0.55 }]}><Image source={book.thumbnail} style={styles.avatarImage} /><Text numberOfLines={1} style={[styles.avatarName, { color: colors.foreground }]}>{isUnlocked ? book.book : "Locked"}</Text><Text numberOfLines={1} style={[styles.bookHint, { color: colors.muted }]}>{isUnlocked ? "Collected" : "Complete book"}</Text></Pressable>;
            }}
          />
        ) : style === "Shiny" ? (
          <FlatList
            key="shiny-avatar-grid"
            data={SHINY_ACHIEVEMENTS.filter((a) => "avatarId" in a)}
            keyExtractor={(achievement) => achievement.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.grid}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews
            renderItem={({ item: achievement }) => {
              const isUnlocked = unlocked.has(achievement.avatarId);
              const thumbnail = SHINY_AVATAR_THUMBNAILS[achievement.avatarId as keyof typeof SHINY_AVATAR_THUMBNAILS];
              if (!thumbnail) return null;
              return <Pressable onPress={() => isUnlocked ? select(achievement.avatarId) : undefined} style={[styles.shinyCard, { borderColor: colors.border, backgroundColor: colors.surface }]}><Image source={thumbnail} style={[styles.shinyImage, !isUnlocked && { opacity: 0.18 }]} /><Text style={[styles.shinyName, { color: colors.foreground }]}>{isUnlocked ? achievement.name : "Locked"}</Text><Text style={[styles.hint, { color: colors.muted }]}>{achievement.hint}</Text></Pressable>;
            }}
          />
        ) : (
          <FlatList
            key="regular-avatar-grid"
            data={regular}
            keyExtractor={(avatar) => avatar.id}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.grid}
            extraData={selected}
            initialNumToRender={9}
            maxToRenderPerBatch={9}
            windowSize={5}
            removeClippedSubviews
            renderItem={({ item: avatar }) => <Pressable onPress={() => select(avatar.id)} style={[styles.avatarCard, { borderColor: selected === avatar.id ? colors.primary : colors.border, backgroundColor: colors.surface }, selected === avatar.id && { borderWidth: 3 }]}><Image source={avatar.thumbnail} style={styles.avatarImage} /><Text numberOfLines={1} style={[styles.avatarName, { color: colors.foreground }]}>{avatar.animal}</Text></Pressable>}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  auraParticle: { position: "absolute", zIndex: 3, shadowColor: "#FFFFFF", shadowOpacity: 0.9, shadowRadius: 4, elevation: 3 },
  modal: { flex: 1, paddingTop: 52, paddingHorizontal: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "900" },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 12, borderRadius: 18, borderWidth: 1, marginBottom: 14 },
  previewLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  previewName: { fontSize: 20, fontWeight: "900", textTransform: "capitalize" },
  clearButton: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabs: { gap: 8, paddingBottom: 12, paddingRight: 8, alignItems: "center" },
  tab: { flexGrow: 0, flexShrink: 0, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  genderRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  genderButton: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  grid: { paddingBottom: 40, paddingTop: 2 },
  gridRow: { justifyContent: "space-between", gap: 10, marginBottom: 12 },
  avatarCard: { flex: 1, minWidth: 0, alignItems: "center", borderWidth: 1.5, borderRadius: 16, padding: 8 },
  avatarImage: { width: 78, height: 78, borderRadius: 39 },
  avatarName: { marginTop: 5, fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  shinyCard: { flex: 1, alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 10 },
  shinyImage: { width: 118, height: 118, borderRadius: 59 },
  shinyName: { fontWeight: "900", marginTop: 5 },
  hint: { fontSize: 11, textAlign: "center", marginTop: 4 },
  bookHint: { fontSize: 10, textAlign: "center", marginTop: 3 },
});
