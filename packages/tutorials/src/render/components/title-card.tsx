import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TUTORIAL_COLORS, TUTORIAL_SITE_LABEL } from "../../lib/constants/tutorial-style";
import { tutorialFontFamily } from "../font";
import { BrandMark } from "./brand-mark";

export function TitleCard({
  title,
  subtitle,
  isClosingCard,
}: {
  title: string;
  subtitle: string | null;
  isClosingCard: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isPortrait = height > width;
  const entrance = isClosingCard ? spring({ frame, fps, config: { damping: 200 } }) : 1;
  const fadeFrames = Math.round(fps * 0.35);
  const opacity = isClosingCard
    ? interpolate(frame, [0, fadeFrames], [0, 1], { extrapolateRight: "clamp" })
    : interpolate(frame, [durationInFrames - fadeFrames, durationInFrames], [1, 0], {
        extrapolateLeft: "clamp",
      });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${TUTORIAL_COLORS.primarySoft} 0%, ${TUTORIAL_COLORS.canvas} 60%)`,
        fontFamily: tutorialFontFamily,
        color: TUTORIAL_COLORS.foreground,
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isPortrait ? 40 : 32,
          maxWidth: width * 0.8,
          textAlign: "center",
          transform: `translateY(${interpolate(entrance, [0, 1], [40, 0])}px)`,
          opacity: entrance,
        }}
      >
        <BrandMark width={isPortrait ? 220 : 180} />
        <div style={{ fontSize: isPortrait ? 80 : 84, fontWeight: 700, lineHeight: 1.1 }}>
          {isClosingCard ? TUTORIAL_SITE_LABEL : title}
        </div>
        {(isClosingCard ? title : subtitle) && (
          <div
            style={{
              fontSize: isPortrait ? 44 : 40,
              fontWeight: 500,
              lineHeight: 1.3,
              color: TUTORIAL_COLORS.foregroundSecondary,
            }}
          >
            {isClosingCard ? title : subtitle}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
