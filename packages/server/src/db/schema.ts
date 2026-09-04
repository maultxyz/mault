import { sql } from "drizzle-orm";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon/rls";
import {
  boolean,
  customType,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(768)"; // 768 dimensions — SigLIP ViT-Base-Patch16-224 embeddings
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

const orgRls = (orgId: any) =>
  sql`(${orgId} = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member(${orgId})`;

// ─── Global card vectors (no org scope) ──────────────────────────────────────

export const cardImageVectors = pgTable(
  "cards",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    cardId: text("card_id").notNull(),
    gameKey: text("game_key").notNull().default("mtg"),
    lang: text("lang").notNull().default("en"),
    name: text("name").notNull(),
    setCode: text("set_code").notNull(),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("cards_game_lang_card_idx").on(
      table.gameKey,
      table.lang,
      table.cardId,
    ),
    // No table-wide HNSW index here on purpose: every real query filters by
    // game_key first, and one global ANN index makes that filter lossy (see
    // ensureGameVectorIndex in lib/game-vector-index.ts). Per-game_key
    // partial HNSW indexes are created dynamically instead, since game keys
    // are admin-defined data (Games Manager), not something this static
    // schema can enumerate.
    crudPolicy({
      role: authenticatedRole,
      read: true,
      modify: false,
    }),
  ],
).enableRLS();

export const games = pgTable(
  "games",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    fieldDefinitions: jsonb("field_definitions").notNull(),
    apiDocsUrl: text("api_docs_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("games_key_idx").on(table.key),
    unique("games_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: true,
      modify: false,
    }),
  ],
).enableRLS();

export const binSets = pgTable(
  "bin_sets",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    gameId: integer("game_id").references(() => games.id),
    orgId: text("org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("bin_sets_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const bins = pgTable(
  "bins",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    rules: jsonb("rules").notNull(),
    isCatchAll: boolean("is_catch_all").notNull().default(false),
    binNumber: integer("bin_number").notNull(),
    binSet: integer("bin_set")
      .notNull()
      .references(() => binSets.id),
    orgId: text("org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("bins_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const binRoutes = pgTable(
  "bin_routes",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    binNumber: integer("bin_number").notNull(),
    module: integer("module").notNull(),
    direction: text("direction").notNull(),
    orgId: text("org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("bin_routes_org_bin_idx").on(table.orgId, table.binNumber),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const moduleConfigs = pgTable(
  "module_configs",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    moduleNumber: integer("module_number").notNull(),
    orgId: text("org_id").notNull(),
    bottomClosed: integer("bottom_closed").notNull().default(102),
    bottomOpen: integer("bottom_open").notNull().default(307),
    paddleClosed: integer("paddle_closed").notNull().default(150),
    paddleOpen: integer("paddle_open").notNull().default(307),
    pusherLeft: integer("pusher_left").notNull().default(150),
    pusherNeutral: integer("pusher_neutral").notNull().default(307),
    pusherRight: integer("pusher_right").notNull().default(460),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("module_configs_org_module_idx").on(table.orgId, table.moduleNumber),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const feederConfigs = pgTable(
  "feeder_configs",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    orgId: text("org_id").notNull(),
    speed: integer("speed").notNull().default(400),
    duration: integer("duration").notNull().default(3000),
    pulseDuration: integer("pulse_duration").notNull().default(80),
    pauseDuration: integer("pause_duration").notNull().default(50),
    settleDuration: integer("settle_duration").notNull().default(150),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("feeder_configs_org_idx").on(table.orgId),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const collections = pgTable(
  "collections",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    gameId: integer("game_id").references(() => games.id),
    lang: text("lang").notNull().default("en"),
    orgId: text("org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("collections_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const collectionCards = pgTable(
  "collection_cards",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    cardId: text("card_id").notNull(),
    card: jsonb("card").notNull(),
    scannedAt: timestamp("scanned_at").notNull(),
    binNumber: integer("bin_number"),
    capturedImageDataUrl: text("captured_image_data_url"),
    isFoil: boolean("is_foil").notNull().default(false),
    isDownloaded: boolean("is_downloaded").notNull().default(false),
    alternativeMatches: jsonb("alternative_matches"),
    orgId: text("org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("collection_cards_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const orgSettings = pgTable(
  "org_settings",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    orgId: text("org_id").notNull(),
    primaryColor: text("primary_color"),
    scannerLayout: text("scanner_layout"),
    discordNotifyOnScan: boolean("discord_notify_on_scan")
      .notNull()
      .default(false),
    scanCoverage: integer("scan_coverage"),
    scanOffsetX: integer("scan_offset_x"),
    scanOffsetY: integer("scan_offset_y"),
    captureSettleDelayMs: integer("capture_settle_delay_ms"),
    moduleCount: integer("module_count").notNull().default(3),
    channelLayout: text("channel_layout"),
    discordGuildId: text("discord_guild_id"),
    discordLinkCode: text("discord_link_code"),
    discordLinkCodeExpiresAt: timestamp("discord_link_code_expires_at"),
    discordScanChannelId: text("discord_scan_channel_id"),
    discordScanThreadId: text("discord_scan_thread_id"),
    discordErrorChannelId: text("discord_error_channel_id"),
    discordErrorThreadId: text("discord_error_thread_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("org_settings_org_idx").on(table.orgId),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const orgBilling = pgTable(
  "org_billing",
  {
    id: serial().primaryKey(),
    orgId: text("org_id").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripePriceId: text("stripe_price_id"),
    plan: text("plan").notNull().default("free"),
    status: text("status"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("org_billing_org_idx").on(table.orgId),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

// ─── Audit tables (org-scoped, no FK — audit records are permanent) ───────────

export const binSetAudit = pgTable(
  "bin_set_audit",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    binSetGuid: text("bin_set_guid").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    orgId: text("org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("bin_set_audit_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const binRouteAudit = pgTable(
  "bin_route_audit",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    binNumber: integer("bin_number").notNull(),
    module: integer("module").notNull(),
    direction: text("direction").notNull(),
    orgId: text("org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("bin_route_audit_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const moduleConfigAudit = pgTable(
  "module_config_audit",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    moduleNumber: integer("module_number").notNull(),
    orgId: text("org_id").notNull(),
    bottomClosed: integer("bottom_closed").notNull(),
    bottomOpen: integer("bottom_open").notNull(),
    paddleClosed: integer("paddle_closed").notNull(),
    paddleOpen: integer("paddle_open").notNull(),
    pusherLeft: integer("pusher_left").notNull(),
    pusherNeutral: integer("pusher_neutral").notNull(),
    pusherRight: integer("pusher_right").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("module_config_audit_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const feederConfigAudit = pgTable(
  "feeder_config_audit",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    orgId: text("org_id").notNull(),
    speed: integer("speed").notNull(),
    duration: integer("duration").notNull(),
    pulseDuration: integer("pulse_duration").notNull(),
    pauseDuration: integer("pause_duration").notNull(),
    settleDuration: integer("settle_duration").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("feeder_config_audit_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const impersonationAudit = pgTable(
  "impersonation_audit",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    adminUserId: text("admin_user_id").notNull(),
    adminEmail: text("admin_email"),
    targetUserId: text("target_user_id").notNull(),
    targetEmail: text("target_email"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
  },
  (table) => [
    unique("impersonation_audit_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: false,
      modify: false,
    }),
  ],
).enableRLS();

// ─── Local auth only (AUTH_PROVIDER=local) ───────────────────────────────────
// own-auth's own tables (own_auth_*, see auth/local.ts) have no concept of a
// global per-user platform role - that's an app-level concern in Neon mode
// too (neon_auth.user.role), so local mode gets its own small table for it
// rather than teaching own-auth about it. Not RLS-protected: only ever
// read/written by the server via `db`, never by end users directly.
export const platformUserRoles = pgTable("platform_user_roles", {
  userId: text("user_id").primaryKey(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const binSetRelations = relations(binSets, ({ many, one }) => ({
  bins: many(bins),
  game: one(games, {
    fields: [binSets.gameId],
    references: [games.id],
  }),
}));

export const binRelations = relations(bins, ({ one }) => ({
  binSet: one(binSets, {
    fields: [bins.binSet],
    references: [binSets.id],
  }),
}));

export const collectionRelations = relations(collections, ({ many }) => ({
  cards: many(collectionCards),
}));

export const collectionCardsRelations = relations(
  collectionCards,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionCards.collectionId],
      references: [collections.id],
    }),
  }),
);
