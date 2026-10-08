import { fabSyncSource } from "../adapters/fab/sync";
import { grandArchiveSyncSource } from "../adapters/grand-archive/sync";
import { gundamSyncSource } from "../adapters/gundam/sync";
import { lorcanaSyncSource } from "../adapters/lorcana/sync";
import { onePieceSyncSource } from "../adapters/onepiece/sync";
import { pokemonSyncSource } from "../adapters/pokemon/sync";
import { riftboundSyncSource } from "../adapters/riftbound/sync";
import { scryfallSyncSource } from "../adapters/scryfall/sync";
import { swuSyncSource } from "../adapters/swu/sync";
import { yugiohSyncSource } from "../adapters/yugioh/sync";
import type { SyncSource } from "../interfaces/card-search";

export const SYNC_SOURCES: Record<string, SyncSource> = {
  mtg: scryfallSyncSource,
  gundam: gundamSyncSource,
  pokemon: pokemonSyncSource,
  lorcana: lorcanaSyncSource,
  onepiece: onePieceSyncSource,
  fab: fabSyncSource,
  yugioh: yugiohSyncSource,
  riftbound: riftboundSyncSource,
  swu: swuSyncSource,
  grandarchive: grandArchiveSyncSource,
};
