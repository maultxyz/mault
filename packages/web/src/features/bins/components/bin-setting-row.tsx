import type { BinSettingRowProps } from "@/lib/interfaces/bins";

export function BinSettingRow({
  id,
  label,
  description,
  control,
  children,
}: BinSettingRowProps) {
  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
          {description && (
            <p className="text-xs text-foreground/70">{description}</p>
          )}
        </div>
        {control && <div className="flex shrink-0 items-center">{control}</div>}
      </div>
      {children}
    </div>
  );
}
