import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { TextField } from "@/components/ui/text-field";
import { DECIMAL_INPUT_PATTERN, SIGNED_DECIMAL_INPUT_PATTERN } from "@/lib/constants/ui";
import type { DecimalTextFieldProps } from "@/lib/interfaces/ui";

function textFor(value: number | null): string {
  return value == null || Number.isNaN(value) ? "" : String(value);
}

function valueOf(text: string): number | null {
  return text === "" || text === "." || text === "-" || text === "-." ? null : Number(text);
}

export function DecimalTextField({ value, onChange, allowsNegative = false, ...props }: DecimalTextFieldProps) {
  const [text, setText] = useState(textFor(value));
  const pattern = allowsNegative ? SIGNED_DECIMAL_INPUT_PATTERN : DECIMAL_INPUT_PATTERN;

  useEffect(() => {
    setText((current) => (current !== "" && valueOf(current) === value ? current : textFor(value)));
  }, [value]);

  return (
    <TextField
      {...props}
      keyboardType={allowsNegative ? (Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric") : "decimal-pad"}
      returnKeyType="done"
      value={text}
      onChangeText={(raw) => {
        const next = raw.replace(",", ".");
        if (!pattern.test(next)) return;
        setText(next);
        onChange(valueOf(next));
      }}
    />
  );
}
