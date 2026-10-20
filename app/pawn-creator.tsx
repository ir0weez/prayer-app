import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { PawnPreview } from "@/components/pawn-preview";
import {
  PAWN_ACCESSORIES,
  PAWN_BODY_COLORS,
  PAWN_EYE_STYLES,
  PAWN_GENDERS,
  PAWN_BODY_STYLES,
  PAWN_MOUTH_STYLES,
  defaultPawn,
  loadCustomPawn,
  saveCustomPawn,
  type CustomPawn,
  type PawnAccessory,
  type PawnEyeStyle,
  type PawnGender,
  type PawnHairStyle,
  type PawnBodyStyle,
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

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}>
        {/* header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#FFFFFF", textAlign: "center" }}>Forge Your Hero</Text>
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
            placeholder="Name your Hero"
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

        {/* body shape */}
        <SectionLabel>BODY SHAPE</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
          {PAWN_BODY_STYLES.map((opt) => {
            const selected = draft.bodyStyle === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setDraft({ ...draft, bodyStyle: opt.id as PawnBodyStyle })}
                style={{
                  width: 72, height: 88, borderRadius: 12, alignItems: "center", justifyContent: "center",
                  backgroundColor: selected ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)",
                  borderWidth: selected ? 2 : 0, borderColor: "#FFFFFF",
                }}
              >
                <PawnPreview pawn={{ ...draft, bodyStyle: opt.id as PawnBodyStyle, beardLength: 0, hairLength: 0 }} size={52} variant="face" />
                <Text style={{ fontSize: 10, color: selected ? "#FFFFFF" : "#A78BFA", marginTop: 2, fontWeight: selected ? "700" : "400" }}>{opt.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <SectionLabel>BODY COLOR</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {PAWN_BODY_COLORS.map((c) => {
            const selected = draft.bodyColor === c;
            return (
              <Pressable key={c} onPress={() => set("bodyColor", c)} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c, borderWidth: selected ? 3 : 0, borderColor: "#FFFFFF", opacity: selected ? 1 : 0.65 }} />
            );
          })}
        </View>

        {/* gender */}
        <SectionLabel>GENDER</SectionLabel>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {PAWN_GENDERS.map((opt) => {
            const selected = draft.gender === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => set("gender", opt.id as PawnGender)}
                style={{ flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: CARD, borderRadius: 12, borderWidth: selected ? 2 : 0, borderColor: "#FFFFFF" }}
              >
                <MaterialIcons name={opt.id === "male" ? "male" : "female"} size={22} color={selected ? "#FFFFFF" : LABEL} />
                <Text style={{ fontSize: 13, color: selected ? "#FFFFFF" : LABEL, fontWeight: selected ? "700" : "400", marginTop: 4 }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* barbershop link for hair/beard */}
        <Pressable onPress={() => router.push("/barbershop")} style={{ marginTop: 8, marginBottom: 8, flexDirection: "row", alignItems: "center", backgroundColor: CARD, borderRadius: 12, padding: 12 }}>
          <MaterialIcons name="content-cut" size={20} color={LABEL} />
          <Text style={{ fontSize: 12, color: LABEL, marginLeft: 8, flex: 1 }}>
            Hair & beard styles live at the barbershop. Beards grow over time.
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={LABEL} />
        </Pressable>

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
                <PawnPreview pawn={{ ...draft, eyeStyle: opt.id as PawnEyeStyle, mouthStyle: "flat", accessory: "none", beardLength: 0, lastTrim: new Date().toISOString() }} size={52} variant="face" />
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
                <PawnPreview pawn={{ ...draft, mouthStyle: opt.id as PawnMouthStyle, eyeStyle: "round", accessory: "none", beardLength: 0, lastTrim: new Date().toISOString() }} size={52} variant="face" />
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
                <PawnPreview pawn={{ ...draft, accessory: opt.id as PawnAccessory, eyeStyle: "round", mouthStyle: "smile", beardLength: 0, lastTrim: new Date().toISOString() }} size={52} variant="face" />
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
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>Save Hero</Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: 12, color: LABEL, textAlign: "center", marginTop: 12 }}>
          Gear shops coming soon — clothes, armor, weapons, tools.
        </Text>
      </ScrollView>
    </View>
  );
}
