import type { CapturedImageThumbProps } from "@/lib/interfaces/cards";

export function CapturedImageThumb({ src, alt }: CapturedImageThumbProps) {
  return <img src={src} alt={alt} className="h-full w-full object-fill" />;
}
