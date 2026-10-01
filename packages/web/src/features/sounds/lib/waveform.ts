import { SOUND_CLIP_WAVEFORM_BARS } from "@magic-vault/shared";

export async function computeWaveform(file: File): Promise<number[] | null> {
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await file.arrayBuffer());
    const channels = Array.from({ length: audio.numberOfChannels }, (_, i) =>
      audio.getChannelData(i),
    );
    const bucketSize = Math.max(
      1,
      Math.floor(audio.length / SOUND_CLIP_WAVEFORM_BARS),
    );
    const peaks = Array.from({ length: SOUND_CLIP_WAVEFORM_BARS }, (_, bar) => {
      const start = bar * bucketSize;
      const end = Math.min(audio.length, start + bucketSize);
      let peak = 0;
      for (const data of channels) {
        for (let i = start; i < end; i++) {
          const value = Math.abs(data[i]);
          if (value > peak) peak = value;
        }
      }
      return peak;
    });
    const loudest = Math.max(...peaks);
    if (loudest === 0) return peaks.map(() => 0);
    return peaks.map((peak) => Math.round((peak / loudest) * 1000) / 1000);
  } catch {
    return null;
  } finally {
    void context.close();
  }
}
