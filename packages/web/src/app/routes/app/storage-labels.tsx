import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { SkeletonStatus } from "@/components/skeleton-status";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrg } from "@/features/companies/api/use-organization";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage-locations";
import { BatchDividerSheet } from "@/features/storage-labels/components/batch-divider-sheet";
import { StorageLabelOptionsForm } from "@/features/storage-labels/components/storage-label-options-form";
import { StorageLabelSheet } from "@/features/storage-labels/components/storage-label-sheet";
import {
  LabelSheetPreviewSkeleton,
  StorageLabelOptionsFormSkeleton,
} from "@/features/storage-labels/components/storage-labels-skeletons";
import { planBatchDividers } from "@/features/storage-labels/lib/batch-dividers";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  MOBILE_NAV_SCROLL_PADDING_CLASS,
  MOBILE_PAGE_BODY_CLASS,
} from "@/lib/constants/nav";
import {
  STORAGE_LOCATION_SEARCH_PARAM,
  STORAGE_PATH,
} from "@/lib/constants/storage";
import {
  LABEL_SHEET_PRINT_PAGE_STYLE,
  LABEL_SHEET_TEMPLATES,
} from "@/lib/constants/label-sheets";
import { STORAGE_LABEL_DEFAULT_VALUES } from "@/lib/constants/storage-labels";
import type { StorageLabelsViewProps } from "@/lib/interfaces/storage-labels";
import { cn } from "@/lib/utils";
import {
  storageLabelOptionsSchema,
  type StorageLabelOptionsFormValues,
} from "@/schemas/storage-labels.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconBox, IconInfoCircle, IconPrinter } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

function StorageLabelsView({ orgId }: StorageLabelsViewProps) {
  const { t } = useTranslation("storage");
  const { t: tCommon } = useTranslation("common");
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const { data: locations = [], isPending } = useQuery(storageLocationsQueryOptions(orgId));
  const form = useForm<StorageLabelOptionsFormValues>({
    resolver: zodResolver(storageLabelOptionsSchema),
    defaultValues: STORAGE_LABEL_DEFAULT_VALUES,
    mode: "onChange",
  });
  const prefillAppliedRef = useRef(false);
  useEffect(() => {
    if (prefillAppliedRef.current || isPending) return;
    prefillAppliedRef.current = true;
    const requestedGuids = new Set(searchParams.getAll(STORAGE_LOCATION_SEARCH_PARAM));
    form.setValue(
      "locationGuids",
      locations.map((location) => location.guid).filter((guid) => requestedGuids.has(guid)),
    );
  }, [form, isPending, locations, searchParams]);
  const [
    sheetKind,
    locationGuids,
    customDividerText,
    showsDividerLocationName,
    templateId,
    startPosition,
  ] = useWatch({
    control: form.control,
    name: [
      "sheetKind",
      "locationGuids",
      "customDividerText",
      "showsDividerLocationName",
      "templateId",
      "startPosition",
    ],
  });
  const printsBatchDividers = sheetKind === "batchDividers";
  const selectedGuids = new Set(locationGuids);
  const selectedLocations = locations.filter((location) => selectedGuids.has(location.guid));
  const template = LABEL_SHEET_TEMPLATES[templateId];
  const dividerPlan = planBatchDividers(selectedLocations, customDividerText);
  const canPrint = printsBatchDividers
    ? dividerPlan.dividers.length > 0
    : selectedLocations.length > 0 && form.formState.isValid;
  const sheet = printsBatchDividers ? (
    <BatchDividerSheet
      dividers={dividerPlan.dividers}
      showsLocationName={showsDividerLocationName}
    />
  ) : (
    <StorageLabelSheet
      template={template}
      locations={selectedLocations}
      orgId={orgId}
      startPosition={startPosition}
    />
  );
  const printTip = (
    <Callout icon={IconInfoCircle}>
      {printsBatchDividers ? t("labels.dividers.printTip") : tCommon("labelSheets.printTip")}
    </Callout>
  );
  const printButton = (
    <Button disabled={!canPrint} onClick={() => window.print()}>
      <IconPrinter />
      {tCommon("labelSheets.print")}
    </Button>
  );

  const labelSheetPreview =
    selectedLocations.length > 0 ? (
      sheet
    ) : (
      <EmptyState
        icon={IconPrinter}
        title={t("labels.sheet.emptyTitle")}
        description={t("labels.sheet.emptyDescription")}
      />
    );
  const { skippedLocationNames } = dividerPlan;
  const batchDividerPreview = (
    <>
      {skippedLocationNames.length > 0 && (
        <Callout icon={IconInfoCircle}>
          {t("labels.dividers.skipped", {
            count: skippedLocationNames.length,
            names: skippedLocationNames.join(", "),
          })}
        </Callout>
      )}
      {dividerPlan.totalDividers > dividerPlan.dividers.length && (
        <Callout icon={IconInfoCircle}>
          {t("labels.dividers.truncated", {
            shown: dividerPlan.dividers.length,
            total: dividerPlan.totalDividers,
          })}
        </Callout>
      )}
      {dividerPlan.dividers.length > 0 ? (
        sheet
      ) : (
        <EmptyState
          icon={IconPrinter}
          title={t("labels.dividers.emptyTitle")}
          description={t("labels.dividers.emptyDescription")}
        />
      )}
    </>
  );
  const emptyLocations = (
    <EmptyState icon={IconBox} title={t("page.emptyTitle")} description={t("page.emptyDescription")} />
  );
  const sheetPreview = printsBatchDividers
    ? batchDividerPreview
    : locations.length === 0
      ? emptyLocations
      : labelSheetPreview;
  const printPortal = createPortal(
    <div className="hidden bg-white print:block">{sheet}</div>,
    document.body,
  );

  if (isMobile) {
    return (
      <div className={cn("min-h-0 flex-1 overflow-y-auto text-foreground", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
        <style>{LABEL_SHEET_PRINT_PAGE_STYLE}</style>
        <MobilePageHeader
          title={t("labels.page.title")}
          subtitle={t("labels.page.description")}
          backTo={STORAGE_PATH}
        >
          {printButton}
        </MobilePageHeader>
        <div className={MOBILE_PAGE_BODY_CLASS}>
          {isPending ? (
            <SkeletonStatus className="flex flex-col gap-5">
              <Skeleton className="h-12 w-full rounded-lg" />
              <StorageLabelOptionsFormSkeleton />
              <LabelSheetPreviewSkeleton />
            </SkeletonStatus>
          ) : (
            <>
              {printTip}
              <StorageLabelOptionsForm form={form} locations={locations} />
              {sheetPreview}
            </>
          )}
        </div>
        {printPortal}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
      <style>{LABEL_SHEET_PRINT_PAGE_STYLE}</style>
      <PageHeader
        title={t("labels.page.title")}
        description={t("labels.page.description")}
        backTo={STORAGE_PATH}
        backLabel={t("pickList.back")}
        actions={printButton}
        spansFullWidth
      />
      <div className="grid min-h-0 flex-1 grid-cols-12 overflow-hidden">
        <section className="col-span-4 flex h-full flex-col gap-2 overflow-y-auto border-r bg-sidebar/70 p-2 lg:col-span-3">
          {isPending ? (
            <SkeletonStatus>
              <StorageLabelOptionsFormSkeleton />
            </SkeletonStatus>
          ) : (
            <StorageLabelOptionsForm form={form} locations={locations} />
          )}
        </section>
        <section className="col-span-8 flex min-h-0 flex-col overflow-y-auto lg:col-span-9">
          <div className="flex flex-col gap-2 px-3 py-2">
            {isPending ? (
              <div aria-hidden="true" className="flex flex-col gap-2">
                <Skeleton className="h-12 w-full rounded-lg" />
                <LabelSheetPreviewSkeleton />
              </div>
            ) : (
              <>
                {printTip}
                {sheetPreview}
              </>
            )}
          </div>
        </section>
      </div>
      {printPortal}
    </div>
  );
}

export default function StorageLabelsPage() {
  const { activeOrg } = useOrg();
  if (!activeOrg) return <ListSkeleton />;
  return <StorageLabelsView key={activeOrg.id} orgId={activeOrg.id} />;
}
