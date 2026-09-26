import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { formatIsoDateForDisplay } from "@/lib/prayercircle-data";
import { removeReachedStamp, updateReachedStamp, type ReachedStamp } from "@/lib/reached-stamps";
import { getTodayISOString } from "@/lib/prayercircle-data";

export function ReachedStampRow({
  stamps,
  onChange,
}: {
  stamps: ReachedStamp[];
  onChange?: (stamps: ReachedStamp[]) => void;
}) {
  const colors = useColors();
  const today = getTodayISOString();
  const todayStamps = useMemo(() => stamps.filter((stamp) => stamp.date === today), [stamps, today]);
  const [editingStamp, setEditingStamp] = useState<ReachedStamp | null>(null);
  const [note, setNote] = useState("");

  if (todayStamps.length === 0) return null;

  const openMenu = (stamp: ReachedStamp) => {
    Alert.alert(stamp.personName, "Reached stamp", [
      { text: "Cancel", style: "cancel" },
      { text: "Edit", onPress: () => { setEditingStamp(stamp); setNote(stamp.note || ""); } },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => Alert.alert("Delete stamp?", "This only removes the stamp; it will not unmark the person as reached.", [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => onChange?.(removeReachedStamp(stamps, stamp.id)) },
        ]),
      },
    ]);
  };

  const saveNote = () => {
    if (!editingStamp) return;
    onChange?.(updateReachedStamp(stamps, editingStamp.id, note));
    setEditingStamp(null);
    setNote("");
  };

  return (
    <View style={[styles.container, { borderTopColor: colors.border }]}>
      <View style={styles.headingRow}>
        <MaterialIcons name="verified" size={16} color={colors.primary} />
        <Text style={[styles.heading, { color: colors.foreground }]}>Reached today</Text>
      </View>
      <View style={styles.row}>
        {todayStamps.map((stamp, index) => (
          <Pressable
            key={stamp.id}
            accessibilityRole="button"
            accessibilityLabel={`Reached stamp for ${stamp.personName}`}
            onLongPress={() => openMenu(stamp)}
            delayLongPress={350}
            style={({ pressed }) => [
              styles.stamp,
              { borderColor: colors.primary, backgroundColor: colors.background, transform: [{ rotate: `${index % 2 === 0 ? -2 : 2}deg` }] },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text numberOfLines={1} style={[styles.name, { color: colors.primary }]}>{stamp.personName}</Text>
            {!!stamp.note && <Text numberOfLines={1} style={[styles.note, { color: colors.muted }]}>{stamp.note}</Text>}
            <Text style={[styles.date, { color: colors.foreground }]}>{formatIsoDateForDisplay(stamp.date)}</Text>
          </Pressable>
        ))}
      </View>
      <Modal transparent visible={Boolean(editingStamp)} animationType="fade" onRequestClose={() => setEditingStamp(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit reached stamp</Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>{editingStamp?.personName}</Text>
            <TextInput
              autoFocus
              value={note}
              onChangeText={setNote}
              placeholder="Where you met or how you spoke"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditingStamp(null)} style={({ pressed }) => [styles.secondary, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.muted, fontWeight: "700" }}>Cancel</Text></Pressable>
              <Pressable onPress={saveNote} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && { opacity: 0.7 }]}><Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Save</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 18, paddingTop: 12, paddingBottom: 22, borderTopWidth: 1 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  heading: { fontSize: 13, fontWeight: "800", letterSpacing: 0.2 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "flex-start" },
  stamp: { width: 116, minHeight: 68, paddingHorizontal: 8, paddingVertical: 7, borderWidth: 1.5, borderStyle: "dashed", borderRadius: 7, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 12, lineHeight: 15, fontWeight: "900", textTransform: "uppercase" },
  note: { maxWidth: 100, marginTop: 2, fontSize: 9, lineHeight: 12, fontWeight: "600" },
  date: { marginTop: 3, fontSize: 9, lineHeight: 11, fontWeight: "800", letterSpacing: 0.5 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 22 },
  modal: { width: "100%", maxWidth: 360, borderRadius: 16, padding: 18, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: "900" },
  modalSubtitle: { fontSize: 13, fontWeight: "600" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  secondary: { minWidth: 82, minHeight: 42, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  primary: { minWidth: 82, minHeight: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
