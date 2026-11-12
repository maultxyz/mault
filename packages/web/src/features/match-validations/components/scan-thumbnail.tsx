import { matchValidationThumbnailQueryOptions } from "@/features/match-validations/api/match-validations";
import type { ScanThumbnailProps } from "@/lib/interfaces/match-validations";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function ScanThumbnail({ scanId, alt }: ScanThumbnailProps) {
  const { data: thumbnail } = useQuery(matchValidationThumbnailQueryOptions(scanId));
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!thumbnail) return;
    const url = URL.createObjectURL(thumbnail);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnail]);

  if (!objectUrl) return null;
  return <img src={objectUrl} alt={alt} className="h-full w-full object-fill" />;
}
