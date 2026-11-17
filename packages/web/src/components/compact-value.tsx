import { usePriceSource } from "@/hooks/use-price-source";
import type {
  CompactCountProps,
  CompactPriceProps,
  CompactValueProps,
} from "@/lib/interfaces/compact-value";
import { cn } from "@/lib/utils";
import { formatCompactNumber } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function CompactValue({
  exact,
  compact,
  compactsOnlyBelowMd,
  className,
}: CompactValueProps) {
  if (compact === exact) return <span className={className}>{exact}</span>;
  const compacted = (
    <span
      title={exact}
      className={cn(compactsOnlyBelowMd && "md:hidden", className)}
    >
      <span aria-hidden>{compact}</span>
      <span className="sr-only">{exact}</span>
    </span>
  );
  if (!compactsOnlyBelowMd) return compacted;
  return (
    <>
      <span className={cn("max-md:hidden", className)}>{exact}</span>
      {compacted}
    </>
  );
}

export function CompactCount({
  value,
  compactsOnlyBelowMd,
  className,
}: CompactCountProps) {
  const { i18n } = useTranslation();
  return (
    <CompactValue
      exact={value.toLocaleString(i18n.language)}
      compact={formatCompactNumber(value, i18n.language)}
      compactsOnlyBelowMd={compactsOnlyBelowMd}
      className={className}
    />
  );
}

export function CompactPrice({
  value,
  compactsOnlyBelowMd,
  className,
}: CompactPriceProps) {
  const { format, formatCompact } = usePriceSource();
  return (
    <CompactValue
      exact={format(value)}
      compact={formatCompact(value)}
      compactsOnlyBelowMd={compactsOnlyBelowMd}
      className={className}
    />
  );
}
