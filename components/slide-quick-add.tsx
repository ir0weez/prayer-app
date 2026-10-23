import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { useSkin } from "@/hooks/use-skin";

export interface QuickAddOption {
  label: string;
  icon: string;
  color: string;
}

/** Layout constants — shared with the parent for hit-testing. */
export const QA_BTN = 56;
export const QA_GAP = 10;
export const QA_PAD = 14;
export const QA_ROW_WIDTH = 5 * QA_BTN + 4 * QA_GAP + QA_PAD * 2;

interface SlideQuickAddPickerProps {
  options: QuickAddOption[];
  /** Root-relative position for the row (computed by the parent). */
  left: number;
  top: number;
  headerText: string;
  hoveredIndex: number;
  onSelectOption: (index: number) => void;
  onDismiss: () => void;
  /** Row layout, root-relative — used by the parent for slide hit-testing. */
  onRowLayout: (x: number, y: number, width: number, height: number) => void;
}

/**
 * Facebook-reaction-style quick-add picker. Appears above a long-pressed
 * white block; the option under the sliding thumb scales up. Motion is
 * gentle sine-ease only — no bounce or spring.
 */
export function SlideQuickAddPicker({
  options,
  left,
  top,
  headerText,
  hoveredIndex,
  onSelectOption,
  onDismiss,
  onRowLayout,
}: SlideQuickAddPickerProps) {
  const colors = useColors();
  const { isSkinned, isPaper, isEightBit, tokens: skinTokens } = useSkin();
  const scales = useRef(options.map(() => new Animated.Value(1))).current;
  const enters = useRef(options.map(() => new Animated.Value(0))).current;
  const rowOpacity = useRef(new Animated.Value(0)).current;
  const rowTranslateY = useRef(new Animated.Value(10)).current;

  // Entrance: the row fades and rises in; buttons stagger in gently.
  // v202: under Paper the row is a sheet laid down — the skin's own
  // settle duration on a sine ease (the same curve as Paper's
  // reanimated settle bezier); every other skin keeps the original
  // 180ms quad fade, byte for byte.
  const enterDuration = isPaper ? skinTokens.motion.settleDuration : 180;
  const enterEasing = isPaper ? Easing.inOut(Easing.sin) : Easing.out(Easing.quad);
  // v203: under 8-bit the picker does not fade — it POPS in, one
  // hard step per element (RN Animated's step easing): the row
  // snaps in fast, then the buttons pop in their stagger order.
  const rowDuration = isEightBit ? 90 : enterDuration;
  const rowEasing = isEightBit ? Easing.step1 : enterEasing;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(rowOpacity, { toValue: 1, duration: rowDuration, easing: rowEasing, useNativeDriver: true }),
      Animated.timing(rowTranslateY, { toValue: 0, duration: rowDuration, easing: rowEasing, useNativeDriver: true }),
    ]).start();
    enters.forEach((a, i) => {
      Animated.timing(a, {
        toValue: 1,
        duration: isEightBit ? 120 : isPaper ? 300 : 150,
        delay: 30 + i * 40,
        easing: rowEasing,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  // Hover: the option under the thumb scales up smoothly.
  useEffect(() => {
    scales.forEach((s, i) => {
      Animated.timing(s, {
        toValue: i === hoveredIndex ? 1.35 : 1,
        duration: 150,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start();
    });
  }, [hoveredIndex]);

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
      {/* Tap outside the row to dismiss */}
      <Pressable
        accessibilityLabel="Dismiss"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        onPress={onDismiss}
      />
      <Animated.View
        onLayout={(e) => {
          const { x, y, width, height } = e.nativeEvent.layout;
          onRowLayout(x, y, width, height);
        }}
        style={{
          position: "absolute",
          left,
          top,
          width: QA_ROW_WIDTH,
          backgroundColor: isSkinned ? skinTokens.surface ?? colors.surface : colors.surface,
          ...(isSkinned ? skinTokens.cardShadow ?? {} : {}),
          borderRadius: 24,
          paddingHorizontal: QA_PAD,
          paddingTop: 10,
          paddingBottom: 12,
          alignItems: "center",
          opacity: rowOpacity,
          transform: [{ translateY: rowTranslateY }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 }}>
          {headerText}
        </Text>
        <View style={{ flexDirection: "row", gap: QA_GAP }}>
          {options.map((opt, i) => {
            const lift = scales[i].interpolate({ inputRange: [1, 1.35], outputRange: [0, -8] });
            return (
              <Animated.View key={opt.label} style={{ opacity: enters[i], alignItems: "center" }}>
                <Pressable accessibilityLabel={opt.label} onPress={() => onSelectOption(i)} style={{ alignItems: "center" }}>
                  <Animated.View
                    style={{
                      width: QA_BTN,
                      height: QA_BTN,
                      borderRadius: QA_BTN / 2,
                      backgroundColor: opt.color,
                      alignItems: "center",
                      justifyContent: "center",
                      transform: [{ translateY: lift }, { scale: scales[i] }],
                    }}
                  >
                    <MaterialIcons name={opt.icon as any} size={25} color="#FFFFFF" />
                  </Animated.View>
                  <Text
                    style={{
                      color: hoveredIndex === i ? colors.text : colors.muted,
                      fontSize: 9,
                      fontWeight: "700",
                      marginTop: 4,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}
