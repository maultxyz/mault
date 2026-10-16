import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import type { CardDetailsListProps, DetailRowProps } from "@/lib/interfaces/ui";

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={{ flexDirection: "row", gap: SPACING.xl }}>
      <AppText tone="secondary" style={{ width: 112 }}>
        {label}
      </AppText>
      <AppText style={{ flex: 1, minWidth: 0 }}>{value}</AppText>
    </View>
  );
}

export function CardDetailsList({ card, binNumber }: CardDetailsListProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const rarity = card.rarity ? card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1) : null;
  return (
    <View style={{ gap: 6 }}>
      <DetailRow
        label={t("cardDetail.set")}
        value={`${card.setName} (${card.set.toUpperCase()}) #${card.collectorNumber}`}
      />
      {rarity ? <DetailRow label={t("cardDetail.rarity")} value={rarity} /> : null}
      {card.manaCost ? <DetailRow label={t("cardDetail.manaCost")} value={card.manaCost} /> : null}
      {card.power != null && card.toughness != null ? (
        <DetailRow label={t("cardDetail.powerToughness")} value={`${card.power}/${card.toughness}`} />
      ) : null}
      {card.artist ? <DetailRow label={t("cardDetail.artist")} value={card.artist} /> : null}
      {binNumber != null ? <DetailRow label={t("cardDetail.bin")} value={String(binNumber)} /> : null}
      {card.sourceUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(card.sourceUrl ?? "")}
          hitSlop={SPACING.sm}
          style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs, alignSelf: "flex-start", marginTop: SPACING.xs }}
        >
          <AppText tone="primary">{t("cardDetail.viewSource")}</AppText>
          <Icon name="external" size={14} color={colors.primaryText} />
        </Pressable>
      ) : null}
    </View>
  );
}
