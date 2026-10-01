import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { useCollections } from "@/features/collections/api/use-collections";
import { useSaveDiscordChannels } from "@/features/integrations/api/use-save-discord-channels";
import { DiscordChannelSelect } from "@/features/integrations/components/discord-channel-select";
import { EMPTY_COLLECTION_OVERRIDE } from "@/lib/constants/integrations";
import type { CollectionOverrideDialogProps } from "@/lib/interfaces/integrations";
import {
  createCollectionOverrideFormSchema,
  type CollectionOverrideFormValues,
} from "@/schemas/collection-override.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Collection } from "@magic-vault/shared";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function CollectionOverrideDialog({
  open,
  onOpenChange,
  integration,
}: CollectionOverrideDialogProps) {
  const { t } = useTranslation("integrations");
  const { collections } = useCollections();
  const save = useSaveDiscordChannels();
  const schema = useMemo(() => createCollectionOverrideFormSchema(t), [t]);
  const channels = integration.guild?.channels ?? [];
  const available = useMemo(() => {
    const overridden = new Set(integration.collections.map((c) => c.guid));
    return collections.filter((c) => !overridden.has(c.guid));
  }, [collections, integration.collections]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CollectionOverrideFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_COLLECTION_OVERRIDE,
  });

  useEffect(() => {
    if (open) reset(EMPTY_COLLECTION_OVERRIDE);
  }, [open, reset]);

  const onSubmit = (values: CollectionOverrideFormValues) =>
    save.mutate(
      {
        collectionGuid: values.collectionGuid,
        scanChannelId: values.scanChannelId,
        errorChannelId: values.errorChannelId,
      },
      {
        onSuccess: (result) => {
          if (result.success) onOpenChange(false);
        },
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("overrideDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("overrideDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <Field data-invalid={!!errors.collectionGuid}>
            <Label>{t("overrides.collection")}</Label>
            <Controller
              control={control}
              name="collectionGuid"
              render={({ field }) => (
                <Combobox
                  items={available}
                  value={available.find((c) => c.guid === field.value) ?? null}
                  onValueChange={(c: Collection | null) =>
                    field.onChange(c?.guid ?? "")
                  }
                  itemToStringLabel={(c: Collection) => c.name}
                  isItemEqualToValue={(a: Collection, b: Collection) =>
                    a?.guid === b?.guid
                  }
                >
                  <ComboboxInput
                    placeholder={t("overrideDialog.collectionPlaceholder")}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>{t("overrideDialog.noCollections")}</ComboboxEmpty>
                    <ComboboxList>
                      {(c: Collection) => (
                        <ComboboxItem key={c.guid} value={c}>
                          <span className="truncate">{c.name}</span>
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            />
            <FieldError errors={[errors.collectionGuid]} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label>{t("channelSettings.scan")}</Label>
              <Controller
                control={control}
                name="scanChannelId"
                render={({ field }) => (
                  <DiscordChannelSelect
                    value={field.value}
                    channels={channels}
                    emptyLabel={t("channelSettings.sameScan")}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
            <Field data-invalid={!!errors.errorChannelId}>
              <Label>{t("channelSettings.error")}</Label>
              <Controller
                control={control}
                name="errorChannelId"
                render={({ field }) => (
                  <DiscordChannelSelect
                    value={field.value}
                    channels={channels}
                    emptyLabel={t("channelSettings.sameError")}
                    onChange={field.onChange}
                  />
                )}
              />
              <FieldError errors={[errors.errorChannelId]} />
            </Field>
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("overrideDialog.cancel")}
            </DialogClose>
            <Button type="submit" disabled={save.isPending}>
              {t("overrideDialog.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
