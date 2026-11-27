import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { EditingPresetMenu } from "@/features/bins/components/editing-preset-menu";
import { PresetActionDialogs } from "@/features/bins/components/preset-action-dialogs";
import type { PresetDialog } from "@/lib/interfaces/bins";
import { IconClockHour3, IconPencil, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function PresetActionsBar() {
  const { t } = useTranslation("bins");
  const { selectedSet, isPresetMutating } = useBinConfigs();
  const [openDialog, setOpenDialog] = useState<PresetDialog | null>(null);

  const actions = [
    {
      dialog: "create" as const,
      label: t("presetSelector.newSetTitle"),
      icon: <IconPlus />,
      disabled: isPresetMutating,
    },
    {
      dialog: "rename" as const,
      label: t("presetSelector.renameSetTitle"),
      icon: <IconPencil />,
      disabled: !selectedSet || isPresetMutating,
    },
    {
      dialog: "history" as const,
      label: t("presetSelector.viewHistory"),
      icon: <IconClockHour3 />,
      disabled: !selectedSet,
    },
  ];

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5">
        <EditingPresetMenu />
        {actions.map((action) => (
          <Tooltip key={action.dialog}>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={action.label}
                  disabled={action.disabled}
                  onClick={() => setOpenDialog(action.dialog)}
                >
                  {action.icon}
                </Button>
              }
            />
            <TooltipContent>{action.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <PresetActionDialogs
        openDialog={openDialog}
        onOpenDialogChange={setOpenDialog}
      />
    </>
  );
}
