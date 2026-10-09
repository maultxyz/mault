import {
  API_KEY_PREFIX,
  API_KEY_SCOPES,
  DEFAULT_API_KEY_SCOPE,
  type ApiKeyScope,
  type OrgApiKey,
} from "@magic-vault/shared";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { db, type Transaction } from "../db";
import { orgApiKeys } from "../db/schema";
import { getUserDisplayName } from "../middleware/auth";
import { isApiAccessAllowed } from "./api-access";
import {
  API_KEY_LAST_USED_THROTTLE_MS,
  API_KEY_RANDOM_BYTES,
  API_KEY_VISIBLE_PREFIX_LENGTH,
  ORG_API_KEY_COLUMNS,
} from "./constants/api-keys";
import type {
  GeneratedApiKey,
  OrgApiKeyRow,
  ResolvedApiKey,
} from "./interfaces/api-keys";

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(): GeneratedApiKey {
  const rawKey = `${API_KEY_PREFIX}${randomBytes(API_KEY_RANDOM_BYTES).toString("base64url")}`;
  return {
    rawKey,
    keyPrefix: rawKey.slice(
      0,
      API_KEY_PREFIX.length + API_KEY_VISIBLE_PREFIX_LENGTH,
    ),
    keyHash: hashApiKey(rawKey),
  };
}

export function toApiKeyScope(value: string): ApiKeyScope {
  return (API_KEY_SCOPES as readonly string[]).includes(value)
    ? (value as ApiKeyScope)
    : DEFAULT_API_KEY_SCOPE;
}

export async function toOrgApiKey(row: OrgApiKeyRow): Promise<OrgApiKey> {
  return {
    guid: row.guid,
    name: row.name,
    keyPrefix: row.keyPrefix,
    scope: toApiKeyScope(row.scope),
    createdBy: await getUserDisplayName(row.createdBy),
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  };
}

export async function loadOrgApiKeys(
  tx: Transaction,
  orgId: string,
): Promise<OrgApiKey[]> {
  const rows = await tx
    .select(ORG_API_KEY_COLUMNS)
    .from(orgApiKeys)
    .where(and(eq(orgApiKeys.orgId, orgId), isNull(orgApiKeys.revokedAt)))
    .orderBy(desc(orgApiKeys.createdAt));
  return Promise.all(rows.map(toOrgApiKey));
}

export async function resolveApiKey(
  keyHash: string,
): Promise<ResolvedApiKey | null> {
  return db.transaction(async (tx) => {
    const [key] = await tx
      .select({
        id: orgApiKeys.id,
        guid: orgApiKeys.guid,
        orgId: orgApiKeys.orgId,
        scope: orgApiKeys.scope,
      })
      .from(orgApiKeys)
      .where(
        and(
          eq(orgApiKeys.keyHash, keyHash),
          isNull(orgApiKeys.revokedAt),
        ),
      )
      .limit(1);
    if (!key) return null;
    const now = new Date();
    await tx
      .update(orgApiKeys)
      .set({ lastUsedAt: now })
      .where(
        and(
          eq(orgApiKeys.id, key.id),
          or(
            isNull(orgApiKeys.lastUsedAt),
            lt(
              orgApiKeys.lastUsedAt,
              new Date(now.getTime() - API_KEY_LAST_USED_THROTTLE_MS),
            ),
          ),
        ),
      );
    return {
      guid: key.guid,
      orgId: key.orgId,
      scope: toApiKeyScope(key.scope),
      apiAccessAllowed: await isApiAccessAllowed(tx, key.orgId),
    };
  });
}
