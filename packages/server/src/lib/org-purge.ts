import { eq, sql } from "drizzle-orm";
import { db, type Transaction } from "../db";
import { deleteShortLinks } from "./shortener-client";
import {
  accuracyChecks,
  binHeightAudit,
  binHeights,
  binRouteAudit,
  binRoutes,
  binSetAudit,
  binSets,
  cardReservations,
  bins,
  cardSales,
  collectionCardStatsDirty,
  collectionCards,
  collections,
  orgCardStats,
  deviceAlerts,
  devices,
  feederConfigAudit,
  feederConfigs,
  fulfilmentOrders,
  shopCatalogs,
  orgProfiles,
  tradeOffers,
  shareLinks,
  intakeLots,
  moduleConfigAudit,
  moduleConfigs,
  apiKeyUsageDaily,
  orgApiKeys,
  orgActivityLog,
  orgBilling,
  orgInventorySnapshots,
  collectionValueSnapshots,
  orgSettings,
  selfHostedDailyScanStats,
  statsSyncConnections,
  statsSyncKeys,
  unmatchedCards,
  notificationRules,
  soundClips,
  soundRules,
  storageLocations,
  webhookEndpoints,
} from "../db/schema";
import { forgetDiscordGuildOrgs } from "./discord/guild-orgs";
import { forgetLeaderboardOptIns } from "./leaderboard";
const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "canceled",
  "incomplete_expired",
]);

export class ActiveSubscriptionError extends Error {
  constructor() {
    super(
      "Cancel this organization's subscription in Billing before deleting it.",
    );
  }
}

async function assertNoActiveSubscription(
  tx: Transaction,
  orgId: string,
): Promise<void> {
  const [billing] = await tx
    .select({
      subscriptionId: orgBilling.stripeSubscriptionId,
      status: orgBilling.status,
      cancelAtPeriodEnd: orgBilling.cancelAtPeriodEnd,
    })
    .from(orgBilling)
    .where(eq(orgBilling.orgId, orgId))
    .limit(1);
  if (
    billing?.subscriptionId &&
    !billing.cancelAtPeriodEnd &&
    !INACTIVE_SUBSCRIPTION_STATUSES.has(billing.status ?? "")
  ) {
    throw new ActiveSubscriptionError();
  }
}

export async function purgeOrgData(
  tx: Transaction,
  orgId: string,
): Promise<void> {
  await assertNoActiveSubscription(tx, orgId);

  await tx.delete(collectionCards).where(eq(collectionCards.orgId, orgId));
  await tx.delete(accuracyChecks).where(eq(accuracyChecks.orgId, orgId));
  await tx.delete(intakeLots).where(eq(intakeLots.orgId, orgId));
  await tx.delete(cardSales).where(eq(cardSales.orgId, orgId));
  await tx.delete(fulfilmentOrders).where(eq(fulfilmentOrders.orgId, orgId));
  await tx.delete(tradeOffers).where(eq(tradeOffers.orgId, orgId));
  await tx.delete(cardReservations).where(eq(cardReservations.orgId, orgId));
  const purgedShareLinks = await tx
    .delete(shareLinks)
    .where(eq(shareLinks.orgId, orgId))
    .returning({ shortCode: shareLinks.shortCode });
  const purgedCatalogs = await tx
    .delete(shopCatalogs)
    .where(eq(shopCatalogs.orgId, orgId))
    .returning({ shortCode: shopCatalogs.shortCode });
  const purgedStorageLabels = await tx
    .delete(storageLocations)
    .where(eq(storageLocations.orgId, orgId))
    .returning({ shortCode: storageLocations.labelShortCode });
  const purgedProfiles = await tx
    .delete(orgProfiles)
    .where(eq(orgProfiles.orgId, orgId))
    .returning({ handle: orgProfiles.handle, isPublished: orgProfiles.isPublished });
  await deleteShortLinks([
    ...[...purgedShareLinks, ...purgedCatalogs, ...purgedStorageLabels].map(
      (row) => row.shortCode,
    ),
    ...purgedProfiles.filter((row) => row.isPublished).map((row) => row.handle),
  ]);
  await tx.delete(orgActivityLog).where(eq(orgActivityLog.orgId, orgId));
  await tx.delete(apiKeyUsageDaily).where(eq(apiKeyUsageDaily.orgId, orgId));
  await tx.delete(orgApiKeys).where(eq(orgApiKeys.orgId, orgId));
  await tx.delete(statsSyncKeys).where(eq(statsSyncKeys.orgId, orgId));
  await tx.delete(webhookEndpoints).where(eq(webhookEndpoints.orgId, orgId));
  await tx.delete(unmatchedCards).where(eq(unmatchedCards.orgId, orgId));
  await tx.delete(soundRules).where(eq(soundRules.orgId, orgId));
  await tx
    .delete(notificationRules)
    .where(eq(notificationRules.orgId, orgId));
  await tx.delete(soundClips).where(eq(soundClips.orgId, orgId));
  await tx.execute(sql`
    DELETE FROM ${collectionCardStatsDirty}
    WHERE ${collectionCardStatsDirty.collectionId} IN (
      SELECT ${collections.id} FROM ${collections} WHERE ${collections.orgId} = ${orgId}
    )
  `);
  await tx.delete(collections).where(eq(collections.orgId, orgId));
  await tx.delete(orgCardStats).where(eq(orgCardStats.orgId, orgId));

  await tx.delete(bins).where(eq(bins.orgId, orgId));
  await tx.delete(binSets).where(eq(binSets.orgId, orgId));

  await tx.delete(binRoutes).where(eq(binRoutes.orgId, orgId));
  await tx.delete(binHeights).where(eq(binHeights.orgId, orgId));
  await tx.delete(moduleConfigs).where(eq(moduleConfigs.orgId, orgId));
  await tx.delete(feederConfigs).where(eq(feederConfigs.orgId, orgId));
  await tx.delete(devices).where(eq(devices.orgId, orgId));

  await tx.delete(binSetAudit).where(eq(binSetAudit.orgId, orgId));
  await tx.delete(binRouteAudit).where(eq(binRouteAudit.orgId, orgId));
  await tx.delete(binHeightAudit).where(eq(binHeightAudit.orgId, orgId));
  await tx.delete(moduleConfigAudit).where(eq(moduleConfigAudit.orgId, orgId));
  await tx.delete(feederConfigAudit).where(eq(feederConfigAudit.orgId, orgId));

  await tx.delete(orgSettings).where(eq(orgSettings.orgId, orgId));
}

export async function purgeOrgServerData(orgId: string): Promise<void> {
  await db.delete(orgBilling).where(eq(orgBilling.orgId, orgId));
  await db.delete(deviceAlerts).where(eq(deviceAlerts.orgId, orgId));
  await db
    .delete(orgInventorySnapshots)
    .where(eq(orgInventorySnapshots.orgId, orgId));
  await db
    .delete(collectionValueSnapshots)
    .where(eq(collectionValueSnapshots.orgId, orgId));
  await db
    .delete(selfHostedDailyScanStats)
    .where(eq(selfHostedDailyScanStats.orgId, orgId));
  await db
    .delete(statsSyncConnections)
    .where(eq(statsSyncConnections.orgId, orgId));
  forgetDiscordGuildOrgs();
  forgetLeaderboardOptIns();
}
