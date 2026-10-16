import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

let current: AudioPlayer | null = null;
let modeSet = false;

function ensureAudioMode() {
  if (modeSet) return;
  modeSet = true;
  void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
    modeSet = false;
  });
}

export function isSoundPlaying(): boolean {
  return !!current?.playing;
}

export function isPlayerActive(player: AudioPlayer | null): boolean {
  return !!player && current === player && player.playing;
}

export function stopSound(): void {
  current?.pause();
  current = null;
}

export function playSoundExclusively(player: AudioPlayer): void {
  if (isSoundPlaying()) return;
  ensureAudioMode();
  current = player;
  void player.seekTo(0).then(() => player.play());
}

export function createClipPlayer(url: string): AudioPlayer {
  return createAudioPlayer({ uri: url });
}
