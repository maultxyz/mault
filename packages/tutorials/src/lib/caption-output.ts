import type { CaptionCue } from "./interfaces/tutorial";

function formatWebVttTimestamp(milliseconds: number): string {
  const totalMilliseconds = Math.max(Math.round(milliseconds), 0);
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const remainder = totalMilliseconds % 1000;
  const pad = (value: number, length = 2) => String(value).padStart(length, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(remainder, 3)}`;
}

export function buildWebVtt(cues: CaptionCue[], offsetMs: number): string {
  const blocks = cues.map(
    (cue, index) =>
      `${index + 1}\n${formatWebVttTimestamp(cue.startMs + offsetMs)} --> ${formatWebVttTimestamp(cue.endMs + offsetMs)}\n${cue.text}`,
  );
  return `WEBVTT\n\n${blocks.join("\n\n")}\n`;
}

export function buildTranscript(title: string, subtitle: string | null, cues: CaptionCue[]): string {
  const heading = subtitle ? `${title}\n${subtitle}` : title;
  const steps = cues.map((cue, index) => `${index + 1}. ${cue.text}`);
  return `${heading}\n\n${steps.join("\n")}\n`;
}
