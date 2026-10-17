import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { PawnPreview } from "@/components/pawn-preview";
import {
  PAWN_ACCESSORIES,
  PAWN_BODY_COLORS,
  PAWN_EYE_STYLES,
  PAWN_MOUTH_STYLES,
  defaultPawn,
  loadCustomPawn,
  saveCustomPawn,
  type CustomPawn,
  type PawnAccessory,
  type PawnEyeStyle,
  type PawnMouthStyle,
} from "@/lib/pawn";

const BG = "#1E1B4B";
const CARD = "rgba(255,255,255,0.08)";
const LABEL = "#A78BFA";
const ACCENT = "#7C5CFF";

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: "700", color: LABEL, letterSpacing: 1, marginBottom: 8, marginTop: 16 }}>
      {children}
    </Text>
  );
}

export default function PawnCreatorScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState<CustomPawn>(() => defaultPawn());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadCustomPawn().then((p) => {
      if (p) setDraft(p);
      setLoaded(true);
    });
  }, []);

  const set = <K extends keyof CustomPawn>(key: K, value: CustomPawn[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    const pawn: CustomPawn = {
      ...draft,
      name: draft.name.trim() || "Pebble",
      id: draft.id || `pawn-${Date.now()}`,
    };
    await saveCustomPawn(pawn);
    router.back();
  };

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: BG }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* decorative background shapes */}
      <View pointerEvents="none" style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(124,92,255,0.18)" }} />
      <View pointerEvents="none" style={{ position: "absolute", bottom: 120, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(76,29,149,0.35)" }} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#FFFFFF", textAlign: "center" }}>Forge Your Pawn</Text>
            <Text style={{ fontSize: 13, color: LABEL, textAlign: "center", marginTop: 2 }}>Choose your companion for the journey</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* preview */}
        <View style={{ alignItems: "center", backgroundColor: CARD, borderRadius: 16, paddingVertical: 24, marginTop: 8 }}>
          <PawnPreview pawn={draft} size={150} />
          <TextInput
            value={draft.name}
            onChangeText={(t) => set("name", t)}
            placeholder="Name your pawn"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={{
              marginTop: 12,
              color: "#FFFFFF",
              fontSize: 17,
              fontWeight: "700",
              textAlign: "center",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              minWidth: 200,
            }}
          />
        </View>

        {/* body color */}
        <SectionLabel>BODY COLOR</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {PAWN_BODY_COLORS.map((c) => {
            const selected = draft.bodyColor === c;
            return (
              <Pressable key={c} onPress={() => set("bodyColor", c)} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c, borderWidth: selected ? 3 : 0, borderColor: "#FFFFFF", opacity: selected ? 1 : 0.65 }} />
            );
          })}
        </View>

        {/* eyes */}
        <SectionLabel>EYES</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {PAWN_EYE_STYLES.map((opt) => {
            const selected = draft.eyeStyle === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => set("eyeStyle", opt.id as PawnEyeStyle)}
                style={{ width: 76, alignItems: "center", backgroundColor: CARD, borderRadius: 12, paddingVertical: 8, borderWidth: selected ? 2 : 0, borderColor: "#FFFFFF" }}
              >
                <PawnPreview pawn={{ ...draft, eyeStyle: opt.id as PawnEyeStyle, mouthStyle: "flat", accessory: "none" }} size={52} />
                <Text style={{ fontSize: 11, color: selected ? "#FFFFFF" : LABEL, fontWeight: selected ? "700" : "400", marginTop: 4 }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* mouth */}
        <SectionLabel>MOUTH</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {PAWN_MOUTH_STYLES.map((opt) => {
            const selected = draft.mouthStyle === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => set("mouthStyle", opt.id as PawnMouthStyle)}
                style={{ width: 76, alignItems: "center", backgroundColor: CARD, borderRadius: 12, paddingVertical: 8, borderWidth: selected ? 2 : 0, borderColor: "#FFFFFF" }}
              >
                <PawnPreview pawn={{ ...draft, mouthStyle: opt.id as PawnMouthStyle, eyeStyle: "round", accessory: "none" }} size={52} />
                <Text style={{ fontSize: 11, color: selected ? "#FFFFFF" : LABEL, fontWeight: selected ? "700" : "400", marginTop: 4 }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* accessory */}
        <SectionLabel>ACCESSORY</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {PAWN_ACCESSORIES.map((opt) => {
            const selected = draft.accessory === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => set("accessory", opt.id as PawnAccessory)}
                style={{ width: 76, alignItems: "center", backgroundColor: CARD, borderRadius: 12, paddingVertical: 8, borderWidth: selected ? 2 : 0, borderColor: "#FFFFFF" }}
              >
                <PawnPreview pawn={{ ...draft, accessory: opt.id as PawnAccessory, eyeStyle: "round", mouthStyle: "smile" }} size={52} />
                <Text style={{ fontSize: 11, color: selected ? "#FFFFFF" : LABEL, fontWeight: selected ? "700" : "400", marginTop: 4 }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* actions */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 28 }}>
          <Pressable onPress={() => router.back()} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: CARD, alignItems: "center" }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 15 }}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleSave} style={{ flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: ACCENT, alignItems: "center" }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>Save Pawn</Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: 12, color: LABEL, textAlign: "center", marginTop: 12 }}>
          Gear shops coming soon — clothes, armor, weapons, tools.
        </Text>
      </ScrollView>
    </View>
  );
}
