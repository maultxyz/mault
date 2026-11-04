import { useActivePresetWorkflow } from "@/features/bins/api/use-active-preset-workflow";
import { presetWorkflowPath } from "@/lib/constants/bins";
import { Navigate } from "react-router-dom";

export function MultiStageRulesRedirect() {
  const { workflow } = useActivePresetWorkflow();
  return workflow ? (
    <Navigate to={presetWorkflowPath(workflow.guid)} replace />
  ) : null;
}
