import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useMachineLabels } from "@/features/machines/api/use-machine-labels";
import { MACHINE_RUN_STATE_DOT_CLASS } from "@/lib/constants/machines";
import { MOBILE_LIST_CLASS, MOBILE_LIST_ROW_CLASS } from "@/lib/constants/nav";
import type { MachinePickerProps } from "@/lib/interfaces/machines";
import { cn } from "@/lib/utils";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function MachinePicker({ machines, selectedMachineId, onSelectMachine }: MachinePickerProps) {
  const { t } = useTranslation("machines");
  const { statusLabel } = useMachineLabels();
  const [open, setOpen] = useState(false);
  const selected = machines.find((machine) => machine.machineId === selectedMachineId);
  const canChoose = machines.length > 1;

  if (!selected) return null;
  if (!canChoose) {
    return (
      <p className="truncate font-heading text-2xl font-semibold text-foreground">{selected.name}</p>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("machinePicker", { name: selected.name })}
        onClick={() => setOpen(true)}
        className="flex min-w-0 items-center gap-2 self-start rounded-lg font-heading text-2xl font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="truncate">{selected.name}</span>
        <IconChevronDown aria-hidden className="size-5 shrink-0" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="flex flex-col gap-3 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <DrawerTitle className="font-heading text-base font-semibold text-foreground">
              {t("chooseMachine")}
            </DrawerTitle>
            <div className={MOBILE_LIST_CLASS}>
              {machines.map((machine) => (
                <button
                  key={machine.machineId}
                  type="button"
                  aria-current={machine.machineId === selectedMachineId}
                  onClick={() => {
                    onSelectMachine(machine.machineId);
                    setOpen(false);
                  }}
                  className={MOBILE_LIST_ROW_CLASS}
                >
                  <span
                    aria-hidden
                    className={cn("size-2 shrink-0 rounded-full", MACHINE_RUN_STATE_DOT_CLASS[machine.runState])}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{machine.name}</span>
                    <span className="block truncate text-xs font-normal text-foreground/70">
                      {statusLabel(machine)}
                    </span>
                  </span>
                  {machine.machineId === selectedMachineId && (
                    <IconCheck aria-hidden className="size-4 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
