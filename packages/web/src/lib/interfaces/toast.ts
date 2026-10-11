import type { toast as sonnerToast } from "sonner";

export type ToastMessage = Parameters<typeof sonnerToast.error>[0];

export type ToastData = Parameters<typeof sonnerToast.error>[1];
