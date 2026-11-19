import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { OptionSheet } from "@/components/ui/option-sheet";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage";
import { useActiveOrgId } from "@/hooks/use-org";
import { NEW_TRADE_LINK_PARAM_VALUE, TRADE_LINK_SOURCE_SEPARATOR } from "@/lib/constants/trade-offers";
import type { NewTradeSheetsProps } from "@/lib/interfaces/trade-offers";

export function NewTradeSheets({ openSheet, onOpenSheetChange }: NewTradeSheetsProps) {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const collections = useQuery({ ...collectionsQueryOptions(orgId), enabled: !!orgId && openSheet === "source" });
  const locations = useQuery(storageLocationsQueryOptions(orgId, openSheet === "source"));
  const sourceOptions = [
    ...(collections.data ?? []).map((collection) => ({
      value: `collection${TRADE_LINK_SOURCE_SEPARATOR}${collection.guid}`,
      label: collection.name,
      description: t("tradeOffers.newTrade.collections"),
    })),
    ...(locations.data ?? []).map((location) => ({
      value: `storage${TRADE_LINK_SOURCE_SEPARATOR}${location.guid}`,
      label: location.name,
      description: t("tradeOffers.newTrade.storageLocations"),
    })),
  ];

  return (
    <>
      <OptionSheet
        visible={openSheet === "kind"}
        title={t("tradeOffers.newTrade.button")}
        options={[
          { value: "link", label: t("tradeOffers.newTrade.link"), description: t("tradeOffers.newTrade.linkHint") },
          {
            value: "inPerson",
            label: t("tradeOffers.newTrade.inPerson"),
            description: t("tradeOffers.newTrade.inPersonHint"),
          },
        ]}
        selected={[]}
        onSelect={(value) => {
          if (value === "link") {
            onOpenSheetChange("source");
            return;
          }
          onOpenSheetChange(null);
          router.push("/in-person-trade");
        }}
        onClose={() => onOpenSheetChange(null)}
      />
      <OptionSheet
        visible={openSheet === "source"}
        title={t("tradeOffers.newTrade.linkTitle")}
        description={t("tradeOffers.newTrade.linkDescription")}
        options={sourceOptions}
        selected={[]}
        searchPlaceholder={t("tradeOffers.newTrade.sourcePlaceholder")}
        onSelect={(value) => {
          onOpenSheetChange(null);
          const [kind, guid] = value.split(TRADE_LINK_SOURCE_SEPARATOR);
          router.push({ pathname: "/share-link", params: { kind, guid, newTradeLink: NEW_TRADE_LINK_PARAM_VALUE } });
        }}
        onClose={() => onOpenSheetChange(null)}
      />
    </>
  );
}
