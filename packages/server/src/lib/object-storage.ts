import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  OBJECT_STORAGE_ENABLED,
  S3_DELETE_BATCH_SIZE,
  SCAN_IMAGE_BUCKET,
  SCAN_IMAGE_URL_EXPIRY_SECONDS,
} from "./constants/object-storage";
import type { ParsedDataUrl } from "./interfaces/object-storage";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION,
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }
  return client;
}

export function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], body: Buffer.from(match[2], "base64") };
}

export function toDataUrl(body: Buffer, contentType: string): string {
  return `data:${contentType};base64,${body.toString("base64")}`;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: SCAN_IMAGE_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export function presignObjectUrl(key: string): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: SCAN_IMAGE_BUCKET, Key: key }),
    { expiresIn: SCAN_IMAGE_URL_EXPIRY_SECONDS },
  );
}

async function deleteKeys(keys: string[]): Promise<void> {
  for (let i = 0; i < keys.length; i += S3_DELETE_BATCH_SIZE) {
    await getClient().send(
      new DeleteObjectsCommand({
        Bucket: SCAN_IMAGE_BUCKET,
        Delete: {
          Objects: keys
            .slice(i, i + S3_DELETE_BATCH_SIZE)
            .map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }
}

export function deleteObjects(keys: (string | null)[]): void {
  const present = keys.filter((key): key is string => !!key);
  if (!OBJECT_STORAGE_ENABLED || present.length === 0) return;
  deleteKeys(present).catch((err) =>
    console.error("[object-storage] delete failed:", err),
  );
}

async function deletePrefix(prefix: string): Promise<void> {
  let continuationToken: string | undefined;
  do {
    const page = await getClient().send(
      new ListObjectsV2Command({
        Bucket: SCAN_IMAGE_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    const keys = (page.Contents ?? [])
      .map((object) => object.Key)
      .filter((key): key is string => !!key);
    if (keys.length > 0) await deleteKeys(keys);
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);
}

export function deleteObjectPrefix(prefix: string): void {
  if (!OBJECT_STORAGE_ENABLED) return;
  deletePrefix(prefix).catch((err) =>
    console.error(`[object-storage] delete of ${prefix} failed:`, err),
  );
}

export function orgObjectPrefix(orgId: string): string {
  return `orgs/${orgId}/`;
}
