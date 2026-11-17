import {
  encodeScannerControlCode,
  type ScannerControlCommand,
  type ScannerControlCommandAction,
} from "@magic-vault/shared";
import {
  CONTROL_CARD_ARTWORKS,
  CONTROL_CARD_BLANK_FRAME_PATHS,
  CONTROL_CARD_FRAMES_BY_ACTION,
} from "@/lib/constants/control-cards";
import type {
  ControlCardIllustratedFace,
  ScannerTFunction,
} from "@/lib/interfaces/control-cards";

export function pickControlCardIllustration(
  command: ScannerControlCommand,
  actions: ScannerControlCommandAction[],
  label: string,
  t: ScannerTFunction,
): ControlCardIllustratedFace {
  const encodedCommand = encodeScannerControlCode(command);
  const matchingArtwork = CONTROL_CARD_ARTWORKS.find(
    (artwork) => encodeScannerControlCode(artwork.command) === encodedCommand,
  );
  if (matchingArtwork) {
    return { kind: "artwork", imagePath: matchingArtwork.imagePath };
  }
  const [leadAction] = actions;
  if (!leadAction) {
    throw new Error("A control card needs at least one action");
  }
  const frame = CONTROL_CARD_FRAMES_BY_ACTION[leadAction.key];
  return {
    kind: "frame",
    imagePath: CONTROL_CARD_BLANK_FRAME_PATHS[frame.color],
    text: {
      name:
        label ||
        t(`controlCards.illustrated.names.${leadAction.key}`, leadAction.values),
      typeLine: t(`controlCards.illustrated.typeLines.${frame.typeLine}`),
      rulesParagraphs: actions.map((action) =>
        t(`controlCards.illustrated.rules.${action.key}`, action.values),
      ),
    },
  };
}
