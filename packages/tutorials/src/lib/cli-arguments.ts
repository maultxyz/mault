import { TUTORIAL_VIEWPORTS } from "./constants/tutorial";
import type { TutorialRunOptions, TutorialViewportName } from "./interfaces/tutorial";

export function parseTutorialRunOptions(argumentsList: string[]): TutorialRunOptions {
  const tutorialName = argumentsList.find((argument) => !argument.startsWith("--"));
  if (!tutorialName) throw new Error("Usage: <tutorial-name> [--viewport desktop,mobile]");
  const optionIndex = argumentsList.indexOf("--viewport");
  if (optionIndex === -1) return { tutorialName, viewportNames: null };
  const optionValue = argumentsList[optionIndex + 1];
  if (!optionValue || optionValue.startsWith("--")) throw new Error("--viewport needs a value.");
  const viewportNames = optionValue.split(",").map((entry) => entry.trim()).filter(Boolean);
  for (const viewportName of viewportNames) {
    if (!(viewportName in TUTORIAL_VIEWPORTS)) {
      throw new Error(`Unknown viewport "${viewportName}". Use ${Object.keys(TUTORIAL_VIEWPORTS).join(", ")}.`);
    }
  }
  return { tutorialName, viewportNames: viewportNames as TutorialViewportName[] };
}
