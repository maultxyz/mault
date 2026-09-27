import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildMonitorLinkUrl,
  createMonitorLink,
  revokeMonitorLinks,
} from "@/features/collections/api/monitor-links";
import type {
  CreatedMonitorLink,
  ShareMonitorLinkDialogProps,
} from "@/lib/interfaces/collections";
import {
  monitorLinkSchema,
  type MonitorLinkFormValues,
} from "@/schemas/monitor-link.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEFAULT_MONITOR_LINK_EXPIRY_DAYS,
  MONITOR_LINK_EXPIRY_DAYS,
} from "@magic-vault/shared";
import { IconCopy, IconLoader2, IconShare } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";

export function ShareMonitorLinkDialog({
  collectionGuid,
}: ShareMonitorLinkDialogProps) {
  const { t, i18n } = useTranslation("collections");
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<CreatedMonitorLink | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const form = useForm<MonitorLinkFormValues>({
    resolver: zodResolver(monitorLinkSchema),
    defaultValues: { expiresInDays: String(DEFAULT_MONITOR_LINK_EXPIRY_DAYS) },
  });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        setLink(null);
        form.reset();
      }
    },
    [form],
  );

  const handleCreate = useCallback(
    async (values: MonitorLinkFormValues) => {
      try {
        const result = await createMonitorLink(
          collectionGuid,
          Number(values.expiresInDays),
        );
        if (!result.success || !result.data) {
          toast.error(t("shareMonitorLink.createFailed"));
          return;
        }
        setLink({
          url: buildMonitorLinkUrl(collectionGuid, result.data.token),
          expiresAt: result.data.expiresAt,
        });
      } catch {
        toast.error(t("shareMonitorLink.createFailed"));
      }
    },
    [collectionGuid, t],
  );

  const handleCopy = useCallback(async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success(t("shareMonitorLink.copied"));
    } catch {
      toast.error(t("shareMonitorLink.copyFailed"));
    }
  }, [link, t]);

  const handleRevoke = useCallback(async () => {
    setIsRevoking(true);
    try {
      const result = await revokeMonitorLinks(collectionGuid);
      if (!result.success) {
        toast.error(t("shareMonitorLink.revokeFailed"));
        return;
      }
      setLink(null);
      toast.success(t("shareMonitorLink.revoked"));
    } catch {
      toast.error(t("shareMonitorLink.revokeFailed"));
    } finally {
      setIsRevoking(false);
    }
  }, [collectionGuid, t]);

  const expiryLabel = (days: number) =>
    t("shareMonitorLink.expiryOption", { count: days });
  const isSubmitting = form.formState.isSubmitting;

  return (
    <DynamicDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t("shareMonitorLink.title")}
      description={t("shareMonitorLink.description")}
      trigger={
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          title={t("shareMonitorLink.trigger")}
          aria-label={t("shareMonitorLink.trigger")}
        >
          <IconShare className="size-4" />
        </Button>
      }
      footer={
        <>
          <Button
            variant="outline"
            className="text-destructive md:mr-auto"
            onClick={handleRevoke}
            disabled={isRevoking}
          >
            {isRevoking && <IconLoader2 className="size-4 animate-spin" />}
            {t("shareMonitorLink.revokeAll")}
          </Button>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("shareMonitorLink.close")}
          </Button>
          <Button
            type="submit"
            form="share-monitor-link-form"
            disabled={isSubmitting}
          >
            {isSubmitting && <IconLoader2 className="size-4 animate-spin" />}
            {link
              ? t("shareMonitorLink.createAnother")
              : t("shareMonitorLink.create")}
          </Button>
        </>
      }
      footerClassName="flex-col-reverse md:flex-row"
    >
      <form
        id="share-monitor-link-form"
        onSubmit={form.handleSubmit(handleCreate)}
        className="flex flex-col gap-4"
      >
        <Controller
          name="expiresInDays"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="monitor-link-expiry">
                {t("shareMonitorLink.expiryLabel")}
              </FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="monitor-link-expiry">
                  <SelectValue>{expiryLabel(Number(field.value))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MONITOR_LINK_EXPIRY_DAYS.map((days) => (
                    <SelectItem key={days} value={String(days)}>
                      {expiryLabel(days)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        {link && (
          <Field>
            <FieldLabel htmlFor="monitor-link-url">
              {t("shareMonitorLink.linkLabel")}
            </FieldLabel>
            <div className="flex gap-2">
              <Input
                id="monitor-link-url"
                readOnly
                value={link.url}
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label={t("shareMonitorLink.copy")}
              >
                <IconCopy />
              </Button>
            </div>
            <p className="text-xs text-foreground/70">
              {t("shareMonitorLink.expiresAt", {
                date: new Date(link.expiresAt).toLocaleString(i18n.language, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </p>
          </Field>
        )}
      </form>
    </DynamicDialog>
  );
}
