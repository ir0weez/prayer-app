import { useEffect, useRef, useState } from "react";
import { AppState, BackHandler, Dimensions, Modal, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AvatarImage } from "@/components/avatar-system";
import { useColors } from "@/hooks/use-colors";
import type { Person } from "@/lib/prayercircle-data";

type Props = {
  visible: boolean;
  people: Person[];
  onPray: (personId: string, position?: { x: number; y: number }) => void;
  onTimeBonus: (position?: { x: number; y: number }) => void;
  onClose: () => void;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function PrayerSession({ visible, people, onPray, onTimeBonus, onClose }: Props) {
  const colors = useColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [prayedCount, setPrayedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sessionPeople, setSessionPeople] = useState<Person[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBonusMinute = useRef(0);
  const sessionStartRef = useRef<number>(0);

  // Corner position for XP floater (top-right)
  const bonusPosition = { x: Dimensions.get("window").width - 60, y: 120 };

  // Sync elapsed time from wall clock (survives screen-off)
  const syncElapsedFromClock = () => {
    if (sessionStartRef.current > 0) {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      setElapsedSeconds(elapsed);
      // Award any missed 5-min bonuses
      const minutes = Math.floor(elapsed / 300);
      while (lastBonusMinute.current < minutes) {
        lastBonusMinute.current += 1;
        onTimeBonus(bonusPosition);
      }
    }
  };

  // Reset when opened, setup back handler
  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setElapsedSeconds(0);
      setPrayedCount(0);
      setIsFinished(false);
      setTotalCount(people.length);
      setSessionPeople([...people]);
      lastBonusMinute.current = 0;
      sessionStartRef.current = Date.now();
      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
      // Handle screen off/on: recalc from wall clock when foregrounded
      const appStateSub = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          syncElapsedFromClock();
        }
      });
      // Block Android back button during prayer session
      const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return true; // Prevent default back behavior
      });
      return () => {
        backHandler.remove();
        appStateSub.remove();
        if (timerRef.current) clearInterval(timerRef.current);
        sessionStartRef.current = 0;
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

  // Award +10 XP every 5 minutes in prayer mode (with corner floater)
  useEffect(() => {
    const minutes = Math.floor(elapsedSeconds / 300);
    if (minutes > lastBonusMinute.current) {
      lastBonusMinute.current = minutes;
      onTimeBonus(bonusPosition);
    }
  }, [elapsedSeconds, onTimeBonus]);

  if (!visible) return null;

  const currentPerson = sessionPeople[currentIndex];
  const isLast = currentIndex >= totalCount - 1;

  const handlePray = (e: any) => {
    if (!currentPerson) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Use press position if available, otherwise center of screen
    const position = e?.nativeEvent?.pageX != null
      ? { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }
      : { x: Dimensions.get("window").width / 2, y: Dimensions.get("window").height / 2 };
    onPray(currentPerson.id, position);
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
              {currentIndex + 1} of {totalCount}
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
              {/* Prayer items list */}
              {currentPerson.prayerItems && currentPerson.prayerItems.filter(item => !item.isDone).length > 0 && (
                <View style={{ width: "100%", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                  {currentPerson.prayerItems.filter(item => !item.isDone).slice(0, 5).map((item) => (
                    <View key={item.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6 }}>
                      <MaterialIcons
                        name={item.isUrgent ? "priority-high" : "chevron-right"}
                        size={18}
                        color={item.isUrgent ? colors.error : colors.muted}
                      />
                      <Text style={{ color: colors.foreground, fontSize: 14, marginLeft: 8, flex: 1 }}>
                        {item.title}
                      </Text>
                    </View>
                  ))}
                  {currentPerson.prayerItems.filter(item => !item.isDone).length > 5 && (
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, textAlign: "center" }}>
                      +{currentPerson.prayerItems.filter(item => !item.isDone).length - 5} more
                    </Text>
                  )}
                </View>
              )}
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
