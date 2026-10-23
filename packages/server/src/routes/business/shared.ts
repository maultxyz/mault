import {
  PRICE_SOURCE_FIELDS,
  type BusinessAccess,
  type OrgPricing,
} from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import type { Context } from "hono";
import { authQuery, type Transaction } from "../../db";
import { loadBusinessAccess } from "../../lib/business-access";
import { collectionCards } from "../../db/schema";
import {
  BUSINESS_FORBIDDEN_MESSAGE,
  BUSINESS_UPGRADE_MESSAGE,
  COST_UPDATE_CHUNK_SIZE,
} from "../../lib/constants/business";
import type { AcquisitionCostUpdate } from "../../lib/interfaces/business";
import type { AppEnv } from "../../middleware/auth";

export type BusinessResult =
  | { success: true; data: unknown; message?: string }
  | { success: false; message: string; upgradeRequired?: boolean };

export const upgradeRequired: BusinessResult = {
  success: false,
  message: BUSINESS_UPGRADE_MESSAGE,
  upgradeRequired: true,
};

export const forbidden: BusinessResult = {
  success: false,
  message: BUSINESS_FORBIDDEN_MESSAGE,
};

export function notFound(message: string): BusinessResult {
  return { success: false, message };
}

export async function businessQuery(
  c: Context<AppEnv>,
  run: (tx: Transaction, access: BusinessAccess) => Promise<BusinessResult>,
) {
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) =>
      run(tx, await loadBusinessAccess(tx, c.get("orgId"), c.get("orgRole"))),
    );
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
}

export async function readJson<T>(c: Context<AppEnv>): Promise<Partial<T>> {
  return c.req.json<Partial<T>>().catch(() => ({}));
}

export function pricingCurrency(pricing: OrgPricing): string {
  return PRICE_SOURCE_FIELDS[pricing.source].currency;
}

export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, max);
  return text || null;
}

export function toMoney(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value * 100) / 100
    : null;
}

export async function updateAcquisitionCosts(
  tx: Transaction,
  input: AcquisitionCostUpdate,
): Promise<void> {
  for (let i = 0; i < input.rows.length; i += COST_UPDATE_CHUNK_SIZE) {
    const values = sql.join(
      input.rows
        .slice(i, i + COST_UPDATE_CHUNK_SIZE)
        .map((row) => sql`(${row.scanId}::uuid, ${row.cost}::float8)`),
      sql`, `,
    );
    await tx.execute(sql`
      UPDATE ${collectionCards} AS cc
      SET acquisition_cost = v.cost,
        acquisition_currency = ${input.currency},
        acquired_at = ${input.acquiredAt}
      FROM (VALUES ${values}) AS v(guid, cost)
      WHERE cc.guid = v.guid AND cc.org_id = ${input.orgId}
    `);
  }
}
