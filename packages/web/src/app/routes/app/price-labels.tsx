import { Callout } from "@/components/callout";
import { BusinessTour } from "@/features/business/components/business-tour";
import { BUSINESS_LABELS_TOUR } from "@/features/business/lib/business-tours";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { SkeletonStatus } from "@/components/skeleton-status";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrg } from "@/features/companies/api/use-organization";
import { priceLabelCardsQueryOptions } from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { BusinessUpgradeCallout } from "@/features/business/components/business-upgrade-callout";
import { BusinessOverviewBackButton } from "@/features/business/components/business-overview-back-button";
import { PriceLabelCardList } from "@/features/business/components/price-label-card-list";
import { PriceLabelOptionsForm } from "@/features/business/components/price-label-options-form";
import { PriceLabelSheet } from "@/features/business/components/price-label-sheet";
import {
  buildPriceLabelItems,
  labelPriceFormatter,
  toPriceLabelSource,
} from "@/features/business/lib/price-labels";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  LABEL_SHEET_PRINT_PAGE_STYLE,
  LABEL_SHEET_TEMPLATES,
} from "@/lib/constants/label-sheets";
import {
  MOBILE_CIRCLE_BUTTON_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
} from "@/lib/constants/nav";
import {
  PRICE_LABEL_DEFAULT_VALUES,
  PRICE_LABEL_SOURCE_GUID_PARAM,
  PRICE_LABEL_SOURCE_PARAM,
} from "@/lib/constants/price-labels";
import {
  PRICE_LABEL_CARD_SKELETON_COLUMNS,
  PRICE_LABEL_CARD_SKELETON_ROWS,
} from "@/lib/constants/skeletons";
import type { PriceLabelsViewProps } from "@/lib/interfaces/price-labels";
import { cn } from "@/lib/utils";
import {
  priceLabelOptionsSchema,
  type PriceLabelOptionsFormValues,
} from "@/schemas/price-labels.schema";
import { PRICE_LABEL_CARDS_MAX } from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconInfoCircle, IconPrinter, IconTag } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

function PriceLabelsView({ orgId }: PriceLabelsViewProps) {
  const { t, i18n } = useTranslation("business");
  const { t: tCommon } = useTranslation("common");
  const isMobile = useIsMobile();
  const { access } = useBusinessAccess();
  const [searchParams] = useSearchParams();
  const form = useForm<PriceLabelOptionsFormValues>({
    resolver: zodResolver(priceLabelOptionsSchema),
    defaultValues: {
      ...PRICE_LABEL_DEFAULT_VALUES,
      source:
        toPriceLabelSource(searchParams.get(PRICE_LABEL_SOURCE_PARAM)) ??
        PRICE_LABEL_DEFAULT_VALUES.source,
      sourceGuid: searchParams.get(PRICE_LABEL_SOURCE_GUID_PARAM) ?? "",
    },
    mode: "onChange",
  });
  const [source, sourceGuid, deselectedScanIds, customPrices, templateId, startPosition, showsPrices] =
    useWatch({
      control: form.control,
      name: [
        "source",
        "sourceGuid",
        "deselectedScanIds",
        "customPrices",
        "templateId",
        "startPosition",
        "showsPrices",
      ],
    });
  const cardsQuery = useQuery(
    priceLabelCardsQueryOptions(orgId, source, sourceGuid || null),
  );
  const loaded = cardsQuery.data ?? null;
  const formatLabelPrice = useMemo(
    () => labelPriceFormatter(i18n.language, loaded?.currency ?? "USD"),
    [i18n.language, loaded?.currency],
  );
  const items = buildPriceLabelItems(loaded?.cards ?? [], customPrices);
  const deselected = new Set(deselectedScanIds);
  const selectedItems = items.filter((item) => !deselected.has(item.card.scanId));
  const template = LABEL_SHEET_TEMPLATES[templateId];
  const canPrint = selectedItems.length > 0 && form.formState.isValid && !access?.isLocked;
  const sheet = (
    <PriceLabelSheet
      template={template}
      items={selectedItems}
      startPosition={startPosition}
      formatLabelPrice={formatLabelPrice}
      showsPrices={showsPrices}
    />
  );
  const printButton = (
    <Button data-tour="labels-print" disabled={!canPrint} onClick={() => window.print()}>
      <IconPrinter />
      {tCommon("labelSheets.print")}
    </Button>
  );

  const cardsContent = !sourceGuid ? (
    <EmptyState
      icon={IconTag}
      title={t("priceLabels.empty.pickSourceTitle")}
      description={t("priceLabels.empty.pickSourceDescription")}
    />
  ) : cardsQuery.isPending ? (
    <SkeletonStatus className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-10 w-20 rounded-lg md:h-7" />
      </div>
      <TableSkeleton
        columns={PRICE_LABEL_CARD_SKELETON_COLUMNS}
        rows={PRICE_LABEL_CARD_SKELETON_ROWS}
        rowClassName="min-h-9"
      />
    </SkeletonStatus>
  ) : cardsQuery.isError ? (
    <LoadErrorCallout message={t("errors.loadFailed")} onRetry={() => void cardsQuery.refetch()} />
  ) : !loaded || loaded.cards.length === 0 ? (
    <EmptyState
      icon={IconTag}
      title={t("priceLabels.empty.noCardsTitle")}
      description={t("priceLabels.empty.noCardsDescription")}
    />
  ) : (
    <>
      {loaded.total > PRICE_LABEL_CARDS_MAX && (
        <Callout icon={IconInfoCircle}>
          {t("priceLabels.cards.truncated", {
            shown: PRICE_LABEL_CARDS_MAX,
            total: loaded.total,
          })}
        </Callout>
      )}
      <PriceLabelCardList
        form={form}
        items={items}
        formatLabelPrice={formatLabelPrice}
        showsPrices={showsPrices}
      />
      {selectedItems.length > 0 ? (
        sheet
      ) : (
        <EmptyState
          icon={IconPrinter}
          title={t("priceLabels.empty.noneSelectedTitle")}
          description={t("priceLabels.empty.noneSelectedDescription")}
        />
      )}
    </>
  );

  const optionsForm = (
    <PriceLabelOptionsForm form={form} orgId={orgId} loadedSourceName={loaded?.sourceName ?? null} />
  );
  const printPortal = createPortal(
    <div className="hidden bg-white print:block">{selectedItems.length > 0 && sheet}</div>,
    document.body,
  );

  if (isMobile) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <style>{LABEL_SHEET_PRINT_PAGE_STYLE}</style>
        <MobilePageHeader
          title={t("priceLabels.title")}
          subtitle={t("priceLabels.description")}
          actions={
            <BusinessTour tour={BUSINESS_LABELS_TOUR} className={MOBILE_CIRCLE_BUTTON_CLASS} />
          }
        >
          {printButton}
        </MobilePageHeader>
        <div className={cn("min-h-0 flex-1 overflow-y-auto", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
          <div className="flex flex-col gap-4 p-4">
            <BusinessOverviewBackButton />
            {access?.isLocked && <BusinessUpgradeCallout />}
            <Callout icon={IconInfoCircle}>{tCommon("labelSheets.printTip")}</Callout>
            {optionsForm}
            {cardsContent}
          </div>
        </div>
        {printPortal}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <style>{LABEL_SHEET_PRINT_PAGE_STYLE}</style>
      <div className="grid min-h-0 flex-1 grid-cols-12 overflow-hidden">
        <section className="col-span-4 flex h-full flex-col gap-2 overflow-y-auto border-r bg-sidebar/70 p-2 lg:col-span-3">
          <BusinessOverviewBackButton />
          {optionsForm}
        </section>
        <section className="col-span-8 flex min-h-0 flex-col overflow-y-auto lg:col-span-9">
          <PageHeader
            title={t("priceLabels.title")}
            description={t("priceLabels.description")}
            actions={
              <>
                <BusinessTour tour={BUSINESS_LABELS_TOUR} />
                {printButton}
              </>
            }
            spansFullWidth
          />
          <div className="flex flex-col gap-2 px-3 py-2">
            {access?.isLocked && <BusinessUpgradeCallout />}
            <Callout icon={IconInfoCircle}>{tCommon("labelSheets.printTip")}</Callout>
            {cardsContent}
          </div>
        </section>
      </div>
      {printPortal}
    </div>
  );
}

export default function PriceLabelsPage() {
  const { activeOrg } = useOrg();
  if (!activeOrg) return <ListSkeleton />;
  return <PriceLabelsView key={activeOrg.id} orgId={activeOrg.id} />;
}
