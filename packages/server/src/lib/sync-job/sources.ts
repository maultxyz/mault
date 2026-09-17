import { fabSyncSource } from "../adapters/fab/sync";
import { gundamSyncSource } from "../adapters/gundam/sync";
import { lorcanaSyncSource } from "../adapters/lorcana/sync";
import { onePieceSyncSource } from "../adapters/onepiece/sync";
import { pokemonSyncSource } from "../adapters/pokemon/sync";
import { riftboundSyncSource } from "../adapters/riftbound/sync";
import { scryfallSyncSource } from "../adapters/scryfall/sync";
import { yugiohSyncSource } from "../adapters/yugioh/sync";
import type { SyncSource } from "../card-search/sync-types";

export const SYNC_SOURCES: Record<string, SyncSource> = {
  mtg: scryfallSyncSource,
  gundam: gundamSyncSource,
  pokemon: pokemonSyncSource,
  lorcana: lorcanaSyncSource,
  onepiece: onePieceSyncSource,
  fab: fabSyncSource,
  yugioh: yugiohSyncSource,
  riftbound: riftboundSyncSource,
};
