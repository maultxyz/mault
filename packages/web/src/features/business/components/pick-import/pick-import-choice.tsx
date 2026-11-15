import type { PickImportChoiceProps } from "@/lib/interfaces/business";
import { cn } from "@/lib/utils";
import { useId } from "react";

export function PickImportChoice<T extends string>({
  legend,
  value,
  onChange,
  options,
}: PickImportChoiceProps<T>) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-control font-medium">{legend}</legend>
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        const descriptionId = `${id}-description`;
        const isSelected = option.value === value;
        return (
          <div
            key={option.value}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
              isSelected && "border-primary bg-primary/5",
              option.disabled && "opacity-60",
            )}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              disabled={option.disabled}
              aria-describedby={descriptionId}
              onChange={() => onChange(option.value)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <label htmlFor={id} className="text-sm font-medium">
                {option.label}
              </label>
              <p id={descriptionId} className="text-xs text-foreground/70">
                {option.description}
              </p>
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
