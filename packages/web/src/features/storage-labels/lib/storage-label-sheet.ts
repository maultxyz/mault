import QRCode from "qrcode";

export function qrCodeModules(text: string): { path: string; moduleCount: number } {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const segments: string[] = [];
  for (let row = 0; row < modules.size; row++) {
    for (let column = 0; column < modules.size; column++) {
      if (modules.get(row, column)) segments.push(`M${column} ${row}h1v1h-1z`);
    }
  }
  return { path: segments.join(""), moduleCount: modules.size };
}
