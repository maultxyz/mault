import { Callout } from "@/components/callout";
import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomShortLinks } from "@/features/admin/api/use-custom-short-links";
import { CustomShortLinkDialog } from "@/features/admin/components/custom-short-link-dialog";
import { copyWithToast } from "@/lib/clipboard";
import { formatShortDate } from "@/lib/format";
import type { CustomShortLink } from "@magic-vault/shared";
import { IconCopy, IconInfoCircle, IconLink, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function CustomShortLinksManager() {
  const { t } = useTranslation("admin");
  const { overview, isLoading, isError, refetch, invalidate, remove } = useCustomShortLinks();
  const [dialogLink, setDialogLink] = useState<CustomShortLink | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogSession, setDialogSession] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<CustomShortLink | null>(null);
  const links = overview?.links ?? [];
  const shortLinkBaseUrl = overview?.shortLinkBaseUrl ?? null;

  function openDialog(link: CustomShortLink | null) {
    setDialogLink(link);
    setDialogSession((session) => session + 1);
    setIsDialogOpen(true);
  }

  return (
    <SettingsSection
      heading={t("shortLinks.heading")}
      description={t("shortLinks.description")}
      action={
        <Button
          type="button"
          variant="outline"
          disabled={!overview?.enabled}
          onClick={() => openDialog(null)}
        >
          <IconPlus />
          {t("shortLinks.create")}
        </Button>
      }
    >
      {isError && (
        <LoadErrorCallout message={t("shortLinks.loadFailed")} onRetry={() => void refetch()} />
      )}

      {isLoading && <Skeleton className="h-14 w-full" />}

      {overview && !overview.enabled && (
        <Callout icon={IconInfoCircle} title={t("shortLinks.disabledTitle")}>
          {t("shortLinks.disabledDescription")}
        </Callout>
      )}

      {overview?.enabled && links.length === 0 && (
        <EmptyState size="compact" icon={IconLink} title={t("shortLinks.empty")} />
      )}

      {links.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {links.map((link) => (
            <li key={link.code} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <IconLink className="size-4 shrink-0 text-foreground/70" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate font-medium">{link.shortUrl}</p>
                <a
                  href={link.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-xs text-foreground/70 underline-offset-2 hover:underline"
                >
                  {link.targetUrl}
                </a>
                <p className="text-2xs text-foreground/70">
                  {t("shortLinks.updatedOn", { date: formatShortDate(link.updatedAt) })}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("shortLinks.copyLink", { url: link.shortUrl })}
                  onClick={() =>
                    void copyWithToast(
                      link.shortUrl,
                      t("shortLinks.copied"),
                      t("shortLinks.copyFailed"),
                    )
                  }
                >
                  <IconCopy />
                </Button>
                <Button type="button" variant="ghost" onClick={() => openDialog(link)}>
                  {t("shortLinks.edit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={remove.isPending && remove.variables === link.code}
                  onClick={() => setDeleteTarget(link)}
                >
                  {t("shortLinks.delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {shortLinkBaseUrl && (
        <CustomShortLinkDialog
          key={dialogSession}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          shortLinkBaseUrl={shortLinkBaseUrl}
          link={dialogLink}
          onSaved={invalidate}
        />
      )}

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("shortLinks.deleteConfirmTitle")}
        description={t("shortLinks.deleteConfirmDescription", {
          url: deleteTarget?.shortUrl ?? "",
        })}
        confirm={{ type: "simple" }}
        confirmLabel={t("shortLinks.delete")}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.code);
          setDeleteTarget(null);
        }}
      />
    </SettingsSection>
  );
}
