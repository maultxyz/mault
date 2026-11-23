import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const NUGET_PACKAGE_ID = "microsoft.ml.onnxruntime";
const XCFRAMEWORK_ENTRY = "runtimes/ios/native/onnxruntime.xcframework.zip";
const MIRROR_REPOSITORY = "maultxyz/mault";
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_HEADER_SIGNATURE = 0x04034b50;
const ZIP_STORED = 0;
const ZIP_DEFLATED = 8;

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(mobileRoot, "plugins", "onnxruntime-c-mirror.json");
const version = process.argv[2] ?? JSON.parse(readFileSync(manifestPath, "utf8")).version;
const releaseTag = `onnxruntime-ios-${version}`;
const assetName = `onnxruntime.xcframework-${version}.zip`;
const outputDirectory = join(mobileRoot, "build", "onnxruntime-mirror");

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function publishedPackageHash() {
  const registration = await fetchJson(
    `https://api.nuget.org/v3/registration5-semver1/${NUGET_PACKAGE_ID}/${version}.json`,
  );
  const catalogEntry = await fetchJson(registration.catalogEntry);
  if (catalogEntry.packageHashAlgorithm !== "SHA512") {
    throw new Error(`Unexpected NuGet hash algorithm ${catalogEntry.packageHashAlgorithm}`);
  }
  return { packageUrl: registration.packageContent, packageSha512: catalogEntry.packageHash };
}

function readZipEntry(zip, entryName) {
  const searchStart = Math.max(0, zip.length - 0xffff - 22);
  let endOfCentralDirectory = -1;
  for (let offset = zip.length - 22; offset >= searchStart; offset--) {
    if (zip.readUInt32LE(offset) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      endOfCentralDirectory = offset;
      break;
    }
  }
  if (endOfCentralDirectory < 0) throw new Error("Not a zip file.");
  const entryCount = zip.readUInt16LE(endOfCentralDirectory + 10);
  let offset = zip.readUInt32LE(endOfCentralDirectory + 16);
  for (let index = 0; index < entryCount; index++) {
    if (zip.readUInt32LE(offset) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) throw new Error("Corrupt zip directory.");
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const uncompressedSize = zip.readUInt32LE(offset + 24);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localHeaderOffset = zip.readUInt32LE(offset + 42);
    const name = zip.toString("utf8", offset + 46, offset + 46 + nameLength);
    if (name === entryName) {
      if (zip.readUInt32LE(localHeaderOffset) !== ZIP_LOCAL_HEADER_SIGNATURE) throw new Error("Corrupt zip entry.");
      const dataStart =
        localHeaderOffset + 30 + zip.readUInt16LE(localHeaderOffset + 26) + zip.readUInt16LE(localHeaderOffset + 28);
      const compressed = zip.subarray(dataStart, dataStart + compressedSize);
      const content =
        method === ZIP_STORED
          ? compressed
          : method === ZIP_DEFLATED
            ? inflateRawSync(compressed)
            : (() => {
                throw new Error(`Unsupported zip compression method ${method}.`);
              })();
      if (content.length !== uncompressedSize) throw new Error(`${entryName} has the wrong size.`);
      return content;
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`${entryName} is not in the package.`);
}

const { packageUrl, packageSha512 } = await publishedPackageHash();
console.log(`Downloading ${packageUrl}`);
const nupkg = await fetchBytes(packageUrl);
const downloadedSha512 = createHash("sha512").update(nupkg).digest("base64");
if (downloadedSha512 !== packageSha512) {
  throw new Error(`NuGet package hash mismatch: expected ${packageSha512}, got ${downloadedSha512}.`);
}
console.log("NuGet package matches the hash NuGet publishes.");

const xcframeworkZip = readZipEntry(nupkg, XCFRAMEWORK_ENTRY);
const sha256 = createHash("sha256").update(xcframeworkZip).digest("hex");
mkdirSync(outputDirectory, { recursive: true });
const assetPath = join(outputDirectory, assetName);
writeFileSync(assetPath, xcframeworkZip);

const manifest = {
  version,
  url: `https://github.com/${MIRROR_REPOSITORY}/releases/download/${releaseTag}/${assetName}`,
  sha256,
  nugetPackageSha512: packageSha512,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Wrote ${assetPath} (sha256 ${sha256}).`);
console.log(`Updated ${manifestPath}.`);
console.log("Publish it with:");
console.log(
  `  gh release create ${releaseTag} "${assetPath}" --repo ${MIRROR_REPOSITORY} --latest=false --title "ONNX Runtime ${version} for iOS" --notes "onnxruntime.xcframework.zip from NuGet Microsoft.ML.OnnxRuntime ${version} (package SHA-512 ${packageSha512}), unmodified. Used by the Expo app's onnxruntime-c pod."`,
);
