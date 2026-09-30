let currentAudio: HTMLAudioElement | null = null;

export function isSoundPlaying(): boolean {
  return !!currentAudio && !currentAudio.paused && !currentAudio.ended;
}

export function playSoundExclusively(audio: HTMLAudioElement): void {
  if (isSoundPlaying()) return;
  currentAudio = audio;
  audio.currentTime = 0;
  audio.play().catch(() => {
    if (currentAudio === audio) currentAudio = null;
  });
}
