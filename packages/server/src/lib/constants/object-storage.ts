export const SCAN_IMAGE_BUCKET = process.env.SCAN_IMAGE_BUCKET ?? "";
export const OBJECT_STORAGE_ENABLED =
  !!SCAN_IMAGE_BUCKET &&
  !!process.env.AWS_ENDPOINT_URL_S3 &&
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY;
export const SCAN_IMAGE_URL_EXPIRY_SECONDS = 60 * 60;
export const S3_DELETE_BATCH_SIZE = 1000;
export const SCAN_IMAGE_BACKFILL_BATCH_SIZE = 50;
