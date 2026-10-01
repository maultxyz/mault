import { SoundWaveform } from "@/features/sounds/components/sound-waveform";
import { DEMO_SOUND_RULES } from "@/lib/constants/landing";
import { cn } from "@/lib/utils";
import { IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react";

export function DemoCustomSounds() {
  return (
    <div className="flex w-full flex-col gap-2">
      {DEMO_SOUND_RULES.map((sound) => {
        const playing = sound.progress > 0;
        return (
          <div
            key={sound.clip}
            className="flex flex-col gap-1.5 rounded-lg border border-input bg-background px-2.5 py-2"
          >
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{sound.rule}</span>
              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
                {sound.clip}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  playing
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {playing ? (
                  <IconPlayerStop size={14} />
                ) : (
                  <IconPlayerPlay size={14} />
                )}
              </span>
              <SoundWaveform
                peaks={sound.peaks}
                progress={sound.progress}
                className="h-6"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
