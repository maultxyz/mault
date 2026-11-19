import { EmptyState } from "@/components/empty-state";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { useMachineStatuses } from "@/features/machines/api/use-machine-statuses";
import { MachinePageDots } from "@/features/machines/components/machine-page-dots";
import { MachinePanel } from "@/features/machines/components/machine-panel";
import { MachinePicker } from "@/features/machines/components/machine-picker";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { IconDeviceDesktopAnalytics } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function MobileMachinesPager() {
  const machines = useMachineStatuses();
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const pagerRef = useRef<HTMLDivElement>(null);
  const selectedId =
    machines.find((machine) => machine.machineId === selectedMachineId)?.machineId ??
    machines[0]?.machineId ??
    "";

  const showMachine = useCallback(
    (machineId: string) => {
      setSelectedMachineId(machineId);
      const index = machines.findIndex((machine) => machine.machineId === machineId);
      const pager = pagerRef.current;
      if (!pager || index < 0) return;
      pager.scrollTo({ left: index * pager.clientWidth, behavior: "smooth" });
    },
    [machines],
  );

  useEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;
    const syncSelectedPage = () => {
      const index = Math.round(pager.scrollLeft / Math.max(pager.clientWidth, 1));
      const machine = machines[index];
      if (machine) setSelectedMachineId(machine.machineId);
    };
    pager.addEventListener("scroll", syncSelectedPage, { passive: true });
    return () => pager.removeEventListener("scroll", syncSelectedPage);
  }, [machines]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-3 pb-2">
        <MachinePicker
          machines={machines}
          selectedMachineId={selectedId}
          onSelectMachine={showMachine}
        />
      </div>
      <div
        ref={pagerRef}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {machines.map((machine) => (
          <div
            key={machine.machineId}
            className={cn(
              "w-full shrink-0 snap-start overflow-y-auto px-4 pb-4",
              MOBILE_NAV_SCROLL_PADDING_CLASS,
            )}
          >
            <MachinePanel machine={machine} showsName={false} />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--mobile-nav-space,0px)+0.75rem)] flex justify-center">
        <div className="pointer-events-auto">
          <MachinePageDots
            machines={machines}
            selectedMachineId={selectedId}
            onSelectMachine={showMachine}
          />
        </div>
      </div>
    </div>
  );
}

export default function MachinesPage() {
  const { t } = useTranslation("machines");
  const isMobile = useIsMobile();
  const machines = useMachineStatuses();

  const emptyState = (
    <EmptyState
      icon={IconDeviceDesktopAnalytics}
      title={t("empty.title")}
      description={t("empty.description")}
      className="m-4"
    />
  );

  if (isMobile) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <MobilePageHeader title={t("title")} titleVisuallyHidden />
        {machines.length === 0 ? emptyState : <MobileMachinesPager />}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={t("title")} spansFullWidth />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {machines.length === 0 ? (
          emptyState
        ) : (
          <div className="grid grid-cols-1 gap-6 p-4 md:px-3 md:py-2 lg:grid-cols-2 2xl:grid-cols-3">
            {machines.map((machine) => (
              <MachinePanel key={machine.machineId} machine={machine} showsName />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
