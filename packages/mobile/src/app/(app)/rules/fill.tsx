import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import type { BinConfig } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast-provider";
import { invalidateCollectionCards } from "@/features/collections/api/collection-cards";
import { billingQueryOptions } from "@/features/org/api/billing";
import { emptyBin, emptyBins } from "@/features/rules/api/bin-sets";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { binCountsQueryOptions } from "@/features/scanner/api/bin-counts";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage";
import { useActiveOrgId } from "@/hooks/use-org";
import { EMPTY_BIN_CLAIMED_LOCATION_OPTION, EMPTY_BIN_NO_LOCATION_OPTION } from "@/lib/constants/rules";
import type { EmptyBinRequest } from "@/lib/interfaces/rules";

export default function BinFillScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const { showToast } = useToast();
  const { collection, gameGuid, activeSet, bins, isPending: isRulesDataPending } = useRulesData();
  const billing = useQuery(billingQueryOptions(orgId));
  const canUseStorage = !!billing.data && billing.data.storage !== false;
  const locations = useQuery(storageLocationsQueryOptions(orgId, canUseStorage));
  const counts = useQuery(binCountsQueryOptions(collection?.guid, bins));
  const [emptyingBin, setEmptyingBin] = useState<BinConfig | null>(null);
  const countOf = (binNumber: number) => counts.data?.find((entry) => entry.binNumber === binNumber)?.count ?? 0;
  const filledBins = bins.filter((bin) => countOf(bin.binNumber) > 0);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["bin-sets"] });
    void queryClient.invalidateQueries({ queryKey: ["bin-counts"] });
    void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
    if (collection) invalidateCollectionCards(queryClient, collection.guid);
  };

  const emptyOne = useMutation({
    mutationFn: ({ binNumber, options }: EmptyBinRequest) => emptyBin(binNumber, gameGuid, options),
    onSuccess: (_result, { binNumber }) =>
      showToast({ message: t("rules.fill.emptied", { number: binNumber }), tone: "success" }),
    onError: () => showToast({ message: t("scan.emptyBin.failed"), tone: "destructive" }),
    onSettled: refresh,
  });
  const emptyAll = useMutation({
    mutationFn: () =>
      emptyBins(
        filledBins.map((bin) => bin.binNumber),
        gameGuid,
        { collectionGuid: collection?.guid, storeInClaimedLocations: true },
      ),
    onSuccess: () => showToast({ message: t("rules.fill.emptiedAll"), tone: "success" }),
    onError: () => showToast({ message: t("scan.emptyBin.failed"), tone: "destructive" }),
    onSettled: refresh,
  });
  const isEmptying = emptyOne.isPending || emptyAll.isPending;

  const confirmEmptyAll = () => {
    const claimedBins = filledBins.filter((bin) => bin.claimedStorageLocation != null);
    Alert.alert(
      t("rules.fill.emptyAllTitle"),
      claimedBins.length > 0
        ? t("scan.emptyBin.storeDescription", {
            locations: claimedBins
              .map((bin) =>
                t("scan.emptyBin.storeBin", { bin: bin.binNumber, location: bin.claimedStorageLocation?.name ?? "" }),
              )
              .join(", "),
          })
        : t("scan.emptyBin.confirmDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: claimedBins.length > 0 ? t("scan.emptyBin.storeConfirm") : t("scan.emptyBin.confirm"),
          onPress: () => emptyAll.mutate(),
        },
      ],
    );
  };

  const emptyOptions = emptyingBin
    ? [
        { value: EMPTY_BIN_NO_LOCATION_OPTION, label: t("rules.fill.noLocation") },
        ...(emptyingBin.claimedStorageLocation
          ? [
              {
                value: EMPTY_BIN_CLAIMED_LOCATION_OPTION,
                label: t("rules.fill.claimedLocation", { name: emptyingBin.claimedStorageLocation.name }),
              },
            ]
          : []),
        ...(canUseStorage
          ? (locations.data ?? [])
              .filter((location) => location.guid !== emptyingBin.claimedStorageLocation?.guid)
              .map((location) => ({ value: location.guid, label: location.name }))
          : []),
      ]
    : [];
  const chooseEmptyTarget = (value: string) => {
    const bin = emptyingBin;
    setEmptyingBin(null);
    if (!bin) return;
    emptyOne.mutate({
      binNumber: bin.binNumber,
      options:
        value === EMPTY_BIN_NO_LOCATION_OPTION
          ? {}
          : value === EMPTY_BIN_CLAIMED_LOCATION_OPTION
            ? { collectionGuid: collection?.guid, storeInClaimedLocation: true }
            : { collectionGuid: collection?.guid, locationGuid: value },
    });
  };

  return (
    <Screen
      onRefresh={() => counts.refetch()}
      header={<PageHeader title={t("rules.fill.title")} subtitle={activeSet?.name} onBack={() => router.back()} />}
    >
      <AppText size="sm" tone="secondary">
        {t("rules.fill.description")}
      </AppText>
      {counts.isError ? <Callout tone="destructive" title={t("rules.fill.loadFailed")} /> : null}
      {isRulesDataPending || (counts.isPending && !!collection) ? (
        <ListSkeleton leading="none" hasSubtitle />
      ) : !collection || bins.length === 0 ? (
        <EmptyState icon="rules" title={t("rules.noCollectionTitle")} description={t("rules.noCollectionDescription")} />
      ) : (
        <>
          <ListGroup>
            {bins.map((bin) => {
              const count = countOf(bin.binNumber);
              return (
                <ListRow
                  key={bin.binNumber}
                  title={t("rules.bin", { number: bin.binNumber })}
                  subtitle={
                    bin.claimedStorageLocation
                      ? t("rules.fill.fillsLocation", { name: bin.claimedStorageLocation.name })
                      : undefined
                  }
                  value={t("rules.fill.cardCount", { count })}
                  disabled={count === 0 || isEmptying}
                  accessibilityHint={t("rules.fill.emptyHint")}
                  onPress={() => setEmptyingBin(bin)}
                />
              );
            })}
          </ListGroup>
          <Button
            variant="secondary"
            label={t("rules.fill.emptyAll")}
            loading={emptyAll.isPending}
            disabled={filledBins.length === 0 || isEmptying}
            onPress={confirmEmptyAll}
          />
        </>
      )}
      <OptionSheet
        visible={!!emptyingBin}
        title={emptyingBin ? t("rules.fill.emptyTitle", { number: emptyingBin.binNumber }) : ""}
        description={t("rules.fill.emptyDescription")}
        options={emptyOptions}
        selected={[]}
        searchPlaceholder={t("storage.searchLocations")}
        onSelect={chooseEmptyTarget}
        onClose={() => setEmptyingBin(null)}
      />
    </Screen>
  );
}
