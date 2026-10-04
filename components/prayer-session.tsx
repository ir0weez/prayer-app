import { useEffect, useRef, useState } from "react";
import { BackHandler, Modal, Pressable, StatusBar, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AvatarImage } from "@/components/avatar-system";
import { useColors } from "@/hooks/use-colors";
import type { Person } from "@/lib/prayercircle-data";

type Props = {
  visible: boolean;
  people: Person[];
  onPray: (personId: string) => void;
  onClose: () => void;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function PrayerSession({ visible, people, onPray, onClose }: Props) {
  const colors = useColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [prayedCount, setPrayedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when opened, setup immersive mode and back handler
  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setElapsedSeconds(0);
      setPrayedCount(0);
      setIsFinished(false);
      // Hide status bar for immersive prayer time
      StatusBar.setHidden(true);
      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
      // Block Android back button during prayer session
      const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return true; // Prevent default back behavior
      });
      return () => {
        backHandler.remove();
        if (timerRef.current) clearInterval(timerRef.current);
        // Restore status bar
        StatusBar.setHidden(false);
      };
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  // Stop timer when finished
  useEffect(() => {
    if (isFinished && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [isFinished]);

  if (!visible) return null;

  const currentPerson = people[currentIndex];
  const isLast = currentIndex >= people.length - 1;

  const handlePray = () => {
    if (!currentPerson) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onPray(currentPerson.id);
    setPrayedCount((c) => c + 1);
    if (isLast) {
      setIsFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleSkip = () => {
    if (!currentPerson) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      setIsFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {/* Timer */}
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", letterSpacing: 1, marginBottom: 8 }}>
          PRAYER TIME
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 56, fontWeight: "900", fontVariant: ["tabular-nums"], marginBottom: 24 }}>
          {formatTime(elapsedSeconds)}
        </Text>

        {!isFinished && currentPerson ? (
          <>
            {/* Progress */}
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", marginBottom: 16 }}>
              {currentIndex + 1} of {people.length}
            </Text>

            {/* Person card */}
            <View style={{ alignItems: "center", backgroundColor: colors.surface, borderRadius: 20, padding: 32, width: "100%", borderWidth: 1, borderColor: colors.border }}>
              <AvatarImage
                id={currentPerson.id}
                name={currentPerson.name}
                avatarAsset={currentPerson.avatarAsset}
                photoUri={currentPerson.photoUri}
                size={96}
              />
              <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "900", marginTop: 16, textAlign: "center" }}>
                {currentPerson.name}
              </Text>
              {currentPerson.prayerNote ? (
                <Text style={{ color: colors.muted, fontSize: 15, textAlign: "center", marginTop: 8, lineHeight: 22 }}>
                  {currentPerson.prayerNote}
                </Text>
              ) : null}
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: 16, marginTop: 32, width: "100%" }}>
              <Pressable
                onPress={handleSkip}
                style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 18, alignItems: "center" }}
              >
                <Text style={{ color: colors.muted, fontSize: 17, fontWeight: "800" }}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={handlePray}
                style={{ flex: 2, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              >
                <MaterialIcons name="favorite" size={20} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "800" }}>Pray</Text>
              </Pressable>
            </View>

            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 16 }}>
              Each prayer earns 10 XP
            </Text>
          </>
        ) : (
          /* Summary */
          <View style={{ alignItems: "center", width: "100%" }}>
            <MaterialIcons name="check-circle" size={72} color={colors.primary} />
            <Text style={{ color: colors.foreground, fontSize: 26, fontWeight: "900", marginTop: 20, textAlign: "center" }}>
              Prayer Time Complete
            </Text>
            <Text style={{ color: colors.muted, fontSize: 16, marginTop: 12, textAlign: "center", lineHeight: 24 }}>
              You prayed for {prayedCount} {prayedCount === 1 ? "person" : "people"}{"\n"}
              in {formatTime(elapsedSeconds)}
            </Text>
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "800", marginTop: 16 }}>
              +{prayedCount * 10} XP earned
            </Text>
            <Pressable
              onPress={handleFinish}
              style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48, marginTop: 32 }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "800" }}>Finish</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}
