import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDownloadScanImage } from "@/features/cards/api/use-download-scan-image";
import type { DownloadScanImageButtonProps } from "@/lib/interfaces/cards";
import { IconDownload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DownloadScanImageButton({ loadImage, fileName }: DownloadScanImageButtonProps) {
  const { t } = useTranslation("cards");
  const { downloadScanImage, isDownloading } = useDownloadScanImage();
  const label = t("downloadScanImage.action");

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            aria-busy={isDownloading}
            disabled={isDownloading}
            onClick={() => void downloadScanImage({ loadImage, fileName })}
          >
            <IconDownload />
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
