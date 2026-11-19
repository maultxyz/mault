import { useTranslation } from "react-i18next";
import { useWindowDimensions, View } from "react-native";
import { LoadingLogo } from "@/components/ui/loading-logo";
import { LOADING_LOGO_PAGE_SIZE, PAGE_LOADING_MIN_HEIGHT_RATIO } from "@/lib/constants/loading";

export function PageLoading() {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  return (
    <View style={{ minHeight: height * PAGE_LOADING_MIN_HEIGHT_RATIO, alignItems: "center", justifyContent: "center" }}>
      <LoadingLogo size={LOADING_LOGO_PAGE_SIZE} accessibilityLabel={t("common.loading")} />
    </View>
  );
}
