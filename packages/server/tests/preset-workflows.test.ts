import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeWorkflowForGame,
  activeWorkflowStep,
  firstWorkflowStep,
  nextWorkflowStep,
  orderedWorkflowSteps,
  previousWorkflowStep,
  workflowStepLabel,
  workflowStepNumber,
  type PresetWorkflow,
} from "@magic-vault/shared";

const step = (guid: string, position: number, presetGuid: string) => ({
  guid,
  position,
  presetGuid,
  isResortMode: position > 0,
});

const workflow: PresetWorkflow = {
  guid: "master",
  name: "Master set",
  gameGuid: "pokemon",
  isActive: true,
  activeStepGuid: "groups",
  steps: [step("sets", 2, "sets-preset"), step("eras", 0, "eras-preset"), step("groups", 1, "groups-preset")],
};
const steps = Object.fromEntries(workflow.steps.map((candidate) => [candidate.guid, candidate]));

test("stages run in position order", () => {
  assert.deepEqual(
    orderedWorkflowSteps(workflow).map((candidate) => candidate.guid),
    ["eras", "groups", "sets"],
  );
  assert.equal(firstWorkflowStep(workflow)?.guid, "eras");
  assert.equal(workflowStepNumber(workflow, steps.sets), 3);
});

test("next and previous follow the order and stop at the ends", () => {
  assert.equal(nextWorkflowStep(workflow, steps.eras)?.guid, "groups");
  assert.equal(nextWorkflowStep(workflow, steps.sets), null);
  assert.equal(previousWorkflowStep(workflow, steps.groups)?.guid, "eras");
  assert.equal(previousWorkflowStep(workflow, steps.eras), null);
});

test("the active stage belongs to the active workflow for the game", () => {
  assert.equal(activeWorkflowForGame([workflow], "pokemon")?.guid, "master");
  assert.equal(activeWorkflowForGame([workflow], "mtg"), null);
  assert.equal(activeWorkflowStep(workflow)?.guid, "groups");
  assert.equal(activeWorkflowStep({ ...workflow, isActive: false }), null);
});

test("the stage label names the workflow and the stage's preset", () => {
  assert.equal(
    workflowStepLabel(workflow, steps.groups, (guid) => guid.replace("-preset", "")),
    "Master set › groups",
  );
});
