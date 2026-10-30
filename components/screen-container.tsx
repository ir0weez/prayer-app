import { View, type ViewProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { BitBackground } from "@/components/bit-background";
import { PaperGrainOverlay } from "@/components/paper-grain";
import { TerminalBackground } from "@/components/terminal-background";
import { useSkin } from "@/hooks/use-skin";
import { cn } from "@/lib/utils";

export interface ScreenContainerProps extends ViewProps {
  /**
   * SafeArea edges to apply. Defaults to ["top", "left", "right"].
   * Bottom is typically handled by Tab Bar.
   */
  edges?: Edge[];
  /**
   * Tailwind className for the content area.
   */
  className?: string;
  /**
   * Additional className for the outer container (background layer).
   */
  containerClassName?: string;
  /**
   * Additional className for the SafeAreaView (content layer).
   */
  safeAreaClassName?: string;
  /**
   * v347: the ground the contained screen itself paints (its own
   * derivation — a Material family's ground under Classic, the
   * skin token background under a skin). The tray strip above
   * the safe area is the ONLY place this container's own paint
   * shows on a normal screen; when the caller hands over its
   * ground, BOTH container layers paint it, so the tray zone and
   * the page are one colour with no tint step and no hard edge
   * at the boundary (the measured second half of the surviving
   * top "bar", Oct 29). Omitted: the container paints exactly as
   * before (palette background / skin token).
   */
  groundColor?: string;
}

/**
 * A container component that properly handles SafeArea and background colors.
 *
 * The outer View extends to full screen (including status bar area) with the background color,
 * while the inner SafeAreaView ensures content is within safe bounds.
 *
 * Usage:
 * ```tsx
 * <ScreenContainer className="p-4">
 *   <Text className="text-2xl font-bold text-foreground">
 *     Welcome
 *   </Text>
 * </ScreenContainer>
 * ```
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  groundColor,
  style,
  ...props
}: ScreenContainerProps) {
  // Paper skin (v174): the page itself becomes a sheet — paper-tinted
  // background (flat; the grain overlay renders nothing since v179).
  // Under Classic this renders exactly as before.
  const { isPaper, isEightBit, isTerminal, isSkinned, tokens } = useSkin();
  return (
    <View
      className={cn(
        "flex-1",
        "bg-background",
        containerClassName
      )}
      style={
        groundColor
          ? { backgroundColor: groundColor }
          : isSkinned && tokens.background
            ? { backgroundColor: tokens.background }
            : undefined
      }
      {...props}
    >
      {isPaper ? <PaperGrainOverlay /> : null}
      {isEightBit ? <BitBackground /> : null}
      {isTerminal ? <TerminalBackground /> : null}
      <SafeAreaView
        edges={edges}
        className={cn("flex-1", safeAreaClassName)}
        style={groundColor ? [style, { backgroundColor: groundColor }] : style}
      >
        <View className={cn("flex-1", className)}>{children}</View>
      </SafeAreaView>
    </View>
  );
}
