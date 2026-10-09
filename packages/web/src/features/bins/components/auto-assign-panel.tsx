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
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { Badge } from "@/components/ui/badge";
import { billingQueryOptions } from "@/features/billing/api/billing";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useOrg } from "@/features/companies/api/use-organization";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AutoAssignSnapshot } from "@/features/bins/components/auto-assign-snapshot";
import { ScanOnlyBinSelect } from "@/features/bins/components/scan-only-bin-select";
import { CHAOS_BIN_SIZE_MAX, SCAN_ONLY_DEFAULT_BIN } from "@magic-vault/shared";
import { IconInfoCircle, IconRefresh } from "@tabler/icons-react";
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

  return (
    <Field
      className="rounded-lg border p-2 gap-2"
      data-tour="auto-assign-panel"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <span className="text-xs font-medium">
            {t("autoAssignPanel.heading")}
          </span>
          <Tooltip>
            <TooltipTrigger className="text-foreground/70 hover:text-foreground transition-colors">
              <IconInfoCircle className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {t("autoAssignPanel.description")}
            </TooltipContent>
          </Tooltip>
        </span>
        <Switch
          aria-label={t("autoAssignPanel.heading")}
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
      </div>

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

      <div className="flex items-center justify-between gap-3 border-t pt-2">
        <span className="flex items-center gap-1.5">
          <span className="text-xs font-medium">
            {t("scanOnlyPanel.heading")}
          </span>
          <Tooltip>
            <TooltipTrigger className="text-foreground/70 hover:text-foreground transition-colors">
              <IconInfoCircle className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {t("scanOnlyPanel.description")}
            </TooltipContent>
          </Tooltip>
        </span>
        <Switch
          aria-label={t("scanOnlyPanel.heading")}
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
      </div>

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

      <div
        className="flex items-center justify-between gap-3 border-t pt-2"
        data-tour="repack-toggle"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-xs font-medium">
            {t("repackPanel.heading")}
          </span>
          <Tooltip>
            <TooltipTrigger className="text-foreground/70 hover:text-foreground transition-colors">
              <IconInfoCircle className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {t("repackPanel.description")}
            </TooltipContent>
          </Tooltip>
        </span>
        <Switch
          aria-label={t("repackPanel.heading")}
          checked={isRepackMode}
          disabled={
            disableToggles ||
            isEnabled ||
            isScanOnly ||
            isAlphabetMode ||
            isChaosMode
          }
          onCheckedChange={(checked) => stageMode({ isRepackMode: checked })}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-2">
        <span className="flex items-center gap-1.5">
          <span className="text-xs font-medium">
            {t("alphabetPanel.heading")}
          </span>
          <Tooltip>
            <TooltipTrigger className="text-foreground/70 hover:text-foreground transition-colors">
              <IconInfoCircle className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {t("alphabetPanel.description")}
            </TooltipContent>
          </Tooltip>
        </span>
        <Switch
          aria-label={t("alphabetPanel.heading")}
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
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-2">
        <span className="flex items-center gap-1.5">
          <span className="text-xs font-medium">
            {t("chaosPanel.heading")}
          </span>
          {chaosLocked && (
            <Badge variant="outline">{t("chaosPanel.businessBadge")}</Badge>
          )}
          <Tooltip>
            <TooltipTrigger className="text-foreground/70 hover:text-foreground transition-colors">
              <IconInfoCircle className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {t("chaosPanel.description")}
            </TooltipContent>
          </Tooltip>
        </span>
        <Switch
          aria-label={t("chaosPanel.heading")}
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
      </div>
      {chaosLocked && (
        <p className="pl-1 text-2xs text-foreground/70">
          {t("chaosPanel.businessOnly")}{" "}
          <Link
            to={SETTINGS_PATHS.billing}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t("chaosPanel.upgrade")}
          </Link>
        </p>
      )}
      {isChaosMode && (
        <div className="flex flex-col gap-1 pl-1">
          <label
            htmlFor="chaos-bin-size"
            className="text-xs font-medium"
          >
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
          <p className="text-2xs text-foreground/70">
            {t("chaosPanel.binSizeDescription")}
          </p>
        </div>
      )}

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
