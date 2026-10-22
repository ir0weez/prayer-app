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

/**
 * NOW Indicator Component with pulsing red dot
 * Shows current time position in schedule with live recording aesthetic
 */
export function NowPill() {
  const colors = useColors();
  const { tokens: skinTokens } = useSkin();
  const pulseAnim = useSharedValue(0);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnim.value, [0, 1], [0.4, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={{ width: 62, height: 24, paddingHorizontal: 4, borderRadius: skinTokens.isEightBit ? 2 : 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: skinTokens.isEightBit ? '#FFC531' : '#8B5CF6', borderWidth: skinTokens.isEightBit ? 2 : 1, borderColor: skinTokens.isEightBit ? '#150A2E' : '#A78BFA', alignSelf: 'flex-start' }}>
      <Text style={{ color: skinTokens.isEightBit ? '#241547' : '#FFFFFF', fontSize: 9, lineHeight: 11, fontWeight: '700', ...(skinTokens.displayFont ? { fontFamily: skinTokens.displayFont, fontSize: 8 } : {}) }}>NOW</Text>
      <ReAnimated.View style={[{ width: 5, height: 5, borderRadius: skinTokens.isEightBit ? 0 : 2.5, backgroundColor: '#EF4444' }, pulseStyle]} />
    </View>
  );
}

export function NowIndicator() {
  const colors = useColors();
  const pulseAnim = useSharedValue(0);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnim.value, [0, 1], [0.4, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={{ marginVertical: 12, marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: colors.background, fontSize: 11, fontWeight: '600' }}>NOW</Text>
        <ReAnimated.View
          style={[
            { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
            pulseStyle,
          ]}
        />
      </View>
      <View style={{ flex: 1, height: 2, backgroundColor: colors.primary, borderRadius: 1 }} />
    </View>
  );
}
