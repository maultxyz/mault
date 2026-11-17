import type { PresetWorkflow } from "@magic-vault/shared";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { Transaction } from "../db";
import {
  binSets,
  games,
  presetWorkflowSteps,
  presetWorkflows,
} from "../db/schema";
import { activeBinSetWhere } from "../routes/bins/shared";
import { markBinsEmptied } from "./bin-emptying";
import type { PresetWorkflowLookup } from "./interfaces/preset-workflows";

function gameWhere(gameId: number | null) {
  return gameId === null
    ? isNull(presetWorkflows.gameId)
    : eq(presetWorkflows.gameId, gameId);
}

export async function presetWorkflowNameTaken(
  tx: Transaction,
  orgId: string,
  gameId: number | null,
  name: string,
  excludeGuid?: string,
): Promise<boolean> {
  const [existing] = await tx
    .select({ guid: presetWorkflows.guid })
    .from(presetWorkflows)
    .where(
      and(
        eq(presetWorkflows.orgId, orgId),
        eq(presetWorkflows.isDeleted, false),
        gameId === null
          ? isNull(presetWorkflows.gameId)
          : eq(presetWorkflows.gameId, gameId),
        sql`lower(trim(${presetWorkflows.name})) = ${name.trim().toLowerCase()}`,
        ...(excludeGuid ? [ne(presetWorkflows.guid, excludeGuid)] : []),
      ),
    )
    .limit(1);
  return !!existing;
}

export async function deactivatePresetWorkflows(
  tx: Transaction,
  orgId: string,
  gameId: number | null,
): Promise<void> {
  await tx
    .update(presetWorkflows)
    .set({ isActive: false, activeStepGuid: null })
    .where(
      and(
        eq(presetWorkflows.orgId, orgId),
        eq(presetWorkflows.isActive, true),
        gameWhere(gameId),
      ),
    );
}

export async function switchActivePreset(
  tx: Transaction,
  orgId: string,
  target: { id: number; gameId: number | null },
  markPreviousBinsEmptied: boolean,
): Promise<void> {
  const active = await tx.query.binSets.findFirst({
    where: (t) => activeBinSetWhere(t, orgId, target.gameId),
    columns: { id: true },
    with: {
      bins: {
        where: (bin, { eq }) => eq(bin.isDeleted, false),
        columns: { binNumber: true },
      },
    },
  });
  if (active && markPreviousBinsEmptied) {
    await markBinsEmptied(
      tx,
      orgId,
      active.bins.map((bin) => bin.binNumber),
    );
  }
  if (active?.id === target.id) return;
  if (active) {
    await tx
      .update(binSets)
      .set({ isActive: false })
      .where(eq(binSets.id, active.id));
  }
  await tx
    .update(binSets)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(binSets.id, target.id));
}

export async function loadPresetWorkflows(
  tx: Transaction,
  orgId: string,
): Promise<PresetWorkflow[]> {
  const workflows = await tx
    .select({
      id: presetWorkflows.id,
      guid: presetWorkflows.guid,
      name: presetWorkflows.name,
      gameGuid: games.guid,
      isActive: presetWorkflows.isActive,
      activeStepGuid: presetWorkflows.activeStepGuid,
    })
    .from(presetWorkflows)
    .leftJoin(games, eq(games.id, presetWorkflows.gameId))
    .where(
      and(
        eq(presetWorkflows.orgId, orgId),
        eq(presetWorkflows.isDeleted, false),
      ),
    )
    .orderBy(presetWorkflows.name);
  const steps = workflows.length
    ? await tx
        .select({
          workflowId: presetWorkflowSteps.workflowId,
          guid: presetWorkflowSteps.guid,
          position: presetWorkflowSteps.position,
          presetGuid: presetWorkflowSteps.presetGuid,
          isResortMode: presetWorkflowSteps.isResortMode,
        })
        .from(presetWorkflowSteps)
        .where(
          and(
            inArray(
              presetWorkflowSteps.workflowId,
              workflows.map((workflow) => workflow.id),
            ),
            eq(presetWorkflowSteps.isDeleted, false),
          ),
        )
        .orderBy(presetWorkflowSteps.position, presetWorkflowSteps.id)
    : [];
  return workflows.map((workflow) => ({
    guid: workflow.guid!,
    name: workflow.name,
    gameGuid: workflow.gameGuid ?? null,
    isActive: workflow.isActive,
    activeStepGuid: workflow.activeStepGuid,
    steps: steps
      .filter((step) => step.workflowId === workflow.id)
      .map((step) => ({
        guid: step.guid!,
        position: step.position,
        presetGuid: step.presetGuid,
        isResortMode: step.isResortMode,
      })),
  }));
}

export async function findPresetWorkflow(
  tx: Transaction,
  orgId: string,
  workflowGuid: string,
): Promise<PresetWorkflowLookup | null> {
  const [workflow] = await tx
    .select({
      id: presetWorkflows.id,
      guid: presetWorkflows.guid,
      gameId: presetWorkflows.gameId,
      activeStepGuid: presetWorkflows.activeStepGuid,
    })
    .from(presetWorkflows)
    .where(
      and(
        eq(presetWorkflows.guid, workflowGuid),
        eq(presetWorkflows.orgId, orgId),
        eq(presetWorkflows.isDeleted, false),
      ),
    )
    .limit(1);
  if (!workflow) return null;
  const steps = await tx
    .select({
      id: presetWorkflowSteps.id,
      guid: presetWorkflowSteps.guid,
      position: presetWorkflowSteps.position,
      presetGuid: presetWorkflowSteps.presetGuid,
      isResortMode: presetWorkflowSteps.isResortMode,
    })
    .from(presetWorkflowSteps)
    .where(
      and(
        eq(presetWorkflowSteps.workflowId, workflow.id),
        eq(presetWorkflowSteps.isDeleted, false),
      ),
    )
    .orderBy(presetWorkflowSteps.position, presetWorkflowSteps.id);
  return {
    workflow: { ...workflow, guid: workflow.guid! },
    steps: steps.map((step) => ({ ...step, guid: step.guid! })),
  };
}

export async function findLivePreset(
  tx: Transaction,
  orgId: string,
  presetGuid: string,
): Promise<{ id: number; gameId: number | null } | undefined> {
  return tx.query.binSets.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.guid, presetGuid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
    columns: { id: true, gameId: true },
  });
}


export async function activeWorkflowStepResorts(
  tx: Transaction,
  orgId: string,
  gameId: number | null,
  activePresetGuid: string,
): Promise<boolean> {
  const [step] = await tx
    .select({ isResortMode: presetWorkflowSteps.isResortMode })
    .from(presetWorkflows)
    .innerJoin(
      presetWorkflowSteps,
      eq(presetWorkflowSteps.guid, presetWorkflows.activeStepGuid),
    )
    .where(
      and(
        eq(presetWorkflows.orgId, orgId),
        eq(presetWorkflows.isActive, true),
        eq(presetWorkflows.isDeleted, false),
        gameWhere(gameId),
        eq(presetWorkflowSteps.isDeleted, false),
        eq(presetWorkflowSteps.presetGuid, activePresetGuid),
      ),
    )
    .limit(1);
  return !!step?.isResortMode;
}
