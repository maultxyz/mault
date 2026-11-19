import { useRoutePath } from "expo-router";
import { Platform, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { NativeStackHeader } from "@/components/ui/native-stack-header";
import { SHEET_ROUTE_PATTERN } from "@/lib/constants/nav";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { IOS_SHEET_TOP_PADDING } from "@/lib/constants/ui";
import type { PageHeaderProps } from "@/lib/interfaces/ui";

export function PageHeader({ title, titleAccessory, subtitle, subtitleAccessory, onBack, actions, tabs, children }: PageHeaderProps) {
  const actionRow = actions ? <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>{actions}</View> : null;

  const isPresentedAsSheet = SHEET_ROUTE_PATTERN.test(useRoutePath().split("?")[0]);
  const usesNativeHeader = !!onBack && !isPresentedAsSheet;
  const nativeHeader = usesNativeHeader ? <NativeStackHeader title={title ?? ""} actions={actionRow} /> : null;
  if (usesNativeHeader && !subtitle && !titleAccessory && !tabs && !children) return nativeHeader;

  return (
    <View
      style={{
        gap: SPACING.sm + 2,
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: isPresentedAsSheet && Platform.OS === "ios" ? IOS_SHEET_TOP_PADDING : SPACING.sm + 2,
        paddingBottom: tabs ? 0 : SPACING.sm + 2,
      }}
    >
      {nativeHeader}
      {title == null && !subtitle && !titleAccessory && !usesNativeHeader ? (
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>{actionRow}</View>
      ) : (
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md, minHeight: usesNativeHeader ? 0 : 40 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm }}>
            {usesNativeHeader ? (
              <View style={{ flex: 1 }} />
            ) : (
              <AppText
                size="lg"
                heading
                weight="semibold"
                numberOfLines={2}
                accessibilityRole="header"
                style={{ flex: 1, minWidth: 0, textAlign: isPresentedAsSheet ? "center" : "auto" }}
              >
                {title}
              </AppText>
            )}
            {titleAccessory}
          </View>
          {subtitle ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: isPresentedAsSheet ? "center" : "flex-start",
                gap: 6,
              }}
            >
              {subtitleAccessory}
              <AppText size="xs" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
                {subtitle}
              </AppText>
            </View>
          ) : null}
        </View>
        {usesNativeHeader ? null : actionRow}
      </View>
      )}
      {children}
      {tabs ? <View style={{ marginHorizontal: -SCREEN_GUTTER }}>{tabs}</View> : null}
    </View>
  );
}
