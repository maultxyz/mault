import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { CardRow } from "@/components/cards/card-row";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { Pill } from "@/components/ui/pill";
import { usePricing } from "@/hooks/use-pricing";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { CollectionActivityProps } from "@/lib/interfaces/ui";
import { absoluteUrl } from "@/lib/url";

export function CollectionActivity({ state, onOpen }: CollectionActivityProps) {
  const { t } = useTranslation();
  const pricing = usePricing();
  return (
    <ScrollView contentContainerStyle={{ padding: SCREEN_GUTTER, paddingBottom: SCREEN_GUTTER + SPACING.xxl, gap: SPACING.lg }}>
      <View style={{ flexDirection: "row", gap: SPACING.sm, flexWrap: "wrap" }}>
        <Pill icon="viewers" label={t("monitor.viewers", { count: state.viewerCount })} />
        <Pill
          tone={state.unmatchedCount > 0 ? "warning" : "neutral"}
          icon="help"
          label={t("monitor.unmatched", { count: state.unmatchedCount })}
        />
      </View>
      {state.errors.map((message, index) => (
        <Callout key={`${index}-${message}`} tone="destructive" title={t("monitor.scanError")} description={message} />
      ))}
      {state.recentCards.length === 0 ? (
        <EmptyState icon="monitor" title={t("monitor.emptyTitle")} description={t("monitor.emptyDescription")} />
      ) : (
        <View style={{ gap: SPACING.xs }}>
          <AppText size="xs" tone="secondary">
            {t("monitor.recent")}
          </AppText>
          <ListGroup>
            {state.recentCards.map((entry) => {
              const value = pricing.priceOf(entry.card, entry.isFoil, entry.condition);
              return (
                <CardRow
                  key={entry.scanId}
                  name={entry.card.name}
                  subtitle={entry.card.setName}
                  imageUrl={absoluteUrl(entry.card.image?.small)}
                  price={value != null ? pricing.format(value) : null}
                  binNumber={entry.binNumber}
                  lowConfidence={entry.lowConfidenceMatch}
                  onPress={() => onOpen(entry.scanId)}
                />
              );
            })}
          </ListGroup>
        </View>
      )}
    </ScrollView>
  );
}
