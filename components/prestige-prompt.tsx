// End-of-fast prestige prompt — "Begin Again?"
//
// When a fast completes, if that fast is the current prestige offer (the
// longest fast started since the last prestige) the player is asked once
// whether they want to begin again: the prompt names the reward that
// fast's length grants (a Crown for 365+ days, a permanent devotion bonus
// below that) and what a prestige resets. "Not yet" is remembered per
// fast — the offer itself stays available from the Hometown button.

import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { isFastCompleted, type PersonalFast } from "@/lib/prayercircle-fasting";
import {
  loadPrestigeLevel,
  loadPrestigeState,
  markFastPrompted,
  performPrestige,
  prestigeOffer,
  totalPrestigeMultiplier,
  type PrestigeOffer,
} from "@/lib/prestige";

export function PrestigePrompt({ fasts }: { fasts: PersonalFast[] }) {
  const [offer, setOffer] = useState<PrestigeOffer | null>(null);
  const [crowns, setCrowns] = useState(0);
  const [visible, setVisible] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (!fasts || fasts.length === 0) return;
        const state = await loadPrestigeState();
        const next = prestigeOffer(fasts, state);
        if (!live || !next) return;
        if (state.promptedFastIds.includes(next.fastId)) return;
        const fast = fasts.find((f) => f.id === next.fastId);
        if (!fast || !isFastCompleted(fast)) return; // the prompt belongs to a fast's end
        const level = await loadPrestigeLevel();
        if (!live) return;
        setCrowns(level);
        setOffer(next);
        setVisible(true);
      } catch {}
    })();
    return () => {
      live = false;
    };
  }, [fasts]);

  if (!offer) return null;

  const dismiss = async () => {
    setVisible(false);
    try {
      await markFastPrompted(offer.fastId);
    } catch {}
  };

  const confirm = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const res = await performPrestige(fasts);
      await markFastPrompted(offer.fastId).catch(() => undefined);
      setVisible(false);
      if (res) {
        Alert.alert(
          "You began again",
          res.kind === "crown"
            ? `Crown ${res.crowns}! Every coin your town earns is now x${totalPrestigeMultiplier(res.crowns, res.devotionBonus)}. The City awaits in your Hometown.`
            : `Your devotion bonus is now +${Math.round(res.devotionBonus * 100)}% on every coin your town earns — forever.`,
        );
      }
    } catch {
      busyRef.current = false;
    }
  };

  const rewardLine =
    offer.kind === "crown"
      ? "A Crown — every coin your town earns is doubled, and the City appears."
      : `A permanent +${Math.round(offer.bonus * 100)}% bonus on every coin your town earns.`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 }}
        onPress={dismiss}
      >
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, width: "100%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <MaterialIcons name="workspace-premium" size={24} color="#B8912C" />
            <Text style={{ fontSize: 19, fontWeight: "800", color: "#92400E", marginLeft: 8 }}>Your fast is complete</Text>
          </View>
          <Text style={{ fontSize: 15, color: "#1F2937", lineHeight: 21 }}>
            Begin again? Your {offer.durationDays}-day fast grants{" "}
            <Text style={{ fontWeight: "800" }}>{rewardLine}</Text>
          </Text>
          <Text style={{ fontSize: 13, color: "#6B7280", lineHeight: 19, marginTop: 10 }}>
            Your town, coin balance and gear would reset. Your prayer streak, XP, collections, Garden of Remembrance
            {crowns > 0 || offer.kind === "crown" ? ", Crowns" : ""} and devotion stay.
          </Text>
          <Pressable
            onPress={confirm}
            style={{ backgroundColor: "#B8912C", borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 16, flexDirection: "row", justifyContent: "center" }}
          >
            <MaterialIcons name="workspace-premium" size={18} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15, marginLeft: 6 }}>
              {offer.kind === "crown" ? `Begin Again — Crown ${crowns + 1}` : `Begin Again — +${Math.round(offer.bonus * 100)}% forever`}
            </Text>
          </Pressable>
          <Pressable onPress={dismiss} style={{ borderRadius: 12, paddingVertical: 11, alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 14 }}>Not yet</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
