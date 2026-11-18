import type { MachinePageDotsProps } from "@/lib/interfaces/machines";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function MachinePageDots({ machines, selectedMachineId, onSelectMachine }: MachinePageDotsProps) {
  const { t } = useTranslation("machines");
  const selectedIndex = machines.findIndex((machine) => machine.machineId === selectedMachineId);
  if (machines.length < 2) return null;

  return (
    <nav
      aria-label={t("pages.label", { position: selectedIndex + 1, count: machines.length })}
      className="flex justify-center"
    >
      <div className="flex items-center gap-1 rounded-full bg-foreground/6 px-1.5 py-1">
        {machines.map((machine) => {
          const isSelected = machine.machineId === selectedMachineId;
          return (
            <button
              key={machine.machineId}
              type="button"
              aria-label={t("pages.goTo", { name: machine.name })}
              aria-current={isSelected ? "page" : undefined}
              onClick={() => onSelectMachine(machine.machineId)}
              className="flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                aria-hidden
                className={cn("size-2 rounded-full", isSelected ? "bg-foreground" : "bg-foreground/40")}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
