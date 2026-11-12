import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { ReduceMotion } from "react-native-reanimated";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { SWIPE_ACTION_WIDTH } from "@/lib/constants/search";
import { SPACING } from "@/lib/constants/theme";
import type { SwipeRowAction, SwipeRowActionsProps } from "@/lib/interfaces/search";

const SWIPE_ANIMATION_OPTIONS = { reduceMotion: ReduceMotion.System };

export function SwipeRowActions({ moreAction, destructiveAction, children }: SwipeRowActionsProps) {
  const colors = useTheme();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const [isOpen, setIsOpen] = useState(false);
  if (!moreAction && !destructiveAction) return <>{children}</>;

  const runAction = (action: SwipeRowAction) => {
    swipeableRef.current?.close();
    action.onPress();
  };
  const actionButton = (action: SwipeRowAction, isDestructive: boolean) => (
    <Pressable
      key={action.label}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={() => runAction(action)}
      style={({ pressed }) => ({
        width: SWIPE_ACTION_WIDTH,
        alignItems: "center",
        justifyContent: "center",
        gap: SPACING.xs,
        paddingHorizontal: SPACING.xs,
        backgroundColor: isDestructive ? colors.destructiveStrong : colors.muted,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={isDestructive ? "trash" : "more"} size={18} color={isDestructive ? colors.primaryForeground : colors.foreground} />
      <AppText
        size="2xs"
        weight="semibold"
        numberOfLines={2}
        style={{ textAlign: "center", color: isDestructive ? colors.primaryForeground : colors.foreground }}
      >
        {action.label}
      </AppText>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={SWIPE_ACTION_WIDTH / 2}
      overshootRight={false}
      animationOptions={SWIPE_ANIMATION_OPTIONS}
      onSwipeableWillOpen={() => setIsOpen(true)}
      onSwipeableClose={() => setIsOpen(false)}
      childrenContainerStyle={{ backgroundColor: colors.background }}
      renderRightActions={() => (
        <View
          accessibilityElementsHidden={!isOpen}
          importantForAccessibility={isOpen ? "auto" : "no-hide-descendants"}
          style={{ flexDirection: "row" }}
        >
          {moreAction ? actionButton(moreAction, false) : null}
          {destructiveAction ? actionButton(destructiveAction, true) : null}
        </View>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
