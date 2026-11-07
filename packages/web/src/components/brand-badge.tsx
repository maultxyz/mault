import { BrandIcon } from "@/components/brand-icon";

export function BrandBadge() {
  return (
    <span className="grid size-6.5 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
      <BrandIcon className="size-5.5" />
    </span>
  );
}
