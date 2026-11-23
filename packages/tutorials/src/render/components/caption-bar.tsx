import { interpolate } from "remotion";
import { CAPTION_FADE_MS } from "../../lib/constants/tutorial";
import {
  DESKTOP_CAPTION_FONT_SIZE,
  MOBILE_CAPTION_FONT_SIZE,
  TUTORIAL_COLORS,
} from "../../lib/constants/tutorial-style";
import type { CaptionCue } from "../../lib/interfaces/tutorial";
import { tutorialFontFamily } from "../font";

export function CaptionBar({
  cues,
  contentMs,
  isMobile,
}: {
  cues: CaptionCue[];
  contentMs: number;
  isMobile: boolean;
}) {
  const cue = cues.find((candidate) => contentMs >= candidate.startMs && contentMs < candidate.endMs);
  if (!cue) return null;
  const opacity = interpolate(
    contentMs,
    [cue.startMs, cue.startMs + CAPTION_FADE_MS, cue.endMs - CAPTION_FADE_MS, cue.endMs],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <div
      style={{
        maxWidth: isMobile ? 960 : 1500,
        padding: isMobile ? "28px 40px" : "22px 40px",
        borderRadius: isMobile ? 32 : 24,
        background: TUTORIAL_COLORS.captionBackground,
        color: TUTORIAL_COLORS.captionText,
        fontFamily: tutorialFontFamily,
        fontSize: isMobile ? MOBILE_CAPTION_FONT_SIZE : DESKTOP_CAPTION_FONT_SIZE,
        fontWeight: 600,
        lineHeight: 1.3,
        textAlign: "center",
        opacity,
      }}
    >
      {cue.text}
    </div>
  );
}
