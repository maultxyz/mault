import {
  cardSellPrice,
  INTAKE_LOT_STATUSES,
  type IntakeLotStatus,
  PRICE_SOURCE_FIELDS,
  type CardPricing,
  type CardSellRule,
  type OrgPricing,
  type SellPriceConfig,
} from "@magic-vault/shared";
import { and, eq, sql, type SQL } from "drizzle-orm";
import type { db, Transaction } from "../db";
import { collectionCards, intakeLots } from "../db/schema";
import { loadBusinessSettings } from "./business-access";
import { scannedCardPriceSql } from "./card-price-sql";
import { loadOrgPricing } from "./price-source";
import { uuidArraySql } from "./sql-arrays";
import { toBuySourceType } from "./intake";

function pricingCurrency(pricing: OrgPricing): string {
  return PRICE_SOURCE_FIELDS[pricing.source].currency;
}

export async function loadSellPriceConfig(
  runner: Transaction | typeof db,
  orgId: string,
): Promise<SellPriceConfig> {
  return (await loadBusinessSettings(runner, orgId)).sell;
}

export function sellPriceSql(
  marketPrice: SQL,
  config: SellPriceConfig,
  currency: string,
  cardAlias = "cc",
): SQL {
  const column = (name: string) => sql.raw(`${cardAlias}.${name}`);
  return sql`(CASE
    WHEN ${column("sell_price_fixed")} IS NOT NULL AND ${column("sell_price_currency")} = ${currency}
      THEN ${column("sell_price_fixed")}
    ELSE ${marketPrice} * (1 + COALESCE(${column("sell_markup_percent")}, ${config.defaultMarkupPercent}::float8) / 100.0)
  END)`;
}

function toSellRule(row: {
  sellMarkupPercent: number | null;
  sellPriceFixed: number | null;
  sellPriceCurrency: string | null;
}): CardSellRule {
  return {
    markupPercent: row.sellMarkupPercent,
    fixedPrice: row.sellPriceFixed,
    fixedCurrency: row.sellPriceCurrency,
  };
}

export async function loadCardSellPrices(
  tx: Transaction | typeof db,
  orgId: string,
  scanIds: string[],
  pricing?: OrgPricing,
): Promise<Map<string, number | null>> {
  if (scanIds.length === 0) return new Map();
  const orgPricing = pricing ?? (await loadOrgPricing(tx, orgId));
  const config = await loadSellPriceConfig(tx, orgId);
  const currency = pricingCurrency(orgPricing);
  const rows = await tx
    .select({
      scanId: collectionCards.guid,
      marketPrice: scannedCardPriceSql(orgPricing),
      sellMarkupPercent: collectionCards.sellMarkupPercent,
      sellPriceFixed: collectionCards.sellPriceFixed,
      sellPriceCurrency: collectionCards.sellPriceCurrency,
    })
    .from(collectionCards)
    .where(
      and(
        eq(collectionCards.orgId, orgId),
        sql`${collectionCards.guid} = ANY(${uuidArraySql(scanIds)})`,
      ),
    );
  return new Map(
    rows.map((row) => [
      row.scanId!,
      cardSellPrice(
        row.marketPrice == null ? null : Number(row.marketPrice),
        toSellRule(row),
        config,
        currency,
      ),
    ]),
  );
}

export async function loadCardPricing(
  tx: Transaction,
  orgId: string,
  scanId: string,
  canViewCosts: boolean,
): Promise<CardPricing | null> {
  const pricing = await loadOrgPricing(tx, orgId);
  const config = await loadSellPriceConfig(tx, orgId);
  const currency = pricingCurrency(pricing);
  const [row] = await tx
    .select({
      scanId: collectionCards.guid,
      marketPrice: scannedCardPriceSql(pricing),
      sellMarkupPercent: collectionCards.sellMarkupPercent,
      sellPriceFixed: collectionCards.sellPriceFixed,
      sellPriceCurrency: collectionCards.sellPriceCurrency,
      acquisitionCost: collectionCards.acquisitionCost,
      acquisitionCurrency: collectionCards.acquisitionCurrency,
      intakeOffer: collectionCards.intakeOffer,
      intakeOfferCurrency: collectionCards.intakeOfferCurrency,
      intakeLotStatus: intakeLots.status,
      intakeLotSourceType: intakeLots.sourceType,
      intakeLotGuid: intakeLots.guid,
      intakeLotName: intakeLots.customerName,
      intakeLotCreatedAt: intakeLots.createdAt,
      intakeLotAcceptedAt: intakeLots.acceptedAt,
      intakeLotDeleted: intakeLots.isDeleted,
      acquiredAt: collectionCards.acquiredAt,
    })
    .from(collectionCards)
    .leftJoin(intakeLots, eq(intakeLots.id, collectionCards.intakeLotId))
    .where(and(eq(collectionCards.orgId, orgId), eq(collectionCards.guid, scanId)))
    .limit(1);
  if (!row) return null;
  const marketPrice = row.marketPrice == null ? null : Math.round(Number(row.marketPrice) * 100) / 100;
  const sellRule = toSellRule(row);
  const intake =
    row.intakeLotGuid && !row.intakeLotDeleted
      ? {
          guid: row.intakeLotGuid,
          name: row.intakeLotName ?? "",
          sourceType: toBuySourceType(row.intakeLotSourceType),
          status: toIntakeLotStatus(row.intakeLotStatus),
          createdAt: (row.intakeLotCreatedAt ?? new Date()).toISOString(),
          acceptedAt: row.intakeLotAcceptedAt?.toISOString() ?? null,
        }
      : null;
  return {
    scanId,
    intake,
    acquiredAt: canViewCosts ? (row.acquiredAt?.toISOString() ?? null) : null,
    currency,
    marketPrice,
    sellPrice: cardSellPrice(marketPrice, sellRule, config, currency),
    sellRule,
    defaultMarkupPercent: config.defaultMarkupPercent,
    isInOpenIntake: row.intakeLotStatus === "open",
    openBuyUsesOffers: row.intakeLotStatus === "open" && row.intakeLotSourceType !== "opened",
    intakeOffer:
      canViewCosts && row.intakeOfferCurrency === currency ? row.intakeOffer : null,
    cost: canViewCosts && row.acquisitionCurrency === currency ? row.acquisitionCost : null,
  };
}

function toIntakeLotStatus(value: string | null): IntakeLotStatus {
  return INTAKE_LOT_STATUSES.find((status) => status === value) ?? "open";
}
