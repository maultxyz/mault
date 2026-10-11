import type { BinRuleGroup } from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Transaction } from "../db";
import { games } from "../db/schema";

const conditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: z.string(),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const ruleGroupSchema: z.ZodType<BinRuleGroup> = z.lazy(() =>
  z.object({
    id: z.string(),
    combinator: z.enum(["and", "or"]),
    conditions: z.array(z.union([ruleGroupSchema, conditionSchema])),
  }),
) as z.ZodType<BinRuleGroup>;

export async function findGameId(
  tx: Transaction,
  gameGuid: string,
): Promise<number | null> {
  const game = await tx.query.games.findFirst({
    where: and(eq(games.guid, gameGuid), eq(games.isDeleted, false)),
    columns: { id: true },
  });
  return game?.id ?? null;
}
