import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cancelIntakeLot } from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import type { IntakeCancelDialogProps } from "@/lib/interfaces/business";
import {
  intakeCancelSchema,
  type IntakeCancelFormValues,
} from "@/schemas/business.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function IntakeCancelDialog({
  lot,
  open,
  onOpenChange,
}: IntakeCancelDialogProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const form = useForm<IntakeCancelFormValues>({
    resolver: zodResolver(intakeCancelSchema),
    defaultValues: { removeCards: true },
  });

  useEffect(() => {
    if (open) form.reset({ removeCards: true });
  }, [open, form]);

  const submit = async (values: IntakeCancelFormValues) => {
    const result = await run(
      () => cancelIntakeLot(lot.guid, values),
      t("intake.cancelled"),
    );
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("intake.cancelTitle")}</DialogTitle>
          <DialogDescription>
            {t("intake.cancelDescription", { name: lot.customerName })}
          </DialogDescription>
        </DialogHeader>
        <form id="intake-cancel-form" onSubmit={form.handleSubmit(submit)}>
          <Controller
            control={form.control}
            name="removeCards"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3">
                <span className="flex flex-col">
                  <span className="text-sm">
                    {t("intake.removeCards", { count: lot.cardCount })}
                  </span>
                  <span className="text-xs text-foreground/70">
                    {t(
                      lot.ownsCollection
                        ? "intake.removeCardsHintOwned"
                        : "intake.removeCardsHint",
                    )}
                  </span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("actions.back")}
          </Button>
          <Button
            type="submit"
            form="intake-cancel-form"
            variant="destructive"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
            {t("intake.cancelLot")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
