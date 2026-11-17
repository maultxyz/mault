import { and, asc, eq, inArray } from "drizzle-orm";
import { authProvider } from "../auth";
import { db } from "../db";
import { binSets, games } from "../db/schema";
import { DISCORD_SELECT_MENU_MAX_OPTIONS } from "./constants/discord";
import { buildPresetBinLines } from "./discord";
import type { BotRulePreset, BotRulePresetDetails } from "./interfaces/bot";

function presetModeLabel(preset: {
  scanOnly: boolean;
  isRepackMode: boolean;
  isAlphabetMode: boolean;
  isChaosMode: boolean;
}): string | null {
  if (preset.scanOnly) return "Scan only";
  if (preset.isRepackMode) return "Repack";
  if (preset.isAlphabetMode) return "Alphabetical";
  if (preset.isChaosMode) return "Chaos";
  return null;
}

export async function listUserRulePresets(
  userId: string,
  preferredOrgId: string | null,
): Promise<BotRulePreset[]> {
  const orgs = await authProvider.listUserOrganisations(userId);
  if (orgs.length === 0) return [];
  const orgNameById = new Map(orgs.map((org) => [org.id, org.name]));

  const rows = await db
    .select({
      guid: binSets.guid,
      name: binSets.name,
      orgId: binSets.orgId,
      isActive: binSets.isActive,
      gameName: games.name,
    })
    .from(binSets)
    .leftJoin(games, eq(games.id, binSets.gameId))
    .where(
      and(
        inArray(binSets.orgId, [...orgNameById.keys()]),
        eq(binSets.isDeleted, false),
      ),
    )
    .orderBy(asc(binSets.name));

  return rows
    .sort(
      (a, b) =>
        Number(b.orgId === preferredOrgId) - Number(a.orgId === preferredOrgId) ||
        Number(b.isActive) - Number(a.isActive),
    )
    .slice(0, DISCORD_SELECT_MENU_MAX_OPTIONS)
    .map((row) => ({
      guid: row.guid!,
      name: row.name,
      orgName: orgNameById.get(row.orgId) ?? "",
      gameName: row.gameName,
      isActive: row.isActive,
    }));
}

export async function loadUserRulePreset(
  userId: string,
  presetGuid: string,
): Promise<BotRulePresetDetails | null> {
  const [preset] = await db
    .select({
      id: binSets.id,
      orgId: binSets.orgId,
      name: binSets.name,
      scanOnly: binSets.scanOnly,
      isRepackMode: binSets.isRepackMode,
      isAlphabetMode: binSets.isAlphabetMode,
      isChaosMode: binSets.isChaosMode,
      gameName: games.name,
    })
    .from(binSets)
    .leftJoin(games, eq(games.id, binSets.gameId))
    .where(and(eq(binSets.guid, presetGuid), eq(binSets.isDeleted, false)))
    .limit(1);
  if (!preset) return null;

  const orgs = await authProvider.listUserOrganisations(userId);
  if (!orgs.some((org) => org.id === preset.orgId)) return null;

  return {
    presetName: preset.name,
    gameName: preset.gameName,
    modeLabel: presetModeLabel(preset),
    binLines: await buildPresetBinLines(preset.id),
  };
}
