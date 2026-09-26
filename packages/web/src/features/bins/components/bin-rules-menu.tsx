import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import {
  buildBinRulesExport,
  downloadBinRulesExport,
  parseBinRulesExport,
  serializeBinRulesExport,
  uniqueImportedName,
} from "@/features/bins/lib/bin-rules-export";
import {
  IconChevronDown,
  IconClipboard,
  IconDownload,
  IconFileSettings,
  IconLoader2,
  IconUpload,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function BinRulesMenu({ className }: { className?: string }) {
  const { t } = useTranslation("bins");
  const {
    selectedSet,
    configs,
    sets,
    gameKey,
    hasGame,
    importSet,
    isPresetMutating,
  } = useBinConfigs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const currentExport = () =>
    selectedSet
      ? buildBinRulesExport(selectedSet.name, gameKey, configs)
      : null;

  const handleCopy = async () => {
    const data = currentExport();
    if (!data) return;
    try {
      await navigator.clipboard.writeText(serializeBinRulesExport(data));
      toast.success(t("binRulesMenu.toasts.copied"));
    } catch {
      toast.error(t("binRulesMenu.toasts.copyFailed"));
    }
  };

  const handleExport = () => {
    const data = currentExport();
    if (data) downloadBinRulesExport(data);
  };

  const importText = async (text: string) => {
    let parsed;
    try {
      parsed = parseBinRulesExport(text);
    } catch {
      toast.error(t("binRulesMenu.toasts.invalid"));
      return;
    }
    if (parsed.gameKey && gameKey && parsed.gameKey !== gameKey) {
      toast.error(t("binRulesMenu.toasts.wrongGame"));
      return;
    }

    const binCount = configs.length;
    const bins = parsed.bins.filter((b) => b.binNumber <= binCount);
    const skipped = parsed.bins.length - bins.length;
    const name = uniqueImportedName(
      parsed.name,
      sets,
      t("binRulesMenu.importedSuffix"),
    );

    setIsImporting(true);
    try {
      if (!(await importSet(name, bins))) {
        toast.error(t("binRulesMenu.toasts.importFailed"));
        return;
      }
      toast.success(t("binRulesMenu.toasts.imported", { name }), {
        description:
          skipped > 0
            ? t("binRulesMenu.toasts.binsSkipped", { count: skipped })
            : undefined,
      });
    } catch {
      // useBinConfigs already toasts a failed create.
    } finally {
      setIsImporting(false);
    }
  };

  const busy = isImporting || isPresetMutating;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className={className}
              disabled={!hasGame}
            />
          }
        >
          {isImporting ? (
            <IconLoader2 className="animate-spin" />
          ) : (
            <IconFileSettings />
          )}
          {isImporting
            ? t("binRulesMenu.importing")
            : t("binRulesMenu.label")}
          <IconChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={!selectedSet} onClick={handleCopy}>
            <IconClipboard />
            {t("binRulesMenu.copy")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!selectedSet} onClick={handleExport}>
            <IconDownload />
            {t("binRulesMenu.export")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <IconUpload />
            {t("binRulesMenu.import")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void file.text().then(importText);
        }}
      />
    </>
  );
}
