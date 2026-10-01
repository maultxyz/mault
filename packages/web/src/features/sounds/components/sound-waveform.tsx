import {
  WAVEFORM_BAR_GAP,
  WAVEFORM_BAR_WIDTH,
  WAVEFORM_MIN_BAR_HEIGHT,
  WAVEFORM_VIEWBOX_HEIGHT,
} from "@/lib/constants/sounds";
import type { SoundWaveformProps } from "@/lib/interfaces/sounds";
import { cn } from "@/lib/utils";
import { SOUND_CLIP_WAVEFORM_BARS } from "@magic-vault/shared";

export function SoundWaveform({
  peaks,
  progress,
  className,
}: SoundWaveformProps) {
  const bars =
    peaks ?? Array.from({ length: SOUND_CLIP_WAVEFORM_BARS }, () => 0);
  const step = WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP;
  const width = bars.length * step - WAVEFORM_BAR_GAP;

  return (
    <svg
      viewBox={`0 0 ${width} ${WAVEFORM_VIEWBOX_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn("h-8 w-full", className)}
    >
      {bars.map((peak, index) => {
        const height =
          Math.max(WAVEFORM_MIN_BAR_HEIGHT, peak) * WAVEFORM_VIEWBOX_HEIGHT;
        const played = (index + 0.5) / bars.length <= progress;
        return (
          <rect
            key={index}
            x={index * step}
            y={(WAVEFORM_VIEWBOX_HEIGHT - height) / 2}
            width={WAVEFORM_BAR_WIDTH}
            height={height}
            rx={WAVEFORM_BAR_WIDTH / 2}
            className={cn(
              "transition-[fill] duration-100",
              played ? "fill-primary" : "fill-foreground/25",
              !peaks && "fill-foreground/15",
            )}
          />
        );
      })}
    </svg>
  );
}
