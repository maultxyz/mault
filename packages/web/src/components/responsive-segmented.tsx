import { MobileSegmentedControl } from "@/components/mobile-segmented-control";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { ResponsiveSegmentedProps } from "@/lib/interfaces/nav";

export function ResponsiveSegmented<T extends string>({
  items,
  value,
  onChange,
  label,
  size = "default",
  className,
}: ResponsiveSegmentedProps<T>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileSegmentedControl
        items={items}
        value={value}
        onChange={onChange}
        label={label}
      />
    );
  }

  return (
    <ButtonGroup aria-label={label} className={className}>
      {items.map((item) => (
        <Button
          key={item.key}
          size={size}
          variant={value === item.key ? "outline-selected" : "outline"}
          aria-pressed={value === item.key}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </Button>
      ))}
    </ButtonGroup>
  );
}
