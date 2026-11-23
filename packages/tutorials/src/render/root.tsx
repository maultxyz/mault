import { Composition } from "remotion";
import { compositionSectionFrames } from "../lib/composition-timing";
import { TUTORIAL_COMPOSITION_ID, TUTORIAL_FRAMES_PER_SECOND } from "../lib/constants/tutorial";
import { PLACEHOLDER_TUTORIAL_PROPS } from "../lib/constants/tutorial-render";
import type { TutorialCompositionProps } from "../lib/interfaces/tutorial";
import { TutorialVideo } from "./components/tutorial-video";

export function TutorialRoot() {
  return (
    <Composition
      id={TUTORIAL_COMPOSITION_ID}
      component={TutorialVideo}
      fps={TUTORIAL_FRAMES_PER_SECOND}
      width={1920}
      height={1080}
      durationInFrames={1}
      defaultProps={PLACEHOLDER_TUTORIAL_PROPS}
      calculateMetadata={({ props }: { props: TutorialCompositionProps }) => ({
        durationInFrames: compositionSectionFrames(props.timeline).totalFrames,
        width: props.timeline.viewport.compositionWidth,
        height: props.timeline.viewport.compositionHeight,
      })}
    />
  );
}
