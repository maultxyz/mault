import { AbsoluteFill, Sequence } from "remotion";
import { compositionSectionFrames } from "../../lib/composition-timing";
import { TUTORIAL_COLORS } from "../../lib/constants/tutorial-style";
import type { TutorialCompositionProps } from "../../lib/interfaces/tutorial";
import { RecordingScene } from "./recording-scene";
import { TitleCard } from "./title-card";

export function TutorialVideo({ timeline, framesPublicPath }: TutorialCompositionProps) {
  const { introFrames, recordingFrames, outroFrames } = compositionSectionFrames(timeline);
  return (
    <AbsoluteFill style={{ background: TUTORIAL_COLORS.canvas }}>
      <Sequence durationInFrames={introFrames}>
        <TitleCard title={timeline.title} subtitle={timeline.subtitle} isClosingCard={false} />
      </Sequence>
      <Sequence from={introFrames} durationInFrames={recordingFrames}>
        <RecordingScene timeline={timeline} framesPublicPath={framesPublicPath} />
      </Sequence>
      <Sequence from={introFrames + recordingFrames} durationInFrames={outroFrames}>
        <TitleCard title={timeline.title} subtitle={null} isClosingCard />
      </Sequence>
    </AbsoluteFill>
  );
}
