import { DeleteDialog } from "@/components/delete-dialog";
import { SaveBar } from "@/components/save-bar";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { usePresetWorkflowDraft } from "@/features/bins/api/use-preset-workflow-draft";
import { EmptyState } from "@/components/empty-state";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { BinConfigsProvider } from "@/features/bins/api/use-bin-configs";
import { usePresetWorkflows } from "@/features/bins/api/use-preset-workflows";
import { PresetStageMoveDialog } from "@/features/bins/components/preset-stage-dialogs";
import { PresetWorkflowStageCard } from "@/features/bins/components/preset-workflow-stage-card";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PresetWorkflowRenameDialog } from "@/features/bins/components/preset-workflow-rename-dialog";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { SORTING_RULES_PATH } from "@/lib/constants/bins";
import {
  MOBILE_NAV_SCROLL_PADDING_CLASS,
  MOBILE_PAGE_BODY_CLASS,
} from "@/lib/constants/nav";
import type { PresetWorkflowStepMove } from "@/lib/interfaces/bins";
import { cn } from "@/lib/utils";

import {
  IconListNumbers,
  IconPencil,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

function PresetWorkflowContent() {
  const { t } = useTranslation("bins");
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { workflowGuid } = useParams<{ workflowGuid: string }>();
  const { sets } = useBinConfigs();
  const {
    workflows,
    isLoading,
    start,
    remove,
    isSaving,
    isEntering,
  } = usePresetWorkflows();
  const workflow = workflows.find((candidate) => candidate.guid === workflowGuid);
  const draft = usePresetWorkflowDraft(workflow);
  const [move, setMove] = useState<PresetWorkflowStepMove | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const actions = workflow && (
    <div className="flex flex-wrap items-center gap-1.5">
      {!workflow.isActive && (
        <Button disabled={isEntering} onClick={() => void start(workflow)}>
          <IconPlayerPlay /> {t("presetWorkflows.start")}
        </Button>
      )}
      <Button variant="outline" disabled={isSaving} onClick={() => setRenameOpen(true)}>
        <IconPencil /> {t("presetSelector.rename")}
      </Button>
      <Button
        variant="outline-destructive"
        disabled={isSaving}
        onClick={() => setDeleteOpen(true)}
      >
        <IconTrash /> {t("presetWorkflows.delete")}
      </Button>
    </div>
  );

  const body =
    workflow && draft.stages.fields.length > 0 ? (
      <div className="flex flex-col gap-3 md:gap-2">
        {draft.stages.fields.map((field, index) => (
          <PresetWorkflowStageCard
            key={field.fieldKey}
            workflow={workflow}
            control={draft.form.control}
            index={index}
            stageCount={draft.stages.fields.length}
            isDirty={draft.isDirty}
            onSwitch={setMove}
            onMove={draft.stages.move}
            onRemove={draft.stages.remove}
          />
        ))}
        <Select
          value={null}
          onValueChange={(presetGuid) => presetGuid && draft.addStage(presetGuid)}
        >
          <SelectTrigger
            className="w-full md:w-72"
            aria-label={t("presetWorkflows.addStage")}
          >
            <SelectValue>{t("presetWorkflows.addStage")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sets.map((preset) => (
              <SelectItem key={preset.guid} value={preset.guid}>
                {preset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : (
      !isLoading && (
        <EmptyState
          icon={IconListNumbers}
          title={t("presetWorkflows.notFoundTitle")}
          description={t("presetWorkflows.notFoundDescription")}
        />
      )
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isMobile ? (
        <MobilePageHeader
          title={workflow?.name ?? t("presetWorkflows.badge")}
          subtitle={t("presetWorkflows.badge")}
        />
      ) : (
        <PageHeader
          title={workflow?.name ?? t("presetWorkflows.badge")}
          description={t("presetWorkflows.pageDescription")}
          actions={actions}
        />
      )}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          isMobile && MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <div
          className={
            isMobile
              ? MOBILE_PAGE_BODY_CLASS
              : "mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:px-3 md:py-2"
          }
        >
          {isMobile && (
            <>
              <p className="text-xs text-foreground/70">
                {t("presetWorkflows.pageDescription")}
              </p>
              {actions}
            </>
          )}
          {body}
        </div>
      </div>
      <PresetStageMoveDialog move={move} onClose={() => setMove(null)} />
      <SaveBar
        show={draft.isDirty}
        isSaving={draft.isSaving}
        onSave={draft.save}
        onDiscard={draft.discard}
      />
      <UnsavedChangesGuard isDirty={draft.isDirty} onDiscard={draft.discard} />
      {workflow && (
        <PresetWorkflowRenameDialog
          workflow={workflow}
          open={renameOpen}
          onClose={() => setRenameOpen(false)}
        />
      )}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("presetWorkflows.deleteTitle")}
        description={t("presetWorkflows.deleteDescription", {
          name: workflow?.name,
        })}
        onConfirm={async () => {
          if (workflow && (await remove(workflow))) {
            navigate(SORTING_RULES_PATH);
          }
        }}
      />
    </div>
  );
}

export default function PresetWorkflowPage() {
  return (
    <BinConfigsProvider>
      <PresetWorkflowContent />
    </BinConfigsProvider>
  );
}
