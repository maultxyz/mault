import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { TUTORIALS_SOURCE_DIRECTORY } from "./constants/tutorial-paths";
import type { TutorialCaptionFile, TutorialDefinition } from "./interfaces/tutorial";

export function defineTutorial(definition: TutorialDefinition): TutorialDefinition {
  return definition;
}

export function listTutorialNames(): string[] {
  return readdirSync(TUTORIALS_SOURCE_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function tutorialDirectory(tutorialName: string): string {
  const directory = path.join(TUTORIALS_SOURCE_DIRECTORY, tutorialName);
  if (!existsSync(path.join(directory, "tutorial.ts"))) {
    throw new Error(
      `Tutorial "${tutorialName}" not found. Known tutorials: ${listTutorialNames().join(", ") || "none"}.`,
    );
  }
  return directory;
}

export async function loadTutorialDefinition(tutorialName: string): Promise<TutorialDefinition> {
  const modulePath = path.join(tutorialDirectory(tutorialName), "tutorial.ts");
  const loaded = (await import(pathToFileURL(modulePath).href)) as { default?: TutorialDefinition };
  if (!loaded.default) throw new Error(`${modulePath} must default-export defineTutorial(...).`);
  return loaded.default;
}

export function loadCaptionFile(tutorialName: string): TutorialCaptionFile {
  const filePath = path.join(tutorialDirectory(tutorialName), "captions.json");
  return JSON.parse(readFileSync(filePath, "utf8")) as TutorialCaptionFile;
}

export function findCaptionProblems(tutorialName: string): string[] {
  const captions = loadCaptionFile(tutorialName);
  const problems: string[] = [];
  if (!captions.title?.trim()) problems.push("captions.json needs a title");
  const allText = [captions.title, captions.subtitle ?? "", ...Object.values(captions.steps ?? {})].join(" ");
  if (allText.includes("—")) problems.push("captions.json contains an em dash");
  return problems;
}
