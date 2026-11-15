import { LabelSheet } from "@/components/label-sheet";
import { qrCodeModules } from "@/features/storage-labels/lib/storage-label-sheet";
import {
  STORAGE_LABEL_DETAIL_FONT_RATIO,
  STORAGE_LABEL_NAME_LINE_HEIGHT,
  STORAGE_LABEL_NAME_MAX_FONT_SIZE,
  STORAGE_LABEL_NAME_MAX_LINES,
  STORAGE_LABEL_QR_QUIET_ZONE_MODULES,
  STORAGE_LABEL_TEXT_GAP,
} from "@/lib/constants/storage-labels";
import type {
  StorageLabelProps,
  StorageLabelSheetProps,
} from "@/lib/interfaces/storage-labels";
import { fittedLabelFontSize } from "@/lib/label-sheet";
import { buildStorageLabelUrl } from "@magic-vault/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

function StorageLabel({ template, location, orgId }: StorageLabelProps) {
  const { t } = useTranslation("storage");
  const qrCode = useMemo(
    () =>
      qrCodeModules(
        buildStorageLabelUrl(window.location.origin, {
          locationGuid: location.guid,
          orgId,
        }),
      ),
    [location.guid, orgId],
  );
  const padding = template.contentPadding;
  const qrSize = Math.min(template.labelHeight - padding * 2, template.labelWidth / 2);
  const qrModuleSpan = qrCode.moduleCount + STORAGE_LABEL_QR_QUIET_ZONE_MODULES * 2;
  const textLeft = padding + qrSize + STORAGE_LABEL_TEXT_GAP;
  const textWidth = template.labelWidth - textLeft - padding;
  const nameFontSize = fittedLabelFontSize(
    location.name,
    textWidth,
    Math.min(STORAGE_LABEL_NAME_MAX_FONT_SIZE, qrSize / 3),
    STORAGE_LABEL_NAME_MAX_LINES,
  );
  return (
    <>
      <g
        transform={`translate(${padding} ${(template.labelHeight - qrSize) / 2}) scale(${qrSize / qrModuleSpan}) translate(${STORAGE_LABEL_QR_QUIET_ZONE_MODULES} ${STORAGE_LABEL_QR_QUIET_ZONE_MODULES})`}
      >
        <rect
          x={-STORAGE_LABEL_QR_QUIET_ZONE_MODULES}
          y={-STORAGE_LABEL_QR_QUIET_ZONE_MODULES}
          width={qrModuleSpan}
          height={qrModuleSpan}
          fill="#ffffff"
        />
        <path d={qrCode.path} fill="#000000" />
      </g>
      <foreignObject x={textLeft} y={padding} width={textWidth} height={template.labelHeight - padding * 2}>
        <div className="flex h-full flex-col justify-center text-black">
          <div
            className="line-clamp-2 font-heading font-semibold break-words"
            style={{
              fontSize: `${nameFontSize}px`,
              lineHeight: STORAGE_LABEL_NAME_LINE_HEIGHT,
            }}
          >
            {location.name}
          </div>
          <div
            className="tabular-nums"
            style={{
              fontSize: `${nameFontSize * STORAGE_LABEL_DETAIL_FONT_RATIO}px`,
              lineHeight: STORAGE_LABEL_NAME_LINE_HEIGHT,
            }}
          >
            {t("page.cardCount", { count: location.cardCount })}
          </div>
        </div>
      </foreignObject>
    </>
  );
}

export function StorageLabelSheet({
  template,
  locations,
  orgId,
  startPosition,
}: StorageLabelSheetProps) {
  const { t } = useTranslation("storage");
  return (
    <LabelSheet
      template={template}
      itemCount={locations.length}
      startPosition={startPosition}
      itemKey={(itemIndex) => locations[itemIndex].guid}
      renderLabel={(itemIndex) => (
        <StorageLabel template={template} location={locations[itemIndex]} orgId={orgId} />
      )}
      describePage={(itemIndexes, pageNumber) =>
        t("labels.sheet.pageDescription", {
          page: pageNumber,
          names: itemIndexes.map((itemIndex) => locations[itemIndex].name).join(", "),
        })
      }
    />
  );
}
