import { BrandIcon } from "@/components/brand-icon";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const isSmall = size === "sm";

  return (
    <Link to="/" className={cn("flex shrink-0 items-center gap-2", className)}>
      <BrandIcon
        className={cn(isSmall ? "size-3.5" : "size-10", "text-primary")}
      />
      <span
        className={cn(
          "font-heading font-semibold",
          isSmall ? "text-xs" : "text-sm",
        )}
      >
        Mault
      </span>
    </Link>
  );
}
