import {
  PRICE_SOURCE_FIELDS,
  type CardAcquisitionCost,
  type CardScanOrigin,
  type CardStorageLocation,
  type CollectionCardDetails,
  type CollectionCardScanImageUrls,
  type MatchedScanDiagnostics,
  type OrgRole,
} from "@magic-vault/shared";
import { and, eq, sql } from "drizzle-orm";
import type { Transaction } from "../db";
import {
  collectionCards,
  collections,
  devices,
  intakeLots,
  storageLocations,
  unmatchedCards,
} from "../db/schema";
import { getUserDisplayName } from "../middleware/auth";
import { canViewCardCosts } from "./business-access";
import type { CardScanOriginRow } from "./interfaces/collection-card-details";
import { loadOrgPricing } from "./price-source";
import { resolveBackScanImageUrl, resolveScanImageUrl } from "./scan-images";

export async function loadCardDiagnosticsAndImages(
  tx: Transaction,
  orgId: string,
  scanId: string,
): Promise<{ diagnostics: MatchedScanDiagnostics | null; images: CollectionCardScanImageUrls } | null> {
  const existing = await tx.query.collectionCards.findFirst({
    where: (t, { eq: equals, and: both }) => both(equals(t.guid, scanId), equals(t.orgId, orgId)),
    columns: {
      diagnostics: true,
      capturedImageDataUrl: true,
      capturedImageKey: true,
      capturedBackImageDataUrl: true,
      capturedBackImageKey: true,
    },
  });
  if (!existing) return null;
  return {
    diagnostics: (existing.diagnostics as MatchedScanDiagnostics | null) ?? null,
    images: {
      capturedImageUrl: await resolveScanImageUrl(existing),
      capturedBackImageUrl: await resolveBackScanImageUrl(existing),
    },
  };
}

export async function loadCardStorageLocation(
  tx: Transaction,
  orgId: string,
  scanId: string,
): Promise<CardStorageLocation | null> {
  const [row] = await tx
    .select({
      guid: storageLocations.guid,
      name: storageLocations.name,
      position: collectionCards.locationPosition,
      batchSize: storageLocations.batchSize,
    })
    .from(collectionCards)
    .innerJoin(
      storageLocations,
      and(
        eq(storageLocations.id, collectionCards.locationId),
        eq(storageLocations.isDeleted, false),
      ),
    )
    .where(and(eq(collectionCards.guid, scanId), eq(collectionCards.orgId, orgId)))
    .limit(1);
  return row
    ? {
        guid: row.guid!,
        name: row.name,
        position: row.position ?? 0,
        batchSize: row.batchSize,
      }
    : null;
}

export async function loadCardScanOriginRow(
  tx: Transaction,
  orgId: string,
  scanId: string,
): Promise<CardScanOriginRow | null> {
  const deviceColumns = {
    deviceGuid: devices.guid,
    deviceName: devices.name,
    deviceIsDeleted: devices.isDeleted,
  };
  const [matched] = await tx
    .select({
      userId: collectionCards.scannedByUserId,
      scannedAt: collectionCards.scannedAt,
      ...deviceColumns,
    })
    .from(collectionCards)
    .leftJoin(devices, eq(devices.id, collectionCards.scannedByDeviceId))
    .where(and(eq(collectionCards.guid, scanId), eq(collectionCards.orgId, orgId)))
    .limit(1);
  if (matched) return matched;
  const [unmatched] = await tx
    .select({
      userId: unmatchedCards.scannedByUserId,
      scannedAt: unmatchedCards.scannedAt,
      ...deviceColumns,
    })
    .from(unmatchedCards)
    .leftJoin(devices, eq(devices.id, unmatchedCards.scannedByDeviceId))
    .where(and(eq(unmatchedCards.guid, scanId), eq(unmatchedCards.orgId, orgId)))
    .limit(1);
  return unmatched ?? null;
}

export async function toCardScanOrigin(
  row: CardScanOriginRow | null,
): Promise<CardScanOrigin | null> {
  if (!row) return null;
  return {
    scannedBy: row.userId
      ? { userId: row.userId, name: await getUserDisplayName(row.userId) }
      : null,
    device:
      row.deviceGuid && row.deviceName
        ? {
            guid: row.deviceGuid,
            name: row.deviceName,
            isDeleted: row.deviceIsDeleted ?? false,
          }
        : null,
    scannedAt: row.scannedAt.toISOString(),
  };
}

async function loadVisibleCardAcquisitionCost(
  tx: Transaction,
  orgId: string,
  orgRole: OrgRole,
  scanId: string,
): Promise<CardAcquisitionCost | null> {
  if (!(await canViewCardCosts(tx, orgId, orgRole))) return null;
  const [card] = await tx
    .select({
      cost: sql<number | null>`CASE WHEN ${intakeLots.status} = 'open' THEN ${collectionCards.intakeOffer} ELSE ${collectionCards.acquisitionCost} END`,
      currency: sql<string | null>`CASE WHEN ${intakeLots.status} = 'open' THEN ${collectionCards.intakeOfferCurrency} ELSE ${collectionCards.acquisitionCurrency} END`,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(intakeLots, eq(intakeLots.id, collectionCards.intakeLotId))
    .where(
      and(
        eq(collectionCards.guid, scanId),
        eq(collectionCards.orgId, orgId),
        eq(collections.isDeleted, false),
      ),
    )
    .limit(1);
  if (!card) return null;
  const currency =
    card.cost !== null && card.currency
      ? card.currency
      : PRICE_SOURCE_FIELDS[(await loadOrgPricing(tx, orgId)).source].currency;
  return { cost: card.cost, currency };
}

export async function loadCollectionCardDetails(
  tx: Transaction,
  orgId: string,
  orgRole: OrgRole,
  scanId: string,
): Promise<{ details: Omit<CollectionCardDetails, "origin">; originRow: CardScanOriginRow | null } | null> {
  const diagnosticsAndImages = await loadCardDiagnosticsAndImages(tx, orgId, scanId);
  if (!diagnosticsAndImages) return null;
  return {
    details: {
      ...diagnosticsAndImages,
      location: await loadCardStorageLocation(tx, orgId, scanId),
      cost: await loadVisibleCardAcquisitionCost(tx, orgId, orgRole, scanId),
    },
    originRow: await loadCardScanOriginRow(tx, orgId, scanId),
  };
}
