import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/features/companies/api/use-organization";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage-locations";
import { StorageLabelOptionsForm } from "@/features/storage-labels/components/storage-label-options-form";
import { StorageLabelSheet } from "@/features/storage-labels/components/storage-label-sheet";
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
  STORAGE_LABEL_DEFAULT_VALUES,
  STORAGE_LABEL_PRINT_PAGE_STYLE,
  STORAGE_LABEL_TEMPLATES,
} from "@/lib/constants/storage-labels";
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
  const [locationGuids, templateId, startPosition] = useWatch({
    control: form.control,
    name: ["locationGuids", "templateId", "startPosition"],
  });
  const selectedGuids = new Set(locationGuids);
  const selectedLocations = locations.filter((location) => selectedGuids.has(location.guid));
  const template = STORAGE_LABEL_TEMPLATES[templateId];
  const canPrint = selectedLocations.length > 0 && form.formState.isValid;
  const sheet = (
    <StorageLabelSheet
      template={template}
      locations={selectedLocations}
      orgId={orgId}
      startPosition={startPosition}
    />
  );
  const printButton = (
    <Button disabled={!canPrint} onClick={() => window.print()}>
      <IconPrinter />
      {t("labels.page.print")}
    </Button>
  );

  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto text-foreground", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
      <style>{STORAGE_LABEL_PRINT_PAGE_STYLE}</style>
      {isMobile ? (
        <MobilePageHeader
          title={t("labels.page.title")}
          subtitle={t("labels.page.description")}
          backTo={STORAGE_PATH}
        >
          {printButton}
        </MobilePageHeader>
      ) : (
        <PageHeader
          title={t("labels.page.title")}
          description={t("labels.page.description")}
          backTo={STORAGE_PATH}
          backLabel={t("pickList.back")}
          actions={printButton}
        />
      )}
      <div
        className={
          isMobile ? MOBILE_PAGE_BODY_CLASS : "mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:gap-2 md:px-3 md:py-2"
        }
      >
        {isPending ? (
          <ListSkeleton />
        ) : locations.length === 0 ? (
          <EmptyState icon={IconBox} title={t("page.emptyTitle")} description={t("page.emptyDescription")} />
        ) : (
          <>
            <Callout icon={IconInfoCircle}>{t("labels.page.printTip")}</Callout>
            <StorageLabelOptionsForm form={form} locations={locations} />
            {selectedLocations.length > 0 ? (
              sheet
            ) : (
              <EmptyState
                icon={IconPrinter}
                title={t("labels.sheet.emptyTitle")}
                description={t("labels.sheet.emptyDescription")}
              />
            )}
          </>
        )}
      </div>
      {createPortal(<div className="hidden bg-white print:block">{sheet}</div>, document.body)}
    </div>
  );
}

export default function StorageLabelsPage() {
  const { activeOrg } = useOrg();
  if (!activeOrg) return <ListSkeleton />;
  return <StorageLabelsView key={activeOrg.id} orgId={activeOrg.id} />;
}
