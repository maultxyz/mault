import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import type { db, Transaction } from "../db";
import { orgSettings } from "../db/schema";
import { OBJECT_STORAGE_ENABLED } from "./constants/object-storage";
import {
  SHOP_PHOTO_CONTENT_TYPE,
  SHOP_PHOTO_JPEG_QUALITY,
  SHOP_PHOTO_MAX_SIDE,
} from "./constants/shop-catalogs";
import type { StoredShopPhotoRow } from "./interfaces/shop-catalogs";
import {
  orgObjectPrefix,
  presignObjectUrl,
  putObject,
  toDataUrl,
} from "./object-storage";

export function normalizeShopPhoto(upload: Buffer): Promise<Buffer> {
  return sharp(upload)
    .rotate()
    .resize({
      width: SHOP_PHOTO_MAX_SIDE,
      height: SHOP_PHOTO_MAX_SIDE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: SHOP_PHOTO_JPEG_QUALITY })
    .toBuffer();
}

export async function storeShopPhoto(
  orgId: string,
  photo: Buffer,
): Promise<StoredShopPhotoRow> {
  if (!OBJECT_STORAGE_ENABLED) {
    return {
      shopPhotoKey: null,
      shopPhotoDataUrl: toDataUrl(photo, SHOP_PHOTO_CONTENT_TYPE),
    };
  }
  const key = `${orgObjectPrefix(orgId)}shop/photo-${randomUUID()}.jpg`;
  await putObject(key, photo, SHOP_PHOTO_CONTENT_TYPE);
  return { shopPhotoKey: key, shopPhotoDataUrl: null };
}

export async function resolveShopPhotoUrl(
  row: StoredShopPhotoRow | undefined,
): Promise<string | null> {
  if (row?.shopPhotoKey && OBJECT_STORAGE_ENABLED) {
    return presignObjectUrl(row.shopPhotoKey);
  }
  return row?.shopPhotoDataUrl ?? null;
}

export async function loadShopPhotoRow(
  runner: Transaction | typeof db,
  orgId: string,
): Promise<StoredShopPhotoRow | undefined> {
  const [row] = await runner
    .select({
      shopPhotoKey: orgSettings.shopPhotoKey,
      shopPhotoDataUrl: orgSettings.shopPhotoDataUrl,
    })
    .from(orgSettings)
    .where(eq(orgSettings.orgId, orgId))
    .limit(1);
  return row;
}
