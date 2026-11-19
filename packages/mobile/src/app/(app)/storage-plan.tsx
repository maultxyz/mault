import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  buildStoragePlanRows,
  moveStoragePlanLocation,
  PRESET_FILL_STORAGE_LOCATIONS_MAX,
  storagePlanBinClaims,
  type StoragePlanRow,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CheckboxIndicator } from "@/components/ui/checkbox-indicator";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { billingQueryOptions } from "@/features/org/api/billing";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { useStoragePlanDraft } from "@/features/rules/api/use-storage-plan-draft";
import { setStoragePlanDraftLocations } from "@/features/rules/lib/storage-plan-draft";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { STORAGE_ADD_ROUTES } from "@/lib/constants/storage";
import { STORAGE_PLAN_FILL_BAR_WIDTH } from "@/lib/constants/rules";
import { SPACING } from "@/lib/constants/theme";

export default function StoragePlanScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const orgId = useActiveOrgId();
  const { bins } = useRulesData();
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const storageLocked = billing?.storage === false;
  const { data: locations = [] } = useQuery(storageLocationsQueryOptions(orgId, !storageLocked));
  const { locationGuids } = useStoragePlanDraft();
  const [selectedGuid, setSelectedGuid] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [pickedGuids, setPickedGuids] = useState<string[]>([]);

  const rows = buildStoragePlanRows(locationGuids, locations, bins);
  const claims = storagePlanBinClaims(bins);
  const available = locations.filter((location) => !locationGuids.includes(location.guid));
  const selectedIndex = selectedGuid ? locationGuids.indexOf(selectedGuid) : -1;
  const selectedRow = rows.find((row) => row.location.guid === selectedGuid);
  const isFull = locationGuids.length >= PRESET_FILL_STORAGE_LOCATIONS_MAX;

  const rowSubtitle = (row: StoragePlanRow) => {
    const status =
      row.status === "full"
        ? t("rules.storagePlan.status.full")
        : row.status === "filling"
          ? t("rules.storagePlan.status.filling", { number: row.fillingBinNumber })
          : t("rules.storagePlan.status.waiting");
    const parts = [
      row.capacity != null
        ? t("storage.slotsUsed", { used: row.usedSlots, capacity: row.capacity })
        : t("rules.storagePlan.noCapacity"),
      row.location.batchSize != null ? t("rules.storagePlan.batch", { size: row.location.batchSize }) : null,
      status,
    ];
    return parts.filter((part): part is string => part != null).join(" · ");
  };

  const remove = (guid: string) => {
    setStoragePlanDraftLocations(locationGuids.filter((candidate) => candidate !== guid));
    setSelectedGuid(null);
  };
  const move = (offset: number) => {
    if (selectedIndex < 0) return;
    setStoragePlanDraftLocations(moveStoragePlanLocation(locationGuids, selectedIndex, offset));
  };
  const leaveSheetThen = (open: () => void) => {
    router.back();
    open();
  };
  const togglePicked = (guid: string) =>
    setPickedGuids((current) =>
      current.includes(guid) ? current.filter((candidate) => candidate !== guid) : [...current, guid],
    );
  const finishAdding = () => {
    setStoragePlanDraftLocations([
      ...locationGuids,
      ...available.filter((location) => pickedGuids.includes(location.guid)).map((location) => location.guid),
    ]);
    setPickedGuids([]);
    setIsAdding(false);
  };

  const actions = isAdding ? (
    <>
      <Button
        size="lg"
        variant="secondary"
        label={t("common.cancel")}
        style={{ flex: 1 }}
        onPress={() => {
          setPickedGuids([]);
          setIsAdding(false);
        }}
      />
      <Button
        size="lg"
        label={t("rules.storagePlan.addSelected", { count: pickedGuids.length })}
        disabled={pickedGuids.length === 0}
        style={{ flex: 1 }}
        onPress={finishAdding}
      />
    </>
  ) : selectedRow ? (
    <>
      <Button
        icon="arrowUp"
        iconOnly
        variant="secondary"
        size="lg"
        label={t("rules.storagePlan.moveUp", { name: selectedRow.location.name })}
        disabled={selectedIndex <= 0}
        onPress={() => move(-1)}
      />
      <Button
        icon="arrowDown"
        iconOnly
        variant="secondary"
        size="lg"
        label={t("rules.storagePlan.moveDown", { name: selectedRow.location.name })}
        disabled={selectedIndex < 0 || selectedIndex >= locationGuids.length - 1}
        onPress={() => move(1)}
      />
      <Button
        icon="edit"
        iconOnly
        variant="secondary"
        size="lg"
        label={t("rules.storagePlan.edit", { name: selectedRow.location.name })}
        onPress={() =>
          leaveSheetThen(() =>
            router.push({
              pathname: STORAGE_ADD_ROUTES.location,
              params: { guid: selectedRow.location.guid, name: selectedRow.location.name },
            }),
          )
        }
      />
      <Button
        icon="trash"
        iconOnly
        variant="secondary"
        size="lg"
        label={t("rules.storagePlan.remove", { name: selectedRow.location.name })}
        onPress={() => remove(selectedRow.location.guid)}
      />
      <Button size="lg" label={t("common.done")} style={{ flex: 1 }} onPress={() => setSelectedGuid(null)} />
    </>
  ) : (
    <Button size="lg" label={t("common.done")} onPress={() => router.back()} />
  );

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("rules.storagePlan.title")} />
      <PinnedActionsLayout actions={storageLocked ? undefined : actions} actionsDirection="row">
        {storageLocked ? (
          <Callout tone="info" title={t("rules.storagePlan.locked")} />
        ) : isAdding ? (
          <View style={{ gap: SPACING.sm }}>
            <SectionHeader title={t("rules.storagePlan.addTitle")} />
            {available.length === 0 ? (
              <AppText size="sm" tone="secondary">
                {t("rules.storagePlan.noneLeft")}
              </AppText>
            ) : (
              <ListGroup>
                {available.map((location) => {
                  const checked = pickedGuids.includes(location.guid);
                  return (
                    <ListRow
                      key={location.guid}
                      title={location.name}
                      subtitle={
                        location.capacity != null
                          ? t("storage.slotsUsed", { used: location.usedSlots ?? 0, capacity: location.capacity })
                          : t("rules.storagePlan.noCapacity")
                      }
                      leading={<CheckboxIndicator checked={checked} />}
                      selected={checked}
                      onPress={() => togglePicked(location.guid)}
                    />
                  );
                })}
              </ListGroup>
            )}
          </View>
        ) : (
          <View style={{ gap: SPACING.lg }}>
            <AppText size="sm" tone="secondary">
              {t("rules.storagePlan.description")}
            </AppText>

            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("rules.storagePlan.locationsTitle")} />
              <ListGroup>
                {rows.map((row) => (
                  <ListRow
                    key={row.location.guid}
                    title={t("rules.storagePlan.order", { order: row.order, name: row.location.name })}
                    subtitle={rowSubtitle(row)}
                    subtitleNumberOfLines={0}
                    selected={row.location.guid === selectedGuid}
                    right={
                      row.fillPercent != null ? (
                        <View style={{ width: STORAGE_PLAN_FILL_BAR_WIDTH, flexDirection: "row" }}>
                          <ProgressBar
                            fraction={row.fillPercent / 100}
                            accessibilityValue={{ min: 0, max: 100, now: row.fillPercent }}
                          />
                        </View>
                      ) : undefined
                    }
                    accessibilityHint={t("rules.storagePlan.rowHint")}
                    onPress={() => setSelectedGuid(row.location.guid === selectedGuid ? null : row.location.guid)}
                    onLongPress={() => setSelectedGuid(row.location.guid)}
                    longPressLabel={t("rules.storagePlan.actions")}
                    swipeDestructiveAction={{
                      label: t("rules.storagePlan.remove", { name: row.location.name }),
                      onPress: () => remove(row.location.guid),
                    }}
                  />
                ))}
                <ListRow
                  icon="plus"
                  title={t("rules.storagePlan.add")}
                  disabled={isFull || available.length === 0}
                  onPress={() => {
                    setSelectedGuid(null);
                    setIsAdding(true);
                  }}
                />
                <ListRow
                  icon="plus"
                  title={t("rules.storagePlan.createSeries")}
                  disabled={isFull}
                  onPress={() =>
                    leaveSheetThen(() =>
                      router.push({ pathname: STORAGE_ADD_ROUTES.series, params: { addToStoragePlan: "1" } }),
                    )
                  }
                />
              </ListGroup>
              {rows.length === 0 ? (
                <AppText size="xs" tone="secondary">
                  {t("rules.storagePlan.empty")}
                </AppText>
              ) : null}
            </View>

            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("rules.storagePlan.binsTitle")} />
              <ListGroup>
                {claims.map((claim) => (
                  <ListRow
                    key={claim.binNumber}
                    icon="storage"
                    title={t("rules.bin", { number: claim.binNumber })}
                    subtitle={
                      claim.locationName == null
                        ? t("rules.storagePlan.noLocation")
                        : claim.remainingSlots == null
                          ? claim.locationName
                          : t("rules.storagePlan.claim", { name: claim.locationName, count: claim.remainingSlots })
                    }
                  />
                ))}
              </ListGroup>
              <AppText size="xs" tone="secondary">
                {t("rules.storagePlan.binsHint")}
              </AppText>
            </View>
          </View>
        )}
      </PinnedActionsLayout>
    </View>
  );
}
