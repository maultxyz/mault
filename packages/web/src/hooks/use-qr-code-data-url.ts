import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { QR_CODE_IMAGE_OPTIONS } from "@/lib/constants/share-links";

export function useQrCodeDataUrl(text: string | null | undefined): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!text) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(text, QR_CODE_IMAGE_OPTIONS)
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  return dataUrl;
}
