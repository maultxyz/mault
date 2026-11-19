import { Input } from "@/components/ui/input";
import type { OptionalNumberInputProps } from "@/lib/interfaces/storage";

export function OptionalNumberInput({
  id,
  value,
  onChange,
  onBlur,
  min = 1,
  max,
  placeholder,
  invalid,
  describedBy,
}: OptionalNumberInputProps) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      placeholder={placeholder}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      value={value ?? ""}
      onBlur={onBlur}
      onChange={(event) => {
        const parsed = event.target.valueAsNumber;
        onChange(Number.isFinite(parsed) ? parsed : null);
      }}
    />
  );
}
