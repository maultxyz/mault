import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { PresetActionDialogs } from "@/features/bins/components/preset-action-dialogs";
import { SORTING_RULES_PATH } from "@/lib/constants/bins";
import type { PresetDialog } from "@/lib/interfaces/bins";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import type { BinSet } from "@magic-vault/shared";
import {
  IconEdit,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function PresetSelector() {
  const { t } = useTranslation("bins");
  const { sets, activateSet, selectedSet, isActivating, isPresetMutating } =
    useBinConfigs();
  const { activeCollection } = useCollections();
  const { activeOrg } = useOrg();
  const { isLoading } = useQuery({ ...binsQueryOptions, enabled: !!activeOrg });
  const [openDialog, setOpenDialog] = useState<PresetDialog | null>(null);

  if (isLoading) {
    return (
      <ButtonGroup className="w-full">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="size-9 shrink-0" />
      </ButtonGroup>
    );
  }

  return (
    <Field>
      <FieldLabel>{t("presetSelector.sortingLogic")}</FieldLabel>
      <ButtonGroup className="w-full">
        <Combobox
          items={sets}
          value={selectedSet ?? null}
          onValueChange={(set) => set && activateSet(set.guid)}
          itemToStringLabel={(set: BinSet) => set.name}
          isItemEqualToValue={(a: BinSet, b: BinSet) => a?.guid === b?.guid}
        >
          <ComboboxInput
            className="flex-1 overflow-hidden"
            placeholder={t("presetSelector.selectSetPlaceholder")}
            disabled={isActivating}
          >
            {isActivating && (
              <InputGroupAddon align="inline-start">
                <IconLoader2 className="size-3 animate-spin text-foreground/70" />
              </InputGroupAddon>
            )}
          </ComboboxInput>
          <ComboboxContent>
            <ComboboxEmpty>{t("presetSelector.noMatchingSets")}</ComboboxEmpty>
            <ComboboxList>
              {(set: BinSet) => (
                <ComboboxItem key={set.guid} value={set}>
                  <span className="truncate">{set.name}</span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                nativeButton={false}
                variant="outline"
                size="icon"
                disabled={!activeCollection}
              >
                <Link to={SORTING_RULES_PATH}>
                  <IconEdit />
                </Link>
              </Button>
            }
          ></TooltipTrigger>
          <TooltipContent>
            {t("presetSelector.editSortingLogic")}
          </TooltipContent>
        </Tooltip>
        {!!selectedSet?.autoAssignField && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!selectedSet || isPresetMutating}
                  onClick={() => setOpenDialog("resetAutoAssign")}
                >
                  <IconRefresh />
                </Button>
              }
            ></TooltipTrigger>
            <TooltipContent>{t("autoAssignPanel.reset")}</TooltipContent>
          </Tooltip>
        )}
      </ButtonGroup>
      <PresetActionDialogs
        openDialog={openDialog}
        onOpenDialogChange={setOpenDialog}
      />
    </Field>
  );
}
