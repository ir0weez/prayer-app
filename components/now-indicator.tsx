import { View, Text } from "react-native";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useColors } from "@/hooks/use-colors";
import { useSkin } from "@/hooks/use-skin";
import { TERM_BG, TERM_MID, TERM_PHOS } from "@/lib/skin-themes";

/**
 * NOW Indicator Component with pulsing red dot
 * Shows current time position in schedule with live recording aesthetic
 */
export function NowPill() {
  const colors = useColors();
  const { tokens: skinTokens } = useSkin();
  const pulseAnim = useSharedValue(0);

  useEffect(() => {
    // Terminal (v186): the pulse goes hard — a stepped on/off blink
    // (the live strip's block cursor), never a smooth fade.
    const easing = skinTokens.isTerminal ? Easing.steps(1) : Easing.inOut(Easing.ease);
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing }),
        withTiming(0.4, { duration: 600, easing })
      ),
      -1
    );
  }, [skinTokens.isTerminal]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnim.value, [0, 1], [0.4, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={{ width: 62, height: 24, paddingHorizontal: 4, borderRadius: (skinTokens.isEightBit || skinTokens.isTerminal) ? 2 : 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: skinTokens.isTerminal ? TERM_PHOS : skinTokens.isEightBit ? '#FFC531' : '#8B5CF6', borderWidth: skinTokens.isTerminal ? 1 : skinTokens.isEightBit ? 2 : 1, borderColor: skinTokens.isTerminal ? TERM_PHOS : skinTokens.isEightBit ? '#150A2E' : '#A78BFA', alignSelf: 'flex-start' }}>
      <Text style={{ color: skinTokens.isTerminal ? TERM_BG : skinTokens.isEightBit ? '#241547' : '#FFFFFF', fontSize: 9, lineHeight: 11, fontWeight: '700', ...(skinTokens.displayFont ? { fontFamily: skinTokens.displayFont, fontSize: 8 } : {}) }}>NOW</Text>
      <ReAnimated.View style={[{ width: 5, height: 5, borderRadius: (skinTokens.isEightBit || skinTokens.isTerminal) ? 0 : 2.5, backgroundColor: skinTokens.isTerminal ? TERM_BG : '#EF4444' }, pulseStyle]} />
    </View>
  );
}

export function NowIndicator() {
  const colors = useColors();
  const { tokens: skinTokens } = useSkin();
  const isTerminal = skinTokens.isTerminal;
  const pulseAnim = useSharedValue(0);

  useEffect(() => {
    const easing = isTerminal ? Easing.steps(1) : Easing.inOut(Easing.ease);
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing }),
        withTiming(0.4, { duration: 600, easing })
      ),
      -1
    );
  }, [isTerminal]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnim.value, [0, 1], [0.4, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={{ marginVertical: 12, marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ backgroundColor: isTerminal ? TERM_PHOS : colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: isTerminal ? 2 : 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: isTerminal ? TERM_BG : colors.background, fontSize: 11, fontWeight: '600', ...(skinTokens.displayFont ? { fontFamily: skinTokens.displayFont, fontSize: 12 } : {}) }}>NOW</Text>
        <ReAnimated.View
          style={[
            { width: 6, height: 6, borderRadius: isTerminal ? 0 : 3, backgroundColor: isTerminal ? TERM_BG : '#EF4444' },
            pulseStyle,
          ]}
        />
      </View>
      <View style={{ flex: 1, height: 2, backgroundColor: isTerminal ? TERM_MID : colors.primary, borderRadius: 1 }} />
    </View>
  );
}
