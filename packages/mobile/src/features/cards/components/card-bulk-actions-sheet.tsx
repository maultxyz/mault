import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CARD_CONDITIONS, CARD_TAGS, type CardCondition, type CardTag } from "@magic-vault/shared";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { Sheet } from "@/components/ui/sheet";
import { useCardBulkActions } from "@/features/cards/api/use-card-bulk-actions";
import { billingQueryOptions } from "@/features/org/api/billing";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage";
import { useActiveOrgId } from "@/hooks/use-org";
import type { CardBulkActionsPicker, CardBulkActionsSheetProps } from "@/lib/interfaces/cards";

export function CardBulkActionsSheet({
  visible,
  references,
  storageLocationGuid,
  exportName,
  onClose,
  onFinished,
}: CardBulkActionsSheetProps) {
  const { t } = useTranslation();
  const [picker, setPicker] = useState<CardBulkActionsPicker | null>(null);
  const orgId = useActiveOrgId();
  const billing = useQuery(billingQueryOptions(orgId));
  const canUseStorage = !!billing.data && billing.data.storage !== false;
  const locations = useQuery(storageLocationsQueryOptions(orgId, canUseStorage && visible));
  const moveTargets = (locations.data ?? []).filter((location) => location.guid !== storageLocationGuid);
  const bulk = useCardBulkActions({ references, storageLocationGuid, exportName, onFinished });
  const count = references.length;
  const tagOptions = CARD_TAGS.map((tag) => ({ value: tag, label: t(`cardTags.names.${tag}`) }));

  const choose = (action: () => void) => {
    setPicker(null);
    onClose();
    action();
  };

  return (
    <>
      <Sheet
        visible={visible && picker == null}
        onClose={onClose}
        title={t("cardBulk.selectedCount", { count })}
      >
        <ListGroup>
          {bulk.exportAdapters.length > 0 ? (
            <ListRow icon="upload" title={t("export.button")} disabled={bulk.isPending} onPress={() => setPicker("export")} />
          ) : null}
          {bulk.foilOptions ? (
            <ListRow icon="sparkles" title={t("cardDetail.foil")} disabled={bulk.isPending} onPress={() => setPicker("foil")} />
          ) : null}
          <ListRow
            icon="condition"
            title={t("cardDetail.condition")}
            disabled={bulk.isPending}
            onPress={() => setPicker("condition")}
          />
          <ListRow icon="bookmark" title={t("cardBulk.addTag")} disabled={bulk.isPending} onPress={() => setPicker("addTag")} />
          <ListRow
            icon="bookmark"
            title={t("cardBulk.removeTag")}
            disabled={bulk.isPending}
            onPress={() => setPicker("removeTag")}
          />
          {canUseStorage && moveTargets.length > 0 ? (
            <ListRow
              icon="transfer"
              title={t("storage.moveToLocation")}
              disabled={bulk.isPending}
              onPress={() => setPicker("location")}
            />
          ) : null}
          {bulk.targetCollections.length > 0 ? (
            <ListRow
              icon="collections"
              title={t("storage.moveToCollection")}
              disabled={bulk.isPending}
              onPress={() => setPicker("collection")}
            />
          ) : null}
          {storageLocationGuid ? (
            <ListRow
              icon="storage"
              title={t("cardBulk.removeFromLocation")}
              disabled={bulk.isPending}
              onPress={() => {
                onClose();
                bulk.confirmRemoveFromLocation();
              }}
            />
          ) : null}
          <ListRow
            icon="trash"
            tone="destructive"
            title={t("cardBulk.delete")}
            disabled={bulk.isPending}
            onPress={() => {
              onClose();
              bulk.confirmDelete();
            }}
          />
        </ListGroup>
      </Sheet>
      <OptionSheet
        visible={picker === "export"}
        title={t("export.button")}
        options={bulk.exportAdapters.map((adapter) => ({ value: adapter.key, label: adapter.label }))}
        selected={[]}
        onSelect={(key) => {
          const adapter = bulk.exportAdapters.find((candidate) => candidate.key === key);
          if (adapter) choose(() => bulk.exportCsv(adapter));
        }}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === "foil"}
        title={t("cardDetail.foil")}
        options={[
          { value: "", label: t("cardDetail.foilNone") },
          ...(bulk.foilOptions ?? []).map((type) => ({ value: type, label: type })),
        ]}
        selected={[]}
        onSelect={(value) => choose(() => bulk.setFoilType(value === "" ? null : value))}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === "condition"}
        title={t("cardDetail.condition")}
        options={CARD_CONDITIONS.map((value) => ({ value, label: t(`cardDetail.conditions.${value}`) }))}
        selected={[]}
        onSelect={(value) => choose(() => bulk.setCondition(value as CardCondition))}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === "addTag" || picker === "removeTag"}
        title={picker === "removeTag" ? t("cardBulk.removeTag") : t("cardBulk.addTag")}
        options={tagOptions}
        selected={[]}
        onSelect={(value) => {
          const enabled = picker === "addTag";
          choose(() => bulk.setTag(value as CardTag, enabled));
        }}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === "location"}
        title={t("storage.moveToLocation")}
        options={moveTargets.map((location) => ({ value: location.guid, label: location.name }))}
        selected={[]}
        searchPlaceholder={t("storage.searchLocations")}
        onSelect={(locationGuid) =>
          choose(() =>
            bulk.moveToLocation(locationGuid, moveTargets.find((location) => location.guid === locationGuid)?.name ?? ""),
          )
        }
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === "collection"}
        title={t("storage.moveToCollection")}
        options={bulk.targetCollections.map((collection) => ({ value: collection.guid, label: collection.name }))}
        selected={[]}
        searchPlaceholder={t("storage.searchCollections")}
        onSelect={(collectionGuid) =>
          choose(() =>
            bulk.moveToCollection(
              collectionGuid,
              bulk.targetCollections.find((collection) => collection.guid === collectionGuid)?.name ?? "",
            ),
          )
        }
        onClose={() => setPicker(null)}
      />
    </>
  );
}
