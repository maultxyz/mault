import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  allExportAdapters,
  downloadStorageLocationCsv,
  supportsGame,
  type ExportAdapter,
} from "@/features/cards/lib/export";
import { storageLocationExportSummaryQueryOptions } from "@/features/storage/api/storage-locations";
import { useMarkStorageCardsDownloaded } from "@/features/storage/api/use-mark-storage-cards-downloaded";
import type { StorageExportMenuProps } from "@/lib/interfaces/storage";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_PILL_BUTTON_SM_CLASS } from "@/lib/constants/nav";
import { IconChevronDown, IconDownload, IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function StorageExportMenu({ location }: StorageExportMenuProps) {
  const { t } = useTranslation("storage");
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const [combineDuplicates, setCombineDuplicates] = useState(true);
  const { data: summary } = useQuery(
    storageLocationExportSummaryQueryOptions(location.guid, open),
  );
  const markCardsDownloaded = useMarkStorageCardsDownloaded(location.guid);
  const [exporting, setExporting] = useState(false);

  const adapters = useMemo(
    () =>
      allExportAdapters.filter((adapter) =>
        (summary?.gameKeys ?? []).every((key) => supportsGame(adapter, key ?? undefined)),
      ),
    [summary?.gameKeys],
  );

  const handleExport = async (adapter: ExportAdapter) => {
    if (!summary) return;
    setExporting(true);
    try {
      await downloadStorageLocationCsv(location.guid, adapter, location.name, {
        combineDuplicates,
      });
      markCardsDownloaded(summary.scanIds);
    } catch (err) {
      console.error("Failed to export storage location:", err);
      toast.error(t("export.failed"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            disabled={exporting}
            variant={isMobile ? "secondary" : "outline"}
            className={isMobile ? MOBILE_PILL_BUTTON_SM_CLASS : undefined}
          />
        }
      >
        {exporting ? (
          <IconLoader2 className="animate-spin motion-reduce:animate-none" />
        ) : (
          <IconDownload />
        )}
        {exporting ? t("export.exporting") : t("export.button")}
        <IconChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuCheckboxItem
          checked={combineDuplicates}
          onCheckedChange={setCombineDuplicates}
        >
          {t("export.combineDuplicates")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {summary ? (
          adapters.map((adapter) => (
            <DropdownMenuItem
              key={adapter.key}
              onClick={() => handleExport(adapter)}
            >
              {adapter.label}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>{t("export.loading")}</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
