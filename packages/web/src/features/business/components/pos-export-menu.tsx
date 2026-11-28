import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadPosExportCsv } from "@/features/business/api/business";
import { downloadBlob } from "@/lib/download";
import type { PosExportMenuProps } from "@/lib/interfaces/price-labels";
import { toast } from "@/lib/toast";
import {
  groupPosExportItems,
  POS_EXPORT_FILENAMES,
  POS_EXPORT_FORMATS,
  type PosExportFormat,
} from "@magic-vault/shared";
import { IconFileExport, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function PosExportMenu({ disabled, request, items }: PosExportMenuProps) {
  const { t } = useTranslation("business");
  const [exportingFormat, setExportingFormat] = useState<PosExportFormat | null>(null);

  const exportCsv = async (format: PosExportFormat) => {
    setExportingFormat(format);
    try {
      downloadBlob(await downloadPosExportCsv({ ...request, format }), POS_EXPORT_FILENAMES[format]);
      const grouped = groupPosExportItems(
        items.map(({ card, labelPrice }) => ({ sku: card.sku, price: labelPrice })),
      );
      const mixedPriceCount = grouped.filter((item) => item.hasMixedPrices).length;
      toast.success(t("priceLabels.posExport.exported", { count: grouped.length }), {
        description:
          mixedPriceCount > 0
            ? t("priceLabels.posExport.mixedPrices", { count: mixedPriceCount })
            : undefined,
      });
    } catch (error) {
      console.error("Couldn't export POS CSV", error);
      toast.error(t("priceLabels.posExport.failed"));
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" disabled={disabled || exportingFormat !== null}>
            {exportingFormat ? (
              <IconLoader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <IconFileExport />
            )}
            {t("priceLabels.posExport.trigger")}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {POS_EXPORT_FORMATS.map((format) => (
          <DropdownMenuItem key={format} onClick={() => void exportCsv(format)}>
            {t(`priceLabels.posExport.formats.${format}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
