import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requireFromServerPackage = createRequire(
  new URL("../../server/package.json", import.meta.url),
);
const sharp = requireFromServerPackage("sharp");

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const instructionsDirectory = path.join(webRoot, "public", "instructions");
const smallDirectoryName = "small";
const smallDirectory = path.join(instructionsDirectory, smallDirectoryName);
const constantsFile = path.join(
  webRoot,
  "src",
  "lib",
  "constants",
  "build-step-images.ts",
);
const SMALL_IMAGE_WIDTH = 448;
const SMALL_IMAGE_QUALITY = 78;

mkdirSync(smallDirectory, { recursive: true });

const photoFileNames = readdirSync(instructionsDirectory)
  .filter((fileName) => /\.jpe?g$/i.test(fileName))
  .sort((left, right) => left.localeCompare(right));

const smallImageBySource = {};
for (const fileName of photoFileNames) {
  const smallFileName = `${path.parse(fileName).name}.webp`;
  const { width, height } = await sharp(path.join(instructionsDirectory, fileName))
    .rotate()
    .resize({ width: SMALL_IMAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: SMALL_IMAGE_QUALITY })
    .toFile(path.join(smallDirectory, smallFileName));
  smallImageBySource[`/instructions/${fileName}`] = {
    src: `/instructions/${smallDirectoryName}/${smallFileName}`,
    width,
    height,
  };
}

writeFileSync(
  constantsFile,
  [
    'import type { BuildStepSmallImage } from "@/lib/interfaces/build";',
    "",
    "export const BUILD_STEP_SMALL_IMAGES: Record<string, BuildStepSmallImage> =",
    `  ${JSON.stringify(smallImageBySource, null, 2).replace(/\n/g, "\n  ")};`,
    "",
  ].join("\n"),
  "utf8",
);
