import type { Result, SoundClip, SoundRule } from "@magic-vault/shared";
import type { QueryKey } from "@tanstack/react-query";

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
  clipsQueryKey: QueryKey;
  renameClip?: (guid: string, name: string) => Promise<Result<SoundClip>>;
  deleteClip?: (guid: string) => Promise<Result<null>>;
}

export interface SoundClipUploadOptions {
  uploadClip: (
    file: File,
    name: string,
    waveform: number[] | null,
  ) => Promise<Result<SoundClip>>;
  clipsQueryKey: QueryKey;
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
