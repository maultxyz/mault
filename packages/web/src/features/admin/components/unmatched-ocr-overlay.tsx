import type { UnmatchedOcrOverlayProps } from "@/lib/interfaces/admin";
import { useTranslation } from "react-i18next";

export function UnmatchedOcrOverlay({ result }: UnmatchedOcrOverlayProps) {
  const { t } = useTranslation("admin");
  if (!result?.supported) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {result.regions.map((region, index) => (
        <div
          key={`${region.field}-${index}`}
          className={
            region.anchored
              ? "absolute rounded-sm border-2 border-success"
              : "absolute rounded-sm border-2 border-dashed border-warning"
          }
          style={{
            left: `${region.box.x0 * 100}%`,
            top: `${region.box.y0 * 100}%`,
            width: `${(region.box.x1 - region.box.x0) * 100}%`,
            height: `${(region.box.y1 - region.box.y0) * 100}%`,
          }}
        >
          <span className="absolute -top-4 left-0 whitespace-nowrap rounded-sm bg-black/70 px-1 text-2xs text-white">
            {t(`unmatchedRetry.ocr.fields.${region.field}`)}
          </span>
        </div>
      ))}
    </div>
  );
}
