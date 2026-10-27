import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/text-field";
import { PRICE_PAID_INPUT_PATTERN } from "@/lib/constants/cards";
import type { PricePaidFieldProps } from "@/lib/interfaces/cards";

function textFor(value: number | null): string {
  return value == null ? "" : String(value);
}

export function PricePaidField({ label, placeholder, value, onChange, error }: PricePaidFieldProps) {
  const [text, setText] = useState(textFor(value));

  useEffect(() => {
    setText((current) => (current !== "" && Number(current) === value ? current : textFor(value)));
  }, [value]);

  return (
    <TextField
      label={label}
      placeholder={placeholder}
      keyboardType="decimal-pad"
      value={text}
      error={error}
      onChangeText={(raw) => {
        const next = raw.replace(",", ".");
        if (!PRICE_PAID_INPUT_PATTERN.test(next)) return;
        setText(next);
        onChange(next === "" || next === "." ? null : Number(next));
      }}
    />
  );
}
