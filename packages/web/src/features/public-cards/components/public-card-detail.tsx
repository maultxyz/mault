import { LANGUAGE_LABELS } from "@magic-vault/shared";
import { CardImage } from "@/components/card-image";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  isPublicCardsUnavailableError,
  loadPublicScanImageDownload,
  publicCardDetailQueryOptions,
} from "@/features/public-cards/api/public-cards";
import { DownloadScanImageButton } from "@/features/cards/components/download-scan-image-button";
import { CapturedImageThumb } from "@/features/cards/components/captured-image-thumb";
import { CardDetailsList } from "@/features/cards/components/card-details-list";
import { CardImageViewer } from "@/features/cards/components/card-image-viewer";
import { CardPriceDetails } from "@/features/cards/components/card-price-details";
import { DetailSection } from "@/features/cards/components/detail-section";
import { usePriceSource } from "@/hooks/use-price-source";
import { useTradeOfferContext } from "@/lib/trade-offer-context";
import type { PublicCardDetailViewProps } from "@/lib/interfaces/public-cards";
import {
  DEFAULT_CARD_LANGUAGE,
  isCardCondition,
  scanImageDownloadFileName,
  scanLanguage,
  type ScanImageSide,
} from "@magic-vault/shared";
import {
  IconArrowLeft,
  IconArrowsExchange,
  IconCards,
  IconSwitchHorizontal,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function PublicCardDetailView({
  source,
  scanId,
  onClose,
}: PublicCardDetailViewProps) {
  const { t } = useTranslation("cards");
  const { t: tCards } = useTranslation("cards");
  const { priceOf, format } = usePriceSource();
  const tradeOffer = useTradeOfferContext();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [backSideScanId, setBackSideScanId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const { data: detail, isPending, isError, error, refetch } = useQuery(
    publicCardDetailQueryOptions(source, scanId),
  );

  useEffect(() => {
    if (detail) headingRef.current?.focus();
  }, [detail]);

  const CardHeading = onClose ? "h2" : "h1";
  const topBar = onClose && (
    <div className="sticky top-0 z-10 bg-background/80 p-2 backdrop-blur-2xl">
      <Button variant="ghost" onClick={onClose}>
        <IconArrowLeft />
        {t("publicBrowse.backToCards")}
      </Button>
    </div>
  );

  if (isError || isPending) {
    return (
      <div className="flex min-h-full flex-col">
        {topBar}
        <div className="flex flex-col gap-5 md:gap-2 p-4 md:px-3 md:py-2">
          {isError ? (
            isPublicCardsUnavailableError(error) ? (
              <div role="alert">
                <EmptyState
                  icon={IconCards}
                  title={t("publicBrowse.cardLoadFailed")}
                  action={
                    <Button variant="outline" onClick={() => void refetch()}>
                      {t("common:a11y.retry")}
                    </Button>
                  }
                />
              </div>
            ) : (
              <div role="alert">
                <EmptyState icon={IconCards} title={t("publicBrowse.cardNotFound")} />
              </div>
            )
          ) : (
            <>
              <Skeleton className="h-6 w-48" />
              <div className="flex flex-wrap gap-3 max-md:grid max-md:grid-cols-2">
                <Skeleton className="aspect-[2.5/3.5] w-56 max-md:w-full" />
                <Skeleton className="aspect-[2.5/3.5] w-56 max-md:w-full" />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const { card } = detail;
  const price = priceOf(
    card,
    { isFoil: detail.isFoil, foilType: detail.foilType ?? undefined },
    detail.condition,
  );
  const language = scanLanguage(detail);
  const conditionName = isCardCondition(detail.condition)
    ? tCards(`condition.names.${detail.condition}`)
    : detail.condition;
  const foilLabel = detail.isFoil ? (detail.foilType ?? tCards("foil")) : null;
  const showsBackSide = backSideScanId === scanId && !!detail.backScanImageUrl;
  const shownScanUrl = showsBackSide ? detail.backScanImageUrl : detail.scanImageUrl;
  const shownScanSide: ScanImageSide = showsBackSide ? "back" : "front";
  const scanImageDownload = {
    loadImage: () => loadPublicScanImageDownload(source, scanId, shownScanSide),
    fileName: scanImageDownloadFileName(card.name, shownScanSide),
  };
  const toggleSideLabel = showsBackSide
    ? tCards("cardDetailPanel.showFrontSide")
    : tCards("cardDetailPanel.showBackSide");
  const attributes = [
    { label: tCards("foil"), value: foilLabel ?? tCards("foilNone") },
    { label: tCards("stamp"), value: detail.stamp },
    { label: tCards("condition.label"), value: conditionName },
    { label: tCards("language"), value: LANGUAGE_LABELS[language] ?? language },
  ].filter((attribute): attribute is { label: string; value: string } => !!attribute.value);

  const cardImages = (
    <>
      {shownScanUrl && (
        <figure className="flex min-w-0 flex-col gap-1.5">
          <div className="flex w-56 items-center justify-between gap-1.5 max-md:w-full">
            <figcaption className="text-xs text-foreground/70">
              {showsBackSide
                ? tCards("cardDetailPanel.capturedBackSide")
                : tCards("cardDetailPanel.capturedScan")}
            </figcaption>
            <div className="flex items-center gap-1.5">
              <DownloadScanImageButton {...scanImageDownload} />
              {detail.backScanImageUrl && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={toggleSideLabel}
                        aria-pressed={showsBackSide}
                        onClick={() => setBackSideScanId(showsBackSide ? null : scanId)}
                      >
                        <IconSwitchHorizontal />
                      </Button>
                    }
                  />
                  <TooltipContent>{toggleSideLabel}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            aria-label={tCards("cardDetailPanel.enlargeImage")}
            title={tCards("cardDetailPanel.enlargeImage")}
            className="relative aspect-[2.5/3.5] w-56 cursor-zoom-in overflow-hidden rounded-lg bg-muted transition-shadow hover:ring-2 hover:ring-primary/60 motion-reduce:transition-none max-md:w-full"
          >
            <CapturedImageThumb
              src={shownScanUrl}
              alt={
                showsBackSide
                  ? tCards("cardDetailPanel.capturedBackSideAlt")
                  : tCards("cardPicker.scannedAlt")
              }
            />
          </button>
        </figure>
      )}
      <figure className="flex min-w-0 flex-col gap-1.5">
        {shownScanUrl && (
          <figcaption className="flex h-6 items-center text-xs text-foreground/70">
            {t("publicBrowse.referenceImage")}
          </figcaption>
        )}
        <div className="relative aspect-[2.5/3.5] w-56 overflow-hidden rounded-lg bg-muted max-md:w-full">
          <CardImage
            src={card.image?.normal || card.image?.small}
            placeholderSrc={card.image?.small}
            alt={card.name}
            loading="eager"
          />
        </div>
      </figure>
    </>
  );

  return (
    <div className="flex min-h-full flex-col">
      {shownScanUrl && (
        <CardImageViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          capturedImageUrl={shownScanUrl}
          download={scanImageDownload}
          showOcrRegions={false}
        />
      )}
      {topBar}
      <div className="@container flex flex-col gap-5 md:gap-2 p-4 md:px-3 md:py-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 max-md:flex-wrap max-md:gap-y-1">
            <CardHeading
              ref={headingRef}
              tabIndex={-1}
              className="truncate text-base font-semibold outline-none max-md:line-clamp-2 max-md:whitespace-normal"
            >
              {card.name}
            </CardHeading>
            {price != null && (
              <span className="shrink-0 text-base font-semibold tabular-nums">
                {format(price)}
              </span>
            )}
            {foilLabel && (
              <Badge variant="secondary" className="shrink-0">
                {foilLabel}
              </Badge>
            )}
            {detail.stamp && (
              <Badge variant="secondary" className="shrink-0">
                {detail.stamp}
              </Badge>
            )}
            <Badge variant="secondary" className="shrink-0">
              {conditionName}
            </Badge>
            {language !== (card.lang || DEFAULT_CARD_LANGUAGE) && (
              <Badge variant="secondary" className="shrink-0">
                {LANGUAGE_LABELS[language] ?? language}
              </Badge>
            )}
          </div>
          {card.typeLine && (
            <p className="truncate text-sm text-foreground/70">{card.typeLine}</p>
          )}
          {tradeOffer && (
            <Button
              variant={tradeOffer.isWanted(detail.scanId) ? "selected" : "outline"}
              className="mt-2 mr-1.5"
              aria-pressed={tradeOffer.isWanted(detail.scanId)}
              onClick={() => tradeOffer.toggleWanted(detail)}
            >
              <IconArrowsExchange />
              {tradeOffer.isWanted(detail.scanId)
                ? t("tradeOffers.inTradeOffer")
                : t("tradeOffers.addToTradeOffer")}
            </Button>
          )}
        </div>

        <div className="grid gap-6 @3xl:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex flex-wrap items-start gap-3 @3xl:flex-col @6xl:flex-row max-md:grid max-md:grid-cols-2">
            {cardImages}
          </div>

          <div className="flex min-w-0 flex-col gap-6 md:gap-2">
            <DetailSection title={tCards("cardDetailPanel.details")}>
              <div className="flex flex-col gap-4">
                <CardDetailsList card={card} />
                {card.text && (
                  <p className="rounded-lg bg-foreground/6 p-3 text-sm leading-relaxed whitespace-pre-line">
                    {card.text}
                  </p>
                )}
              </div>
            </DetailSection>

            <dl className="flex flex-wrap items-start gap-6 max-md:grid max-md:grid-cols-2 max-md:gap-3">
              {attributes.map((attribute) => (
                <div key={attribute.label} className="flex flex-col gap-1.5">
                  <dt className="text-control font-medium">{attribute.label}</dt>
                  <dd className="text-sm">{attribute.value}</dd>
                </div>
              ))}
            </dl>

            {price != null && (
              <DetailSection title={tCards("cardDetailPanel.prices")}>
                <CardPriceDetails
                  card={card}
                  isFoil={detail.isFoil}
                  foilType={detail.foilType}
                  stamp={detail.stamp}
                  condition={detail.condition}
                />
              </DetailSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
