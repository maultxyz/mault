import { ScrollView, useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { SHEET_MAX_HEIGHT_RATIO } from "@/lib/constants/ui";
import type { SheetContentProps } from "@/lib/interfaces/ui";

export function SheetContent({
  title,
  description,
  headerLeading,
  headerAction,
  footer,
  scrollable = true,
  maxHeightRatio = SHEET_MAX_HEIGHT_RATIO,
  contentContainerStyle,
  children,
  topPadding,
}: SheetContentProps & { topPadding: number }) {
  const { height: windowHeight } = useWindowDimensions();
  return (
    <View style={{ width: "100%", maxHeight: windowHeight * maxHeightRatio, paddingTop: topPadding, paddingBottom: SPACING.md }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: SPACING.sm,
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: SPACING.md,
        }}
      >
        {headerLeading}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <AppText size="lg" heading weight="bold" accessibilityRole="header">
            {title}
          </AppText>
          {description ? (
            <AppText size="sm" tone="secondary">
              {description}
            </AppText>
          ) : null}
        </View>
        {headerAction}
      </View>
      {scrollable ? (
        <ScrollView
          style={{ flexShrink: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.md }, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flexShrink: 1 }}>{children}</View>
      )}
      {footer ? <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md }}>{footer}</View> : null}
    </View>
  );
}
