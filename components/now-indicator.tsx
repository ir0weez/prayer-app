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

/**
 * NOW Indicator Component with pulsing red dot
 * Shows current time position in schedule with live recording aesthetic
 */
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
