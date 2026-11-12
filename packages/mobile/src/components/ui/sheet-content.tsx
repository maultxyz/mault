import { ScrollView, useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { SHEET_HEADER_SIDE_MIN_WIDTH, SHEET_MAX_HEIGHT_RATIO } from "@/lib/constants/ui";
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
  const sideMinWidth = headerLeading || headerAction ? SHEET_HEADER_SIDE_MIN_WIDTH : 0;
  return (
    <View style={{ width: "100%", maxHeight: windowHeight * maxHeightRatio, paddingTop: topPadding, paddingBottom: SPACING.md }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: SPACING.sm,
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: SPACING.md,
        }}
      >
        <View style={{ flexGrow: 1, flexBasis: 0, minWidth: sideMinWidth, alignItems: "flex-start" }}>{headerLeading}</View>
        <View style={{ flexShrink: 1, alignItems: "center", gap: 2 }}>
          <AppText size="lg" heading weight="bold" accessibilityRole="header" style={{ textAlign: "center" }}>
            {title}
          </AppText>
          {description ? (
            <AppText size="sm" tone="secondary" style={{ textAlign: "center" }}>
              {description}
            </AppText>
          ) : null}
        </View>
        <View style={{ flexGrow: 1, flexBasis: 0, minWidth: sideMinWidth, alignItems: "flex-end" }}>{headerAction}</View>
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
