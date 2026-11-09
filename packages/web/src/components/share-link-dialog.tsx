import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQrCodeDataUrl } from "@/hooks/use-qr-code-data-url";
import { copyWithToast } from "@/lib/clipboard";
import type {
  CreatedShareLink,
  ShareLinkDialogProps,
} from "@/lib/interfaces/share-links";
import { toast } from "@/lib/toast";
import {
  monitorLinkSchema,
  type MonitorLinkFormValues,
} from "@/schemas/monitor-link.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEFAULT_MONITOR_LINK_EXPIRY_DAYS,
  DEFAULT_SHARE_LINK_SHOWS_PRICES,
  MONITOR_LINK_EXPIRY_DAYS,
} from "@magic-vault/shared";
import { IconCopy, IconLoader2 } from "@tabler/icons-react";
import { useCallback, useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function ShareLinkDialog({
  title,
  description,
  trigger,
  revokedMessage,
  createLink,
  revokeLinks,
}: ShareLinkDialogProps) {
  const { t, i18n } = useTranslation("common");
  const formId = useId();
  const expirySelectId = useId();
  const linkInputId = useId();
  const showPricesId = useId();
  const showPricesDescriptionId = useId();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<CreatedShareLink | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const qrCodeDataUrl = useQrCodeDataUrl(link?.url);

  const form = useForm<MonitorLinkFormValues>({
    resolver: zodResolver(monitorLinkSchema),
    defaultValues: {
      expiresInDays: String(DEFAULT_MONITOR_LINK_EXPIRY_DAYS),
      showPrices: DEFAULT_SHARE_LINK_SHOWS_PRICES,
    },
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
        setLink(
          await createLink(Number(values.expiresInDays), values.showPrices),
        );
      } catch {
        toast.error(t("shareLink.createFailed"));
      }
    },
    [createLink, t],
  );

  const handleCopy = useCallback(async () => {
    if (!link) return;
    await copyWithToast(
      link.url,
      t("shareLink.copied"),
      t("shareLink.copyFailed"),
    );
  }, [link, t]);

  const handleRevoke = useCallback(async () => {
    setIsRevoking(true);
    try {
      await revokeLinks();
      setLink(null);
      toast.success(revokedMessage);
    } catch {
      toast.error(t("shareLink.revokeFailed"));
    } finally {
      setIsRevoking(false);
    }
  }, [revokeLinks, revokedMessage, t]);

  const expiryLabel = (days: number) =>
    t("shareLink.expiryOption", { count: days });
  const isSubmitting = form.formState.isSubmitting;

  return (
    <DynamicDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      trigger={trigger}
      footer={
        <>
          <Button
            variant="outline"
            className="text-destructive md:mr-auto"
            onClick={handleRevoke}
            disabled={isRevoking}
          >
            {isRevoking && <IconLoader2 className="size-4 animate-spin" />}
            {t("shareLink.revokeAll")}
          </Button>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("shareLink.close")}
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting && <IconLoader2 className="size-4 animate-spin" />}
            {link ? t("shareLink.createAnother") : t("shareLink.create")}
          </Button>
        </>
      }
      footerClassName="flex-col-reverse md:flex-row"
    >
      <form
        id={formId}
        onSubmit={form.handleSubmit(handleCreate)}
        className="flex flex-col gap-4"
      >
        <Controller
          name="expiresInDays"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={expirySelectId}>
                {t("shareLink.expiryLabel")}
              </FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={expirySelectId}>
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
        <Controller
          name="showPrices"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={showPricesId}>
                  {t("shareLink.showPrices")}
                </FieldLabel>
                <FieldDescription id={showPricesDescriptionId}>
                  {t("shareLink.showPricesDescription")}
                </FieldDescription>
              </FieldContent>
              <Switch
                id={showPricesId}
                aria-describedby={showPricesDescriptionId}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </Field>
          )}
        />
        {link && (
          <>
            {qrCodeDataUrl && (
              <figure className="flex flex-col items-center gap-1.5 animate-in fade-in motion-reduce:animate-none">
                <img
                  src={qrCodeDataUrl}
                  alt={t("shareLink.qrAlt")}
                  className="size-44 rounded-lg ring-1 ring-border"
                />
                <figcaption className="text-xs text-foreground/70">
                  {t("shareLink.qrHint")}
                </figcaption>
              </figure>
            )}
            <Field>
              <FieldLabel htmlFor={linkInputId}>
                {t("shareLink.linkLabel")}
              </FieldLabel>
              <div className="flex gap-1.5">
                <Input
                  id={linkInputId}
                  readOnly
                  value={link.url}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label={t("shareLink.copy")}
                >
                  <IconCopy />
                </Button>
              </div>
              <p className="text-xs text-foreground/70">
                {t("shareLink.expiresAt", {
                  date: new Date(link.expiresAt).toLocaleString(i18n.language, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })}
              </p>
            </Field>
          </>
        )}
      </form>
    </DynamicDialog>
  );
}
