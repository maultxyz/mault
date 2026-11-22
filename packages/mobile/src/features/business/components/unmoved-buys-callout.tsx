import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { SPACING } from "@/lib/constants/theme";
import type { UnmovedBuysCalloutProps } from "@/lib/interfaces/business";

export function UnmovedBuysCallout({ buys }: UnmovedBuysCalloutProps) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: SPACING.sm }}>
      <Callout
        tone="info"
        title={t("business.buy.unmoved.title", { count: buys.length })}
        description={t("business.buy.unmoved.description")}
      />
      <ListGroup>
        {buys.map((buy) => (
          <ListRow
            key={buy.guid}
            icon="transfer"
            title={buy.customerName}
            subtitle={t("business.buy.unmoved.row", { count: buy.cardCount, collection: buy.collectionName })}
            value={t("business.buy.unmoved.move")}
            accessibilityHint={t("business.buy.unmoved.moveHint")}
            onPress={() => router.push({ pathname: "/business/intake-transfer", params: { guid: buy.guid } })}
          />
        ))}
      </ListGroup>
    </View>
  );
}
