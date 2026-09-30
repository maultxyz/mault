import type { SoundClip, SoundRule } from "@magic-vault/shared";

export interface SoundRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: SoundRule | null;
  gameGuid: string;
  clips: SoundClip[];
}

export interface SoundRuleListProps {
  gameGuid: string;
}

export interface SoundClipRowProps {
  clip: SoundClip;
}

export interface SoundWaveformProps {
  peaks: number[] | null;
  progress: number;
  className?: string;
}

export interface ClipPreviewState {
  audio: HTMLAudioElement | null;
  frame: number;
}
