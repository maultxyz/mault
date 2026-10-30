import type { PinnedModel } from "@magic-vault/shared";

const PADDLE_OCR_REPO = "monkt/paddleocr-onnx";
const PADDLE_OCR_REVISION = "7b02d0a30a07ba2b92ad1ff5a8941ae2c633de65";

export const PADDLE_OCR_DETECTION_MODEL: PinnedModel = {
  repo: PADDLE_OCR_REPO,
  revision: PADDLE_OCR_REVISION,
  filename: "detection/v3/det.onnx",
  sha256: "ee40e80071ba3a320d4efda75f3e22047a7d049e9bf7bcaaf9daea23fc21b935",
};
export const PADDLE_OCR_RECOGNITION_MODEL: PinnedModel = {
  repo: PADDLE_OCR_REPO,
  revision: PADDLE_OCR_REVISION,
  filename: "languages/latin/rec.onnx",
  sha256: "614ffc2d6d3902d360fad7f1b0dd455ee45e877069d14c4e51a99dc4ef144409",
};
export const PADDLE_OCR_DICTIONARY: PinnedModel = {
  repo: PADDLE_OCR_REPO,
  revision: PADDLE_OCR_REVISION,
  filename: "languages/latin/dict.txt",
  sha256: "3c0a8a79b612653c25f765271714f71281e4e955962c153e272b7b8c1d2b13ff",
};

export const PADDLE_OCR_DETECTION_MAX_SIDE = 960;
export const PADDLE_OCR_DETECTION_STRIDE = 32;
export const PADDLE_OCR_DETECTION_MEAN = [0.485, 0.456, 0.406];
export const PADDLE_OCR_DETECTION_STD = [0.229, 0.224, 0.225];
export const PADDLE_OCR_PIXEL_THRESHOLD = 0.3;
export const PADDLE_OCR_BOX_THRESHOLD = 0.6;
export const PADDLE_OCR_MIN_BOX_SIDE_PX = 3;
export const PADDLE_OCR_UNCLIP_RATIO = 1.5;
export const PADDLE_OCR_RECOGNITION_HEIGHT = 48;
export const PADDLE_OCR_RECOGNITION_MIN_WIDTH = 16;
export const PADDLE_OCR_RECOGNITION_MAX_WIDTH = 1600;
export const PADDLE_OCR_SAME_LINE_MIN_OVERLAP = 0.5;
export const PADDLE_OCR_SAME_LINE_MAX_GAP_RATIO = 1.5;

export const REGION_MARGIN_X = 0.025;
export const REGION_MARGIN_Y = 0.02;
export const OCR_NAME_MIN_LENGTH = 3;
export const OCR_NAME_MIN_SIMILARITY = 0.45;
export const OCR_NAME_CANDIDATE_LIMIT = 60;
export const OCR_MATCH_MAX_IMAGE_DISTANCE = 0.7;
export const OCR_MAX_NAME_LINES = 8;
export const OCR_SEARCH_MARGIN_X = 0.04;
export const OCR_SEARCH_MARGIN_Y = 0.05;
export const OCR_MIN_LINE_CONFIDENCE = 0.5;
export const OCR_ANCHOR_HEIGHT_WEIGHT = 0.5;
export const OCR_ANCHOR_MIN_LINE_HEIGHT_RATIO = 0.3;
