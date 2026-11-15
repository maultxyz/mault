import { Callout } from "@/components/callout";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardDetailArt } from "@/features/cards/components/card-detail-art";
import { CardDetailBodySkeleton } from "@/features/cards/components/card-detail-panel-skeleton";
import { CardPricesSection, CardRulesSection } from "@/features/cards/components/card-detail-sections";
import { CardDetailTitle } from "@/features/cards/components/card-detail-title";
import { useCollections } from "@/features/collections/api/use-collections";
import { catalogCardQueryOptions, rememberCatalogCard } from "@/features/search/api/global-search";
import { useAddCatalogCard } from "@/features/search/api/use-add-catalog-card";
import { CardPrintingsGrid } from "@/features/search/components/card-printings-grid";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePriceSource } from "@/hooks/use-price-source";
import {
  CARD_DETAIL_ACTION_BAR_CLASS,
  CARD_DETAIL_ACTION_ROW_CLASS,
  CARD_DETAIL_BODY_COLUMNS_CLASS,
  CARD_DETAIL_IMAGE_WIDTH_CLASS,
  CARD_DETAIL_IMAGES_CLASS,
  CARD_DETAIL_SCROLL_CLASS,
  CARD_DETAIL_SECTIONS_CLASS,
  CARD_DETAIL_TOP_BAR_CLASS,
} from "@/lib/constants/cards";
import { collectionViewPath, monitorCollectionPath } from "@/lib/constants/collections";
import {
  CATALOG_PRINTING_QUERY_PARAM,
  SEARCH_QUERY_PARAM,
  searchPathFor,
  selectedCatalogPrintingId,
} from "@/lib/constants/search";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { catalogGamesOf, type Collection, type PlayingCard } from "@magic-vault/shared";
import { IconArrowLeft, IconInfoCircle, IconPlus } from "@tabler/icons-react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

export default function CatalogCardPage() {
  const { t } = useTranslation(["search", "common"]);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { gameKey = "", cardId = "" } = useParams<{ gameKey: string; cardId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const selectedCardId = selectedCatalogPrintingId(searchParams, cardId);
  const backTo = searchPathFor(searchParams.get(SEARCH_QUERY_PARAM) ?? "");
  const { collections, activeCollection, isLoading: collectionsLoading } = useCollections();
  const { priceOf } = usePriceSource();
  const addCard = useAddCatalogCard();
  const [pickedCollectionGuid, setPickedCollectionGuid] = useState<string | null>(null);
  const game =
    catalogGamesOf(collections, activeCollection?.guid).find((entry) => entry.gameKey === gameKey) ?? null;
  const cardQuery = useQuery({ ...catalogCardQueryOptions(game, selectedCardId), placeholderData: keepPreviousData });
  const card = cardQuery.data;
  const targets = collections.filter((collection) => collection.game?.key === gameKey);
  const defaultTarget = targets.find((collection) => collection.guid === activeCollection?.guid) ?? targets[0] ?? null;
  const target = targets.find((collection) => collection.guid === pickedCollectionGuid) ?? defaultTarget;
  const unknownGame = !game && !collectionsLoading;
  const title = card?.name ?? t("catalogCard.title");
  const backLabel = t("common:mobileMenu.back");

  const selectPrinting = (printing: PlayingCard) => {
    if (printing.id === selectedCardId) return;
    rememberCatalogCard(queryClient, gameKey, printing);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (printing.id === cardId) next.delete(CATALOG_PRINTING_QUERY_PARAM);
      else next.set(CATALOG_PRINTING_QUERY_PARAM, printing.id);
      return next;
    });
  };

  const collectionPath = (guid: string) => (isMobile ? monitorCollectionPath(guid) : collectionViewPath(guid));

  const add = (playingCard: PlayingCard, collection: Collection) =>
    addCard.mutate(
      { collectionGuid: collection.guid, card: playingCard },
      {
        onSuccess: () =>
          toast.success(t("catalogCard.added", { name: playingCard.name, collection: collection.name }), {
            action: { label: t("catalogCard.view"), onClick: () => navigate(collectionPath(collection.guid)) },
          }),
        onError: () =>
          toast.error(t("catalogCard.addFailed"), {
            action: { label: t("common:a11y.retry"), onClick: () => add(playingCard, collection) },
          }),
      },
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isMobile ? (
        <MobilePageHeader title={title} titleVisuallyHidden backTo={backTo} />
      ) : (
        <div className={CARD_DETAIL_TOP_BAR_CLASS}>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label={backLabel}
            title={backLabel}
            nativeButton={false}
            render={<Link to={backTo} />}
          >
            <IconArrowLeft />
          </Button>
          {!card && <h1 className="sr-only">{title}</h1>}
        </div>
      )}
      <div className={CARD_DETAIL_SCROLL_CLASS}>
        {cardQuery.isError || unknownGame ? (
          <LoadErrorCallout message={t("catalogCard.loadFailed")} onRetry={() => void cardQuery.refetch()} />
        ) : !card ? (
          <div aria-hidden="true" className="contents">
            <CardDetailBodySkeleton imageCount={1} />
          </div>
        ) : (
          <>
            {targets.length === 0 && !collectionsLoading && (
              <Callout variant="info" icon={IconInfoCircle}>
                {t("catalogCard.noCollection", { game: game?.gameName ?? "" })}
              </Callout>
            )}
            <CardDetailTitle
              name={card.name}
              titleTag={isMobile ? "p" : "h1"}
              price={priceOf(card, { isFoil: false, foilType: null, stamp: null })}
              typeLine={card.typeLine}
            />
            <div className={cn("grid gap-6", CARD_DETAIL_BODY_COLUMNS_CLASS)}>
              <div className={CARD_DETAIL_IMAGES_CLASS}>
                <CardDetailArt card={card} widthClass={CARD_DETAIL_IMAGE_WIDTH_CLASS} />
              </div>
              <div className={CARD_DETAIL_SECTIONS_CLASS}>
                <CardRulesSection card={card} />
                <CardPricesSection card={card} isFoil={false} />
              </div>
            </div>
            <CardPrintingsGrid
              game={game}
              openedCardId={cardId}
              selectedCardId={selectedCardId}
              onSelect={selectPrinting}
            />
          </>
        )}
      </div>
      {card && targets.length > 0 && (
        <div className={CARD_DETAIL_ACTION_BAR_CLASS}>
          <div className={CARD_DETAIL_ACTION_ROW_CLASS}>
            {targets.length > 1 && (
              <Select value={target?.guid ?? null} onValueChange={(value) => setPickedCollectionGuid(value as string)}>
                <SelectTrigger aria-label={t("catalogCard.chooseCollection")} className="w-48">
                  <SelectValue>{target?.name ?? ""}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {targets.map((collection) => (
                    <SelectItem key={collection.guid} value={collection.guid}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              disabled={!target || addCard.isPending || cardQuery.isPlaceholderData}
              onClick={() => {
                if (target) add(card, target);
              }}
            >
              <IconPlus />
              {target ? t("catalogCard.addTo", { collection: target.name }) : t("catalogCard.add")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
