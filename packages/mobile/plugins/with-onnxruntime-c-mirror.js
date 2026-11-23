const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");
const mirror = require("./onnxruntime-c-mirror.json");

const PODSPEC_FILE_NAME = "onnxruntime-c.podspec.json";
const POD_LINE = `pod 'onnxruntime-c', :podspec => File.join(__dir__, '${PODSPEC_FILE_NAME}')`;
const FRAMEWORK_HEADERS = "onnxruntime.xcframework/ios-arm64/onnxruntime.framework/Headers";

function mirroredPodspec() {
  if (!mirror.url || !mirror.sha256) {
    throw new Error(
      "plugins/onnxruntime-c-mirror.json has no url or sha256. Run scripts/mirror-onnxruntime-ios.mjs and publish the asset first.",
    );
  }
  return {
    name: "onnxruntime-c",
    version: mirror.version,
    authors: { "ONNX Runtime": "onnxruntime@microsoft.com" },
    license: { type: "MIT" },
    homepage: "https://onnxruntime.ai",
    summary: "ONNX Runtime C/C++ Pod",
    description: `ONNX Runtime ${mirror.version} for iOS, from the Microsoft.ML.OnnxRuntime NuGet package (SHA-512 ${mirror.nugetPackageSha512}).`,
    source: { http: mirror.url, sha256: mirror.sha256 },
    prepare_command: `mkdir -p Headers && cp ${FRAMEWORK_HEADERS}/*.h Headers/`,
    platforms: { ios: "15.1" },
    vendored_frameworks: "onnxruntime.xcframework",
    static_framework: true,
    weak_frameworks: ["CoreML"],
    frameworks: ["CoreFoundation", "Foundation", "Network", "Security", "SystemConfiguration", "UIKit"],
    source_files: "Headers/*.h",
    libraries: "c++",
    pod_target_xcconfig: {
      OTHER_CPLUSPLUSFLAGS: "-fvisibility=hidden -fvisibility-inlines-hidden",
    },
  };
}

function addMirroredPod(podfile) {
  if (podfile.includes(POD_LINE)) return podfile;
  const useExpoModules = /^(\s*)use_expo_modules!.*$/m;
  if (!useExpoModules.test(podfile)) {
    throw new Error("Couldn't find use_expo_modules! in the Podfile to add the onnxruntime-c mirror.");
  }
  return podfile.replace(useExpoModules, (line, indent) => `${line}\n${indent}${POD_LINE}`);
}

module.exports = function withOnnxruntimeCMirror(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const iosRoot = modConfig.modRequest.platformProjectRoot;
      fs.writeFileSync(
        path.join(iosRoot, PODSPEC_FILE_NAME),
        `${JSON.stringify(mirroredPodspec(), null, 2)}\n`,
      );
      const podfilePath = path.join(iosRoot, "Podfile");
      fs.writeFileSync(podfilePath, addMirroredPod(fs.readFileSync(podfilePath, "utf8")));
      return modConfig;
    },
  ]);
};
