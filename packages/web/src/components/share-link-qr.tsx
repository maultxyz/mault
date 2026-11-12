import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useQrCodeDataUrl } from "@/hooks/use-qr-code-data-url";
import { copyWithToast } from "@/lib/clipboard";
import type { ShareLinkQrProps } from "@/lib/interfaces/share-links";
import { IconCopy } from "@tabler/icons-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function ShareLinkQr({ url, expiresAt }: ShareLinkQrProps) {
  const { t, i18n } = useTranslation("common");
  const linkInputId = useId();
  const qrCodeDataUrl = useQrCodeDataUrl(url);

  const handleCopy = () =>
    copyWithToast(url, t("shareLink.copied"), t("shareLink.copyFailed"));

  return (
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
        <FieldLabel htmlFor={linkInputId}>{t("shareLink.linkLabel")}</FieldLabel>
        <div className="flex gap-1.5">
          <Input
            id={linkInputId}
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void handleCopy()}
            aria-label={t("shareLink.copy")}
          >
            <IconCopy />
          </Button>
        </div>
        <p className="text-xs text-foreground/70">
          {t("shareLink.expiresAt", {
            date: new Date(expiresAt).toLocaleString(i18n.language, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
        </p>
      </Field>
    </>
  );
}
