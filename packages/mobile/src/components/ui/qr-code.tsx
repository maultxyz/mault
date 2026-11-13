import QRCode from "qrcode";
import { useMemo } from "react";
import Svg, { Path, Rect } from "react-native-svg";
import { QR_CODE_QUIET_ZONE_MODULES } from "@/lib/constants/share-links";
import type { QrCodeProps } from "@/lib/interfaces/ui";

export function QrCode({ value, size, accessibilityLabel }: QrCodeProps) {
  const { modulePath, moduleCount } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    const segments: string[] = [];
    for (let row = 0; row < modules.size; row++) {
      for (let column = 0; column < modules.size; column++) {
        if (modules.get(row, column)) segments.push(`M${column} ${row}h1v1h-1z`);
      }
    }
    return { modulePath: segments.join(""), moduleCount: modules.size };
  }, [value]);
  const viewBoxSize = moduleCount + QR_CODE_QUIET_ZONE_MODULES * 2;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`${-QR_CODE_QUIET_ZONE_MODULES} ${-QR_CODE_QUIET_ZONE_MODULES} ${viewBoxSize} ${viewBoxSize}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Rect
        x={-QR_CODE_QUIET_ZONE_MODULES}
        y={-QR_CODE_QUIET_ZONE_MODULES}
        width={viewBoxSize}
        height={viewBoxSize}
        fill="#ffffff"
      />
      <Path d={modulePath} fill="#000000" />
    </Svg>
  );
}
