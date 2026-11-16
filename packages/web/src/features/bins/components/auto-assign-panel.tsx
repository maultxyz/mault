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
import { PlanNotice } from "@/components/plan-notice";
import { ScanOnlyBinSelect } from "@/features/bins/components/scan-only-bin-select";
import { SortingModeToggleRow } from "@/features/bins/components/sorting-mode-toggle-row";
import {
  sortingModeChangePatch,
  sortingModeOfDraft,
} from "@/features/bins/lib/sorting-mode";
import {
  AUTO_ASSIGN_FIELD_SELECT_ID,
  RESET_AUTO_ASSIGN_HINT_ID,
  SORTING_MODE_DESCRIPTION_ID,
  SORTING_MODE_DESCRIPTION_KEYS,
  SORTING_MODE_LABEL_KEYS,
  SORTING_MODE_OPTIONS,
  SORTING_MODE_SELECT_ID,
  SORTING_MODE_SUMMARY_ID,
  SORTING_MODE_SUMMARY_KEYS,
} from "@/lib/constants/bins";
import {
  CHAOS_BIN_SIZE_MAX,
  SCAN_ONLY_DEFAULT_BIN,
  SCAN_RULE_GAME_FIELD,
  type BinSetMode,
} from "@magic-vault/shared";
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconRefresh,
} from "@tabler/icons-react";
import { Callout } from "@/components/callout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { gamesQueryOptions } from "@/features/games/api/games";
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
    gameKey,
    effectiveMode,
    isModeDirty,
    isSavingMode,
    stageMode,
    saveMode,
    discardMode,
  } = useBinConfigs();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const isMobile = useIsMobile();
  const { activeOrg } = useOrg();
  const { data: billing } = useQuery(billingQueryOptions(activeOrg?.id));
  const { data: allGames = [] } = useQuery(gamesQueryOptions);

  if (!selectedSet) return null;

  const eligibleFields = fieldDefinitions.filter((f) => f.type !== "numeric");
  const isEnabled = !!effectiveMode.autoAssignField;
  const isGameSort = effectiveMode.autoAssignField === SCAN_RULE_GAME_FIELD;
  const isFieldAutoAssign = isEnabled && !isGameSort;
  const otherGames = allGames.filter(
    (game) => game.isActive && game.key !== gameKey,
  );
  const toggleMatchGame = (matchGameKey: string, checked: boolean) =>
    stageMode({
      matchGameKeys: checked
        ? [...effectiveMode.matchGameKeys, matchGameKey]
        : effectiveMode.matchGameKeys.filter((key) => key !== matchGameKey),
    });
  const isScanOnly = effectiveMode.scanOnly;
  const isChaosMode = effectiveMode.isChaosMode;
  const sortingMode = sortingModeOfDraft(effectiveMode);
  const sortingModeLabel = t(SORTING_MODE_LABEL_KEYS[sortingMode]);
  const disableToggles = isPresetMutating || isSavingMode;
  const hasLearnedBins = configs.some(
    (config) => !config.isCatchAll && config.rules.conditions.length > 0,
  );
  const chaosLocked = billing?.chaosSort === false && !selectedSet.isChaosMode;
  const repackLocked =
    billing?.repacks === false && !selectedSet.isRepackMode;
  const lockedModes: BinSetMode[] = [
    ...(repackLocked ? (["repack"] as const) : []),
    ...(chaosLocked ? (["chaos"] as const) : []),
  ];
  const unavailableModes: BinSetMode[] = [
    ...lockedModes,
    ...(otherGames.length === 0 ? (["game-sort"] as const) : []),
    ...(eligibleFields.length === 0 ? (["auto-assign"] as const) : []),
  ];
  const resetDisabledHint = isModeDirty
    ? t("autoAssignPanel.resetNeedsSave")
    : hasLearnedBins
      ? null
      : t("autoAssignPanel.resetNothingLearned");

  return (
    <Field
      className={cn(
        "gap-2 rounded-card bg-card p-3 md:p-2.5",
        isMobile && "gap-3",
      )}
      data-tour="auto-assign-panel"
    >
      <div className="flex flex-col gap-1.5" data-tour="repack-toggle">
        <div className="flex items-center gap-1">
          <FieldLabel htmlFor={SORTING_MODE_SELECT_ID}>
            {t("sortingModePanel.title")}
          </FieldLabel>
          <button
            type="button"
            aria-expanded={isDescriptionOpen}
            aria-controls={SORTING_MODE_DESCRIPTION_ID}
            aria-label={t("sortingModePanel.explain", {
              mode: sortingModeLabel,
            })}
            onClick={() => setIsDescriptionOpen((open) => !open)}
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-md text-foreground/70 transition-colors hover:text-foreground max-md:size-8",
              isDescriptionOpen && "text-primary",
            )}
          >
            <IconInfoCircle className="size-3.5 max-md:size-4" />
          </button>
        </div>
        <Select
          value={sortingMode}
          disabled={disableToggles}
          onValueChange={(nextMode) => {
            if (!nextMode) return;
            stageMode(
              sortingModeChangePatch(
                sortingMode,
                nextMode,
                eligibleFields[0]?.field ?? null,
              ),
            );
          }}
        >
          <SelectTrigger
            id={SORTING_MODE_SELECT_ID}
            aria-describedby={SORTING_MODE_SUMMARY_ID}
            className="w-full overflow-hidden"
          >
            <SelectValue>{sortingModeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORTING_MODE_OPTIONS.map((option) => (
              <SelectItem
                key={option}
                value={option}
                label={t(SORTING_MODE_LABEL_KEYS[option])}
                disabled={
                  option !== sortingMode && unavailableModes.includes(option)
                }
              >
                <span className="flex flex-col gap-0.5 py-0.5 pr-6 whitespace-normal">
                  <span className="flex items-center gap-1.5 font-medium">
                    {t(SORTING_MODE_LABEL_KEYS[option])}
                    {lockedModes.includes(option) && (
                      <Badge variant="outline">{t("planLock.badge")}</Badge>
                    )}
                  </span>
                  <span className="max-w-72 text-xs text-foreground/70">
                    {t(SORTING_MODE_SUMMARY_KEYS[option])}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p id={SORTING_MODE_SUMMARY_ID} className="text-xs text-foreground/70">
          {t(SORTING_MODE_SUMMARY_KEYS[sortingMode])}
        </p>
        <p
          id={SORTING_MODE_DESCRIPTION_ID}
          hidden={!isDescriptionOpen}
          className="text-xs text-foreground/70"
        >
          {t(SORTING_MODE_DESCRIPTION_KEYS[sortingMode])}
        </p>
      </div>
      {repackLocked && <PlanNotice message={t("repackPanel.notInPlan")} />}
      {chaosLocked && <PlanNotice message={t("chaosPanel.notInPlan")} />}

      {isGameSort && (
        <div className="flex flex-col gap-2">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-xs font-medium">
              {t("gameSortPanel.gamesLabel")}
            </legend>
            {otherGames.map((game) => (
              <Label
                key={game.key}
                className="flex items-center gap-2 font-normal"
              >
                <Checkbox
                  checked={effectiveMode.matchGameKeys.includes(game.key)}
                  disabled={disableToggles}
                  onCheckedChange={(checked) =>
                    toggleMatchGame(game.key, checked === true)
                  }
                />
                {game.name}
              </Label>
            ))}
          </fieldset>
          {effectiveMode.matchGameKeys.length === 0 ? (
            <Callout variant="warning" icon={IconAlertTriangle}>
              {t("gameSortPanel.pickGames")}
            </Callout>
          ) : (
            <p className="text-xs text-foreground/70">
              {t("gameSortPanel.hint")}
            </p>
          )}
        </div>
      )}

      {isFieldAutoAssign && (
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={AUTO_ASSIGN_FIELD_SELECT_ID}>
            {t("autoAssignPanel.fieldLabel")}
          </FieldLabel>
          <Select
            value={effectiveMode.autoAssignField ?? ""}
            onValueChange={(value) =>
              stageMode({ autoAssignField: value ?? null })
            }
          >
            <SelectTrigger
              id={AUTO_ASSIGN_FIELD_SELECT_ID}
              className="w-full overflow-hidden"
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
        </div>
      )}

      {isEnabled && (
        <div className="flex flex-col gap-1.5">
          <Button
            variant="outline"
            disabled={disableToggles || isModeDirty || !hasLearnedBins}
            aria-describedby={
              resetDisabledHint ? RESET_AUTO_ASSIGN_HINT_ID : undefined
            }
            onClick={() => setResetDialogOpen(true)}
          >
            <IconRefresh />
            {t("presetSelector.resetAutoAssign")}
          </Button>
          {resetDisabledHint && (
            <p
              id={RESET_AUTO_ASSIGN_HINT_ID}
              className="text-xs text-foreground/70"
            >
              {resetDisabledHint}
            </p>
          )}
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

      {isChaosMode && (
        <div className="flex flex-col gap-1">
          <label htmlFor="chaos-bin-size" className="text-xs font-medium">
            {t("chaosPanel.binSizeLabel")}
          </label>
          <Input
            id="chaos-bin-size"
            type="number"
            min={1}
            max={CHAOS_BIN_SIZE_MAX}
            inputMode="numeric"
            className="max-w-32"
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
        onCheckedChange={(checked) =>
          stageMode({
            skipSaving: checked,
            ...(checked ? { isResortMode: false } : {}),
          })
        }
      />

      <SortingModeToggleRow
        className="border-t pt-2"
        label={t("resortPanel.heading")}
        description={t("resortPanel.description")}
        checked={effectiveMode.isResortMode}
        disabled={disableToggles}
        onCheckedChange={(checked) =>
          stageMode({
            isResortMode: checked,
            ...(checked ? { skipSaving: false } : {}),
          })
        }
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
