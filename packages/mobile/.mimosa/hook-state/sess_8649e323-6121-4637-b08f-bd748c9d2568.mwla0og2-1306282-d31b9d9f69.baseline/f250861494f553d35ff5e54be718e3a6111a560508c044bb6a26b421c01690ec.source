import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { LoadingLogo } from "@/components/ui/loading-logo";
import { LOADING_LOGO_FOOTER_SIZE } from "@/lib/constants/loading";
import { SPACING } from "@/lib/constants/theme";
import type { ListLoadingFooterProps } from "@/lib/interfaces/ui";

export function ListLoadingFooter({ accessibilityLabel }: ListLoadingFooterProps) {
  const { t } = useTranslation();
  return (
    <View style={{ alignItems: "center", margin: SPACING.lg }}>
      <LoadingLogo size={LOADING_LOGO_FOOTER_SIZE} accessibilityLabel={accessibilityLabel ?? t("common.loading")} />
    </View>
  );
}
