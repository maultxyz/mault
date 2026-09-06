import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import { CreateCollectionDialog } from "@/features/collections/components/create-collection-dialog";
import { useOrg } from "@/features/companies/api/use-organization";
import { cn } from "@/lib/utils";
import {
  renameCollectionSchema,
  type RenameCollectionFormValues,
} from "@/schemas/collections.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlbum,
  IconEdit,
  IconEraser,
  IconLayoutGrid,
  IconLoader2,
  IconPlayerPlay,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function CollectionsPage() {
  const { t } = useTranslation("collections");
  const {
    collections,
    activeCollection,
    isActivating,
    isMutating,
    renameCollection,
    activateCollection,
    deleteCollection,
    emptyCollection,
  } = useCollections();
  const { activeOrg } = useOrg();
  const { isLoading } = useQuery({
    ...collectionsQueryOptions,
    enabled: !!activeOrg,
  });

  const [renameTarget, setRenameTarget] = useState<{
    guid: string;
    name: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    guid: string;
    name: string;
  } | null>(null);
  const [emptyTarget, setEmptyTarget] = useState<{
    guid: string;
    name: string;
  } | null>(null);

  const renameForm = useForm<RenameCollectionFormValues>({
    resolver: zodResolver(renameCollectionSchema),
    defaultValues: { name: renameTarget?.name ?? "" },
    mode: "onChange",
  });

  const handleRename = useCallback(
    async (values: RenameCollectionFormValues) => {
      if (!renameTarget) return;
      const isDuplicate = collections.some(
        (c) =>
          c.guid !== renameTarget.guid &&
          c.name.trim().toLowerCase() === values.name.trim().toLowerCase(),
      );
      if (isDuplicate) {
        renameForm.setError("name", {
          type: "manual",
          message: t("createDialog.duplicateName"),
        });
        return;
      }
      await renameCollection(renameTarget.guid, values.name);
      setRenameTarget(null);
    },
    [renameTarget, renameCollection, collections, renameForm],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteCollection(deleteTarget.guid);
    setDeleteTarget(null);
  }, [deleteTarget, deleteCollection]);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleEmpty = useCallback(async () => {
    if (!emptyTarget) return;
    await emptyCollection(emptyTarget.guid);
    setEmptyTarget(null);
  }, [emptyTarget, emptyCollection]);

  const handleEmptyOpenChange = useCallback((open: boolean) => {
    if (!open) setEmptyTarget(null);
  }, []);

  return (
    <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold font-heading">
            {t("page.title")}
          </h1>
          <p className="text-xs text-muted-foreground">{t("page.subtitle")}</p>
        </div>
        <CreateCollectionDialog
          trigger={({ disabled }) => (
            <Button disabled={disabled}>
              <IconPlus className="size-4" />
              {t("page.newCollection")}
            </Button>
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 border rounded-lg"
            >
              <Skeleton className="size-8 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          ))}

        {!isLoading && collections.length === 0 && (
          <EmptyState
            icon={<IconAlbum className="size-10" />}
            title={t("page.emptyTitle")}
            description={t("page.emptyDescription")}
          />
        )}

        {collections.map((collection) => {
          const isActive = collection.guid === activeCollection?.guid;
          return (
            <div
              key={collection.guid}
              className={cn(
                "flex items-center gap-3 px-4 py-3 border rounded-lg",
                isActive && "border-primary bg-primary/5 dark:bg-primary/15",
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {collection.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("page.cardCount", { count: collection.cardCount })} ·{" "}
                  {collection.game ? collection.game.name : t("page.noGame")} ·{" "}
                  {new Date(collection.createdAt).toLocaleDateString()}
                </p>
              </div>

              <ButtonGroup className="shrink-0">
                {!isActive && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={isActivating}
                          onClick={() => activateCollection(collection.guid)}
                        >
                          <IconPlayerPlay className="size-4 text-muted-foreground" />
                        </Button>
                      }
                    ></TooltipTrigger>
                    <TooltipContent>
                      {t("page.setActiveCollection")}
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        render={
                          <Link to={`/app/collections/${collection.guid}/bins`}>
                            <IconLayoutGrid />
                          </Link>
                        }
                      />
                    }
                  ></TooltipTrigger>
                  <TooltipContent>{t("page.editSortingRules")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={isMutating}
                        onClick={() => {
                          renameForm.reset({ name: collection.name });
                          setRenameTarget({
                            guid: collection.guid,
                            name: collection.name,
                          });
                        }}
                      >
                        <IconEdit />
                      </Button>
                    }
                  ></TooltipTrigger>
                  <TooltipContent>{t("page.rename")}</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline-destructive"
                        size="icon"
                        disabled={isMutating}
                      >
                        <IconTrash />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        setEmptyTarget({
                          guid: collection.guid,
                          name: collection.name,
                        })
                      }
                    >
                      <IconEraser />
                      {t("page.emptyCollection")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() =>
                        setDeleteTarget({
                          guid: collection.guid,
                          name: collection.name,
                        })
                      }
                    >
                      <IconTrash />
                      {t("page.deleteCollection")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
            </div>
          );
        })}
      </div>
      <DynamicDialog
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        title={t("renameDialog.title")}
        description={t("renameDialog.description")}
        trigger={<span />}
        footer={
          <>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              {t("createDialog.cancel")}
            </Button>
            <Button
              type="submit"
              form="rename-collection-form"
              disabled={!renameForm.formState.isValid || isMutating}
            >
              {isMutating && <IconLoader2 className="size-4 animate-spin" />}
              {t("renameDialog.submit")}
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      >
        <form
          id="rename-collection-form"
          onSubmit={renameForm.handleSubmit(handleRename)}
        >
          <Controller
            name="name"
            control={renameForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="rename-collection-name">
                  {t("createDialog.nameLabel")}
                </FieldLabel>
                <Input
                  {...field}
                  id="rename-collection-name"
                  aria-invalid={fieldState.invalid}
                  autoFocus
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </form>
      </DynamicDialog>
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteOpenChange}
        title={t("deleteDialog.title")}
        description={t("deleteDialog.description", {
          name: deleteTarget?.name ?? "",
        })}
        confirm={{ type: "name", name: deleteTarget?.name ?? "" }}
        onConfirm={handleDelete}
      />
      <DeleteDialog
        open={!!emptyTarget}
        onOpenChange={handleEmptyOpenChange}
        title={t("emptyDialog.title")}
        description={t("emptyDialog.description", {
          name: emptyTarget?.name ?? "",
        })}
        confirm={{ type: "name", name: emptyTarget?.name ?? "" }}
        confirmLabel={t("emptyDialog.confirmLabel")}
        onConfirm={handleEmpty}
      />
    </div>
  );
}
