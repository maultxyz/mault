import type { PinnedModel } from "../interfaces/vision-model.interface";

export const CORNER_DETECTOR_MODEL: PinnedModel = {
  repo: "HanClinto/ccgdetector-fastweb-single",
  revision: "66ffd4976ec57bda0f6ea2d83e15ca6a3add7dd9",
  filename: "fastweb-single-1.39.onnx",
  sha256: "05d2b90b928a5a3bf0f49aa90aa86211b2103d9c347c238fd18b4f544b3cb8ca",
};

export const MILO_MODEL: PinnedModel = {
  repo: "HanClinto/milo",
  revision: "9bcc5e809e936b8c5630d1e7101aae1de1e76621",
  filename: "model.onnx",
  sha256: "bd13d8d60383c69da04dce261f32e93fdaeaa8fd618fbc991e7385f71b3d45df",
};

export const CORNER_DETECTOR_INPUT_SIZE = 384;
export const MILO_INPUT_SIZE = 448;
export const IMAGENET_MEAN = [0.485, 0.456, 0.406];
export const IMAGENET_STD = [0.229, 0.224, 0.225];
