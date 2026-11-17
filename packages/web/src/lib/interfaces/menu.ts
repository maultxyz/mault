import type { Ref } from "react";

export interface MenuSearchFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  inputRef: Ref<HTMLInputElement>;
}
