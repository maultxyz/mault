import { useOrg } from "@/features/companies/api/use-organization";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQrCodeDataUrl } from "@/hooks/use-qr-code-data-url";
import { copyWithToast } from "@/lib/clipboard";
import type { OrderPhonePickDialogProps } from "@/lib/interfaces/business";
import { buildOrderPickUrl } from "@magic-vault/shared";
import { IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function OrderPhonePickDialog({ open, onOpenChange, orderGuids }: OrderPhonePickDialogProps) {
  const { t } = useTranslation("business");
  const { activeOrg } = useOrg();
  const url = open
    ? buildOrderPickUrl(window.location.origin, { orderGuids, orgId: activeOrg?.id ?? null })
    : null;
  const qrCodeDataUrl = useQrCodeDataUrl(url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("orders.phonePick.title")}</DialogTitle>
          <DialogDescription>
            {t("orders.phonePick.description", { count: orderGuids.length })}
          </DialogDescription>
        </DialogHeader>
        {qrCodeDataUrl && (
          <figure className="flex flex-col items-center gap-1.5 animate-in fade-in motion-reduce:animate-none">
            <img
              src={qrCodeDataUrl}
              alt={t("orders.phonePick.qrAlt")}
              className="size-52 rounded-lg ring-1 ring-border"
            />
            <figcaption className="text-center text-xs text-foreground/70">
              {t("orders.phonePick.hint")}
            </figcaption>
          </figure>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={!url}
            onClick={() =>
              url &&
              void copyWithToast(url, t("orders.phonePick.copied"), t("orders.phonePick.copyFailed"))
            }
          >
            <IconCopy />
            {t("orders.phonePick.copy")}
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("orders.phonePick.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
