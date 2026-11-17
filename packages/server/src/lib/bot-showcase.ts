import { formatPrice, type PlayingCard } from "@magic-vault/shared";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { authProvider } from "../auth";
import { db } from "../db";
import {
  cardPrices,
  collectionCards,
  collections,
  games,
  storageLocations,
} from "../db/schema";
import { collectionCardPriceSql, collectionCardPricesJoinOn } from "./card-price-sql";
import {
  BOT_SHOWCASE_TOP_CARD_COUNT,
  DISCORD_SELECT_MENU_MAX_OPTIONS,
} from "./constants/discord";
import { resolveImageUrl } from "./discord";
import { inventoryCardSql } from "./inventory-sql";
import type {
  BotShowcase,
  BotShowcaseKind,
  BotShowcaseTarget,
} from "./interfaces/bot";
import { loadOrgPricing } from "./price-source";
import { hydrateSavedCards } from "./saved-cards";

function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function listShowcaseRows(
  kind: BotShowcaseKind,
  orgIds: string[],
  nameQuery: string,
): Promise<{ guid: string | null; name: string; orgId: string }[]> {
  const namePattern = `%${escapeLikePattern(nameQuery.trim())}%`;
  if (kind === "collection") {
    return db
      .select({ guid: collections.guid, name: collections.name, orgId: collections.orgId })
      .from(collections)
      .where(
        and(
          inArray(collections.orgId, orgIds),
          eq(collections.isDeleted, false),
          ilike(collections.name, namePattern),
        ),
      )
      .orderBy(asc(collections.name));
  }
  return db
    .select({
      guid: storageLocations.guid,
      name: storageLocations.name,
      orgId: storageLocations.orgId,
    })
    .from(storageLocations)
    .where(
      and(
        inArray(storageLocations.orgId, orgIds),
        eq(storageLocations.isDeleted, false),
        ilike(storageLocations.name, namePattern),
      ),
    )
    .orderBy(asc(storageLocations.name));
}

export async function listUserShowcaseTargets(
  userId: string,
  kind: BotShowcaseKind,
  preferredOrgId: string | null,
  nameQuery: string,
): Promise<BotShowcaseTarget[]> {
  const orgs = await authProvider.listUserOrganisations(userId);
  if (orgs.length === 0) return [];
  const orgNameById = new Map(orgs.map((org) => [org.id, org.name]));
  const rows = await listShowcaseRows(kind, [...orgNameById.keys()], nameQuery);
  return rows
    .filter((row) => row.guid)
    .sort(
      (a, b) => Number(b.orgId === preferredOrgId) - Number(a.orgId === preferredOrgId),
    )
    .slice(0, DISCORD_SELECT_MENU_MAX_OPTIONS)
    .map((row) => ({
      guid: row.guid!,
      name: row.name,
      orgName: orgNameById.get(row.orgId) ?? "",
    }));
}

async function findShowcaseScope(
  kind: BotShowcaseKind,
  guid: string,
  orgIds: string[],
): Promise<{ orgId: string; name: string; cardCondition: SQL } | null> {
  if (kind === "collection") {
    const [collection] = await db
      .select({ id: collections.id, orgId: collections.orgId, name: collections.name })
      .from(collections)
      .where(
        and(
          eq(collections.guid, guid),
          inArray(collections.orgId, orgIds),
          eq(collections.isDeleted, false),
        ),
      )
      .limit(1);
    return collection
      ? {
          orgId: collection.orgId,
          name: collection.name,
          cardCondition: eq(collectionCards.collectionId, collection.id),
        }
      : null;
  }
  const [location] = await db
    .select({
      id: storageLocations.id,
      orgId: storageLocations.orgId,
      name: storageLocations.name,
    })
    .from(storageLocations)
    .where(
      and(
        eq(storageLocations.guid, guid),
        inArray(storageLocations.orgId, orgIds),
        eq(storageLocations.isDeleted, false),
      ),
    )
    .limit(1);
  return location
    ? {
        orgId: location.orgId,
        name: location.name,
        cardCondition: eq(collectionCards.locationId, location.id),
      }
    : null;
}

export async function loadUserShowcase(
  userId: string,
  kind: BotShowcaseKind,
  guid: string,
): Promise<BotShowcase | null> {
  const orgs = await authProvider.listUserOrganisations(userId);
  if (orgs.length === 0) return null;
  const scope = await findShowcaseScope(
    kind,
    guid,
    orgs.map((org) => org.id),
  );
  if (!scope) return null;

  const pricing = await loadOrgPricing(db, scope.orgId);
  const cardPrice = collectionCardPriceSql(pricing);
  const cardsInScope = and(
    scope.cardCondition,
    eq(collections.orgId, scope.orgId),
    eq(collections.isDeleted, false),
    inventoryCardSql(),
  );

  const [totals] = await db
    .select({
      cardCount: count(collectionCards.id),
      totalValue: sql<number | null>`sum(${cardPrice})`,
      gameNames: sql<string[]>`coalesce(array_agg(distinct ${games.name}) filter (where ${games.name} is not null), '{}')`,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId))
    .leftJoin(cardPrices, collectionCardPricesJoinOn())
    .where(cardsInScope);

  const topRows = await db
    .select({
      card: sql<PlayingCard>`${collectionCards.card} - 'raw'`,
      isFoil: collectionCards.isFoil,
      foilType: collectionCards.foilType,
      collectionName: collections.name,
      collectionLang: collections.lang,
      gameKey: games.key,
      price: cardPrice,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId))
    .leftJoin(cardPrices, collectionCardPricesJoinOn())
    .where(and(cardsInScope, isNotNull(cardPrice)))
    .orderBy(desc(cardPrice))
    .limit(BOT_SHOWCASE_TOP_CARD_COUNT);

  const hydratedTopCards = await hydrateSavedCards(
    topRows.map((row) => ({
      gameKey: row.gameKey,
      lang: row.collectionLang,
      card: row.card,
    })),
    { includeRaw: false },
  );

  return {
    kind,
    name: scope.name,
    orgName: orgs.find((org) => org.id === scope.orgId)?.name ?? "",
    gameNames: [...(totals?.gameNames ?? [])].sort(),
    cardCount: Number(totals?.cardCount ?? 0),
    totalValueDisplay: formatPrice(Number(totals?.totalValue ?? 0), pricing.source),
    topCards: topRows.map((row, index) => {
      const card = hydratedTopCards[index];
      return {
        name: card.name,
        setName: card.setName || null,
        foil: row.isFoil ? (row.foilType ?? "Foil") : null,
        collectionName: row.collectionName,
        priceDisplay: formatPrice(Number(row.price), pricing.source),
        imageUrl: card.image?.normal ? resolveImageUrl(card.image.normal) : null,
      };
    }),
  };
}
