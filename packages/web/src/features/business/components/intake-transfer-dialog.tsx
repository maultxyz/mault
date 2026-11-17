import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { transferIntakeLot } from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import { useCollections } from "@/features/collections/api/use-collections";
import { NEW_COLLECTION_OPTION } from "@/lib/constants/business";
import type { IntakeTransferDialogProps } from "@/lib/interfaces/business";
import { toast } from "@/lib/toast";
import {
  intakeTransferSchema,
  type IntakeTransferFormValues,
} from "@/schemas/business.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function IntakeTransferDialog({
  lot,
  open,
  onOpenChange,
}: IntakeTransferDialogProps) {
  const { t } = useTranslation("business");
  const { collections } = useCollections();
  const run = useBusinessAction();
  const targets = useMemo(
    () =>
      collections.filter(
        (collection) =>
          collection.guid !== lot.collectionGuid &&
          (collection.game?.guid ?? null) === lot.collectionGameGuid,
      ),
    [collections, lot.collectionGuid, lot.collectionGameGuid],
  );
  const form = useForm<IntakeTransferFormValues>({
    resolver: zodResolver(intakeTransferSchema),
    defaultValues: {
      targetCollectionGuid: NEW_COLLECTION_OPTION,
      newCollectionName: "",
      deleteSource: true,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      targetCollectionGuid: targets[0]?.guid ?? NEW_COLLECTION_OPTION,
      newCollectionName: "",
      deleteSource: lot.ownsCollection,
    });
  }, [open, targets, lot.ownsCollection, form]);

  const target = useWatch({ control: form.control, name: "targetCollectionGuid" });
  const isNew = target === NEW_COLLECTION_OPTION;

  const submit = async (values: IntakeTransferFormValues) => {
    const result = await run(() =>
      transferIntakeLot(lot.guid, {
        targetCollectionGuid: isNew ? null : values.targetCollectionGuid,
        newCollectionName: isNew ? values.newCollectionName : null,
        deleteSource: values.deleteSource,
      }),
    );
    if (result?.data) {
      toast.success(t("transfer.moved", { count: result.data.moved }));
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("transfer.title")}</DialogTitle>
          <DialogDescription>
            {t("transfer.description", { name: lot.collectionName })}
          </DialogDescription>
        </DialogHeader>
        <form
          id="intake-transfer-form"
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(submit)}
        >
          <Controller
            control={form.control}
            name="targetCollectionGuid"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="transfer-target">
                  {t("transfer.target")}
                </FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value ?? "")}
                >
                  <SelectTrigger id="transfer-target">
                    <SelectValue>
                      {isNew
                        ? t("transfer.newCollection")
                        : (targets.find((c) => c.guid === field.value)?.name ??
                          t("intake.chooseCollection"))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {targets.map((collection) => (
                      <SelectItem key={collection.guid} value={collection.guid}>
                        {collection.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_COLLECTION_OPTION}>
                      {t("transfer.newCollection")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {targets.length === 0 && (
                  <p className="text-xs text-foreground/70">
                    {t("transfer.noTargets")}
                  </p>
                )}
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          {isNew && (
            <Controller
              control={form.control}
              name="newCollectionName"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="transfer-name">
                    {t("transfer.newName")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="transfer-name"
                    placeholder={t("transfer.newNamePlaceholder")}
                    aria-invalid={fieldState.invalid}
                    autoFocus
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}
          {lot.ownsCollection && (
            <Controller
              control={form.control}
              name="deleteSource"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-3">
                  <span className="flex flex-col">
                    <span className="text-sm">
                      {t("transfer.deleteSource", { name: lot.collectionName })}
                    </span>
                    <span className="text-xs text-foreground/70">
                      {t("transfer.deleteSourceHint")}
                    </span>
                  </span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("transfer.later")}
          </Button>
          <Button
            type="submit"
            form="intake-transfer-form"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
            {t("transfer.move")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
