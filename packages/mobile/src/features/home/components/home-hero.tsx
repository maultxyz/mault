import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Skeleton } from "@/components/ui/skeleton";
import type { HomeHeroProps } from "@/lib/interfaces/ui";

export function HomeHero({ value, summary }: HomeHeroProps) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: 2 }}>
      <AppText size="xs" tone="secondary" weight="medium">
        {t("home.totalValue")}
      </AppText>
      {value != null ? (
        <AppText size="3xl" heading weight="semibold" numberOfLines={1} adjustsFontSizeToFit style={{ fontVariant: ["tabular-nums"] }}>
          {value}
        </AppText>
      ) : (
        <Skeleton width={180} height={36} style={{ marginVertical: 2 }} />
      )}
      <AppText size="xs" tone="secondary" style={{ fontVariant: ["tabular-nums"] }}>
        {summary ?? " "}
      </AppText>
    </View>
  );
}
