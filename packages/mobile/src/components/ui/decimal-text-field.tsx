import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/text-field";
import { DECIMAL_INPUT_PATTERN } from "@/lib/constants/ui";
import type { DecimalTextFieldProps } from "@/lib/interfaces/ui";

function textFor(value: number | null): string {
  return value == null || Number.isNaN(value) ? "" : String(value);
}

export function DecimalTextField({ value, onChange, ...props }: DecimalTextFieldProps) {
  const [text, setText] = useState(textFor(value));

  useEffect(() => {
    setText((current) => (current !== "" && Number(current) === value ? current : textFor(value)));
  }, [value]);

  return (
    <TextField
      {...props}
      keyboardType="decimal-pad"
      returnKeyType="done"
      value={text}
      onChangeText={(raw) => {
        const next = raw.replace(",", ".");
        if (!DECIMAL_INPUT_PATTERN.test(next)) return;
        setText(next);
        onChange(next === "" || next === "." ? null : Number(next));
      }}
    />
  );
}
