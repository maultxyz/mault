import type { ReactNode } from "react";

export interface SliderFieldProps {
  label: ReactNode;
  valueLabel: ReactNode;
  description?: ReactNode;
  min: number;
  max: number;
  step?: number;
  value: number;
  disabled?: boolean;
  onValueChange: (value: number) => void;
  onValueCommitted?: (value: number) => void;
  className?: string;
  children?: ReactNode;
}

export interface RawStepperRowProps {
  value: number;
  min: number;
  max?: number;
  bigStep: number;
  smallStep: number;
  disabled: boolean;
  onChange: (value: number) => void;
  valueLabel: ReactNode;
}
