import { DeleteDialog } from "@/components/delete-dialog";
import { SaveBar } from "@/components/save-bar";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { Badge } from "@/components/ui/badge";
import { billingQueryOptions } from "@/features/billing/api/billing";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useOrg } from "@/features/companies/api/use-organization";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AutoAssignSnapshot } from "@/features/bins/components/auto-assign-snapshot";
import { PlanLockHint } from "@/components/plan-lock-hint";
import { ScanOnlyBinSelect } from "@/features/bins/components/scan-only-bin-select";
import { SortingModeToggleRow } from "@/features/bins/components/sorting-mode-toggle-row";
import { CHAOS_BIN_SIZE_MAX, SCAN_ONLY_DEFAULT_BIN } from "@magic-vault/shared";
import { IconRefresh } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function AutoAssignPanel() {
  const { t } = useTranslation("bins");
  const {
    selectedSet,
    configs,
    fieldDefinitions,
    isPresetMutating,
    resetAutoAssign,
    effectiveMode,
    isModeDirty,
    isSavingMode,
    stageMode,
    saveMode,
    discardMode,
  } = useBinConfigs();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const { activeOrg } = useOrg();
  const { data: billing } = useQuery(billingQueryOptions(activeOrg?.id));

  if (!selectedSet) return null;

  const eligibleFields = fieldDefinitions.filter((f) => f.type !== "numeric");
  const isEnabled = !!effectiveMode.autoAssignField;
  const isScanOnly = effectiveMode.scanOnly;
  const isRepackMode = effectiveMode.isRepackMode;
  const isAlphabetMode = effectiveMode.isAlphabetMode;
  const isChaosMode = effectiveMode.isChaosMode;
  const disableToggles = isPresetMutating || isSavingMode;
  const chaosLocked = billing?.chaosSort === false && !selectedSet.isChaosMode;
  const repackLocked =
    billing?.repacks === false && !selectedSet.isRepackMode;

  return (
    <Field
      className={cn(
        "rounded-lg border p-2 gap-2",
        isMobile && "gap-3 border-0 bg-card p-3 ring-1 ring-border",
      )}
      data-tour="auto-assign-panel"
    >
      <SortingModeToggleRow
        label={t("autoAssignPanel.heading")}
        description={t("autoAssignPanel.description")}
        checked={isEnabled}
        disabled={
          disableToggles ||
          eligibleFields.length === 0 ||
          isScanOnly ||
          isRepackMode ||
          isAlphabetMode ||
          isChaosMode
        }
        onCheckedChange={(checked) => {
          stageMode({
            autoAssignField: checked ? eligibleFields[0].field : null,
          });
        }}
      />

      {isEnabled && (
        <div className="flex items-center gap-2">
          <FieldLabel className="sr-only">
            {t("autoAssignPanel.fieldPlaceholder")}
          </FieldLabel>
          <Select
            value={effectiveMode.autoAssignField ?? ""}
            onValueChange={(value) =>
              stageMode({ autoAssignField: value ?? null })
            }
          >
            <SelectTrigger
              className="flex-1 overflow-hidden"
              disabled={disableToggles}
            >
              <SelectValue
                placeholder={t("autoAssignPanel.fieldPlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {eligibleFields.map((field) => (
                <SelectItem key={field.field} value={field.field}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            disabled={disableToggles}
            onClick={() => setResetDialogOpen(true)}
          >
            <IconRefresh />
          </Button>
        </div>
      )}

      <DeleteDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title={t("autoAssignPanel.resetConfirmTitle")}
        description={t("autoAssignPanel.resetConfirmDescription")}
        confirmLabel={t("autoAssignPanel.reset")}
        onConfirm={resetAutoAssign}
      >
        <AutoAssignSnapshot />
      </DeleteDialog>

      <SortingModeToggleRow
        className="border-t pt-2"
        label={t("scanOnlyPanel.heading")}
        description={t("scanOnlyPanel.description")}
        checked={isScanOnly}
        disabled={
          disableToggles ||
          isEnabled ||
          isRepackMode ||
          isAlphabetMode ||
          isChaosMode
        }
        onCheckedChange={(checked) => stageMode({ scanOnly: checked })}
      />

      {isScanOnly && (
        <div className="flex flex-col gap-2">
          <ScanOnlyBinSelect
            id="scan-only-matched-bin"
            label={t("scanOnlyPanel.matchedBin")}
            description={t("scanOnlyPanel.matchedBinDescription")}
            value={effectiveMode.scanOnlyMatchedBin ?? SCAN_ONLY_DEFAULT_BIN}
            binNumbers={configs.map((c) => c.binNumber)}
            disabled={disableToggles}
            onChange={(binNumber) =>
              stageMode({ scanOnlyMatchedBin: binNumber })
            }
          />
          <ScanOnlyBinSelect
            id="scan-only-unmatched-bin"
            label={t("scanOnlyPanel.unmatchedBin")}
            description={t("scanOnlyPanel.unmatchedBinDescription")}
            value={effectiveMode.scanOnlyUnmatchedBin ?? SCAN_ONLY_DEFAULT_BIN}
            binNumbers={configs.map((c) => c.binNumber)}
            disabled={disableToggles}
            onChange={(binNumber) =>
              stageMode({ scanOnlyUnmatchedBin: binNumber })
            }
          />
        </div>
      )}

      <SortingModeToggleRow
        className="border-t pt-2"
        dataTour="repack-toggle"
        label={t("repackPanel.heading")}
        description={t("repackPanel.description")}
        badge={
          repackLocked && (
            <Badge variant="outline">{t("planLock.badge")}</Badge>
          )
        }
        checked={isRepackMode}
        disabled={
          disableToggles ||
          repackLocked ||
          isEnabled ||
          isScanOnly ||
          isAlphabetMode ||
          isChaosMode
        }
        onCheckedChange={(checked) => stageMode({ isRepackMode: checked })}
      />
      {repackLocked && (
        <PlanLockHint message={t("repackPanel.notInPlan")} />
      )}

      <SortingModeToggleRow
        className="border-t pt-2"
        label={t("alphabetPanel.heading")}
        description={t("alphabetPanel.description")}
        checked={isAlphabetMode}
        disabled={
          disableToggles ||
          isEnabled ||
          isScanOnly ||
          isRepackMode ||
          isChaosMode
        }
        onCheckedChange={(checked) => stageMode({ isAlphabetMode: checked })}
      />

      <SortingModeToggleRow
        className="border-t pt-2"
        label={t("chaosPanel.heading")}
        description={t("chaosPanel.description")}
        badge={
          chaosLocked && (
            <Badge variant="outline">{t("planLock.badge")}</Badge>
          )
        }
        checked={isChaosMode}
        disabled={
          disableToggles ||
          chaosLocked ||
          isEnabled ||
          isScanOnly ||
          isRepackMode ||
          isAlphabetMode
        }
        onCheckedChange={(checked) => stageMode({ isChaosMode: checked })}
      />
      {chaosLocked && <PlanLockHint message={t("chaosPanel.notInPlan")} />}
      {isChaosMode && (
        <div className="flex flex-col gap-1 pl-1">
          <label htmlFor="chaos-bin-size" className="text-xs font-medium">
            {t("chaosPanel.binSizeLabel")}
          </label>
          <Input
            id="chaos-bin-size"
            type="number"
            min={1}
            max={CHAOS_BIN_SIZE_MAX}
            inputMode="numeric"
            className="h-8 max-w-32"
            placeholder={t("chaosPanel.binSizePlaceholder")}
            disabled={disableToggles}
            value={effectiveMode.chaosBinSize ?? ""}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              stageMode({
                chaosBinSize: Number.isFinite(parsed)
                  ? Math.min(Math.max(parsed, 1), CHAOS_BIN_SIZE_MAX)
                  : null,
              });
            }}
          />
          <p className="text-xs text-foreground/70">
            {t("chaosPanel.binSizeDescription")}
          </p>
        </div>
      )}

      <SortingModeToggleRow
        className="border-t pt-2"
        label={t("skipSavingPanel.heading")}
        description={t("skipSavingPanel.description")}
        checked={effectiveMode.skipSaving}
        disabled={disableToggles}
        onCheckedChange={(checked) => stageMode({ skipSaving: checked })}
      />

      <SaveBar
        show={isModeDirty}
        onSave={saveMode}
        isSaving={isSavingMode}
        onDiscard={discardMode}
      />
      <UnsavedChangesGuard isDirty={isModeDirty} onDiscard={discardMode} />
    </Field>
  );
}
