import type { ReactNode } from "react";
import type { toast as sonnerToast } from "sonner";

export type ToastMessage = Parameters<typeof sonnerToast.error>[0];

export type ToastData = Parameters<typeof sonnerToast.error>[1];

export type AppToast = typeof sonnerToast;

export interface StationToastTitleProps {
  stationName: string;
  children: ReactNode;
}
