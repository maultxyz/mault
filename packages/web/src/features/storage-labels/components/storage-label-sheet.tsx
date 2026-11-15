import {
  layoutStorageLabelPages,
  qrCodeModules,
  storageLabelNameFontSize,
} from "@/features/storage-labels/lib/storage-label-sheet";
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
import { buildStorageLabelUrl } from "@magic-vault/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

function StorageLabel({ template, location, orgId, placement }: StorageLabelProps) {
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
  const nameFontSize = storageLabelNameFontSize(
    location.name,
    textWidth,
    Math.min(STORAGE_LABEL_NAME_MAX_FONT_SIZE, qrSize / 3),
    STORAGE_LABEL_NAME_MAX_LINES,
  );
  return (
    <g transform={`translate(${placement.x} ${placement.y})`}>
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
    </g>
  );
}

export function StorageLabelSheet({
  template,
  locations,
  orgId,
  startPosition,
}: StorageLabelSheetProps) {
  const { t } = useTranslation("storage");
  const pages = layoutStorageLabelPages(template, locations.length, startPosition);
  const slots = Array.from({ length: template.columns * template.rows }, (_, slot) => ({
    slot,
    x: template.marginLeft + (slot % template.columns) * template.horizontalPitch,
    y: template.marginTop + Math.floor(slot / template.columns) * template.verticalPitch,
  }));
  return (
    <div className="flex flex-col gap-6 md:gap-2 print:block">
      {pages.map((page) => (
        <svg
          key={page.pageNumber}
          role="img"
          aria-label={t("labels.sheet.pageDescription", {
            page: page.pageNumber,
            names: page.placements
              .map((placement) => locations[placement.itemIndex].name)
              .join(", "),
          })}
          viewBox={`0 0 ${template.pageWidth} ${template.pageHeight}`}
          className="mx-auto block w-full max-w-[215.9mm] bg-white ring-1 ring-border print:h-[279.4mm] print:w-[215.9mm] print:max-w-none print:break-after-page print:ring-0 print:last:break-after-auto"
        >
          <g className="print:hidden">
            {slots.map((slot) => (
              <rect
                key={slot.slot}
                x={slot.x}
                y={slot.y}
                width={template.labelWidth}
                height={template.labelHeight}
                rx={1.5}
                fill="none"
                stroke="#a1a1aa"
                strokeWidth={0.25}
                strokeDasharray="1 1"
              />
            ))}
          </g>
          {page.placements.map((placement) => (
            <StorageLabel
              key={locations[placement.itemIndex].guid}
              template={template}
              location={locations[placement.itemIndex]}
              orgId={orgId}
              placement={placement}
            />
          ))}
        </svg>
      ))}
    </div>
  );
}
