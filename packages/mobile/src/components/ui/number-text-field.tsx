import { TextField } from "@/components/ui/text-field";
import type { NumberTextFieldProps } from "@/lib/interfaces/ui";

export function NumberTextField({ value, onChange, ...props }: NumberTextFieldProps) {
  return (
    <TextField
      {...props}
      keyboardType="number-pad"
      returnKeyType="done"
      value={value == null || Number.isNaN(value) ? "" : String(value)}
      onChangeText={(text) => {
        const digits = text.replace(/\D/g, "");
        onChange(digits === "" ? null : Number(digits));
      }}
    />
  );
}
