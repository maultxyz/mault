import type { FieldControlState } from "@/lib/interfaces/field-control";
import { createContext, useContext } from "react";

export const FieldControlContext = createContext<FieldControlState | null>(
  null,
);

export function useFieldControlAttributes() {
  const fieldControl = useContext(FieldControlContext);
  if (!fieldControl?.isInvalid) return {};
  return {
    "aria-invalid": true,
    "aria-describedby": fieldControl.errorId,
  } as const;
}
