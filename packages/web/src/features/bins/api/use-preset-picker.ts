import { useActivePresetWorkflow } from "@/features/bins/api/use-active-preset-workflow";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { usePresetWorkflows } from "@/features/bins/api/use-preset-workflows";
import type { PresetPickerItem } from "@/lib/interfaces/bins";

export function usePresetPicker() {
  const { sets, selectedSet, activateSet, isActivating } = useBinConfigs();
  const { workflows, start, isEntering } = usePresetWorkflows();
  const active = useActivePresetWorkflow();
  const items: PresetPickerItem[] = [
    ...sets.map((preset) => ({
      kind: "preset" as const,
      guid: preset.guid,
      name: preset.name,
      preset,
    })),
    ...workflows.map((workflow) => ({
      kind: "workflow" as const,
      guid: workflow.guid,
      name: workflow.name,
      workflow,
    })),
  ];

  return {
    items,
    activeLabel: active.workflow ? active.label : (selectedSet?.name ?? null),
    isChoosing: isActivating || isEntering,
    isSelected: (item: PresetPickerItem) =>
      item.kind === "workflow"
        ? item.guid === active.workflow?.guid
        : !active.workflow && item.guid === selectedSet?.guid,
    choose: (item: PresetPickerItem) => {
      if (item.kind === "workflow") {
        if (item.guid !== active.workflow?.guid) void start(item.workflow);
        return;
      }
      if (active.workflow || item.guid !== selectedSet?.guid) {
        void activateSet(item.guid);
      }
    },
  };
}
