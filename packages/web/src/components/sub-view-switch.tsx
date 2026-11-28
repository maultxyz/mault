import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { ViewTabs } from "@/components/view-tabs";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { SubViewSwitchProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";

export function SubViewSwitch<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
  dataTour,
}: SubViewSwitchProps<T>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <ViewTabs
        items={items}
        value={value}
        onChange={onChange}
        label={label}
        className={className}
        dataTour={dataTour}
      />
    );
  }
  return (
    <div data-tour={dataTour} className={cn("self-start", className)}>
      <ResponsiveSegmented items={items} value={value} onChange={onChange} label={label} />
    </div>
  );
}
