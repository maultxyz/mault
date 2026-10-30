import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { FlatbedPlacementEditor } from "@/features/scanner/components/flatbed-placement-editor";
import {
  detectCardPlacement,
  isPlacementLargeEnough,
} from "@/features/scanner/lib/flatbed-placement";
import { FLATBED_DEFAULT_GLASS_WIDTH_MM } from "@/lib/constants/scanner";
import type {
  FlatbedPlacement,
  FlatbedPlacementDialogProps,
  FlatbedPreview,
} from "@/lib/interfaces/scanner";
import { IconLoader2, IconRefresh, IconScan } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

async function previewGlassSize(file: File, scanWidthMm: number | undefined, scanHeightMm: number | undefined) {
  if (scanWidthMm && scanHeightMm) return { glassWidthMm: scanWidthMm, glassHeightMm: scanHeightMm };
  const bitmap = await createImageBitmap(file);
  try {
    const glassWidthMm = scanWidthMm ?? FLATBED_DEFAULT_GLASS_WIDTH_MM;
    return { glassWidthMm, glassHeightMm: (glassWidthMm * bitmap.height) / bitmap.width };
  } finally {
    bitmap.close();
  }
}

export function FlatbedPlacementDialog({
  open,
  onOpenChange,
}: FlatbedPlacementDialogProps) {
  const { t } = useTranslation("scanner");
  const { t: tCards } = useTranslation("cards");
  const { previewFlatbedGlass, flatbedPlacement, saveFlatbedPlacement } =
    useCameraContext();
  const [preview, setPreview] = useState<FlatbedPreview | null>(null);
  const [draftPlacement, setDraftPlacement] = useState<FlatbedPlacement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.imageUrl);
  }, [preview]);

  useEffect(() => {
    if (open) return;
    setPreview(null);
    setDraftPlacement(null);
    setErrorMessage(null);
  }, [open]);

  const scanGlass = async () => {
    setIsScanning(true);
    setErrorMessage(null);
    try {
      const result = await previewFlatbedGlass();
      if (result.type === "error") {
        setErrorMessage(
          tCards(`importScans.documentScan.errors.${result.reason}`),
        );
        return;
      }
      const file = new File([result.imageBytes.slice()], result.fileName, {
        type: result.mimeType,
      });
      const glassSize = await previewGlassSize(file, result.scanWidthMm, result.scanHeightMm);
      setPreview({ file, imageUrl: URL.createObjectURL(file), ...glassSize });
      setDraftPlacement(
        (await detectCardPlacement(file, glassSize.glassWidthMm, glassSize.glassHeightMm)) ??
          flatbedPlacement,
      );
    } catch (error) {
      console.error("[flatbed] preview scan failed:", error);
      setErrorMessage(t("flatbed.calibration.previewFailed"));
    } finally {
      setIsScanning(false);
    }
  };

  const canSave = !!draftPlacement && isPlacementLargeEnough(draftPlacement);

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("flatbed.calibration.title")}
      description={t("flatbed.calibration.description")}
      className="sm:max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("flatbed.calibration.cancel")}
          </Button>
          <Button
            disabled={!canSave}
            onClick={() => {
              if (!draftPlacement) return;
              saveFlatbedPlacement(draftPlacement);
              onOpenChange(false);
            }}
          >
            {t("flatbed.calibration.save")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-control">
        <Callout variant="info">{t("flatbed.calibration.instructions")}</Callout>
        {errorMessage && <Callout variant="error">{errorMessage}</Callout>}
        {preview ? (
          <>
            <FlatbedPlacementEditor
              imageUrl={preview.imageUrl}
              glassWidthMm={preview.glassWidthMm}
              glassHeightMm={preview.glassHeightMm}
              placement={draftPlacement}
              onPlacementChange={setDraftPlacement}
            />
            <div className="flex items-center gap-1.5">
              <p className="min-w-0 flex-1 text-xs text-foreground/70">
                {draftPlacement && !canSave
                  ? t("flatbed.calibration.boxTooSmall")
                  : t("flatbed.calibration.dragHint")}
              </p>
              <Button variant="outline" disabled={isScanning} onClick={() => void scanGlass()}>
                {isScanning ? <IconLoader2 className="animate-spin" /> : <IconRefresh />}
                {t("flatbed.calibration.scanAgain")}
              </Button>
            </div>
          </>
        ) : (
          <Button disabled={isScanning} onClick={() => void scanGlass()}>
            {isScanning ? <IconLoader2 className="animate-spin" /> : <IconScan />}
            {isScanning
              ? t("flatbed.calibration.scanning")
              : t("flatbed.calibration.scanGlass")}
          </Button>
        )}
      </div>
    </DynamicDialog>
  );
}
