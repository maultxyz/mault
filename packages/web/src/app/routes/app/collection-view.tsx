import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardGrid } from "@/features/cards/components/card-grid";
import { useCollections } from "@/features/collections/api/use-collections";
import { ViewedCollectionContext } from "@/features/collections/api/use-viewed-collection";
import { COLLECTIONS_PATH } from "@/lib/constants/collections";
import {
  IconAlbum,
  IconArrowLeft,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useParams } from "react-router-dom";

export default function CollectionViewPage() {
  const { t } = useTranslation("collections");
  const { collectionGuid } = useParams<{ collectionGuid: string }>();
  const {
    collections,
    activeCollection,
    isLoading,
    isActivating,
    activateCollection,
  } = useCollections();
  const collection =
    collections.find((candidate) => candidate.guid === collectionGuid) ?? null;

  if (collectionGuid && collectionGuid === activeCollection?.guid) {
    return <Navigate to="/app" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Skeleton className="size-9 rounded-md" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <EmptyState
        className="flex-1"
        icon={IconAlbum}
        title={t("view.notFoundTitle")}
        description={t("view.notFoundDescription")}
        action={
          <Button
            variant="outline"
            size="sm"
            render={<Link to={COLLECTIONS_PATH}>{t("view.back")}</Link>}
          />
        }
      />
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("view.back")}
          render={
            <Link to={COLLECTIONS_PATH}>
              <IconArrowLeft />
            </Link>
          }
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{collection.name}</p>
          <p className="text-xs text-foreground/70">{t("view.subtitle")}</p>
        </div>
        <Button
          variant="outline"
          disabled={isActivating}
          onClick={() => activateCollection(collection.guid)}
        >
          <IconPlayerPlay />
          {t("page.setActiveCollection")}
        </Button>
      </div>
      <section className="flex flex-1 min-h-0 flex-col overflow-y-auto @container">
        <ViewedCollectionContext value={collection}>
          <CardGrid />
        </ViewedCollectionContext>
      </section>
    </div>
  );
}
