import { Input } from "@/components/ui/input";
import type { NumberInputProps } from "@/lib/interfaces/business";

export function NumberInput({ value, onChange, ...props }: NumberInputProps) {
  return (
    <Input
      {...props}
      type="number"
      value={value == null || Number.isNaN(value) ? "" : value}
      onChange={(e) =>
        onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))
      }
    />
  );
}
