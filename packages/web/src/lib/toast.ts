import { ERROR_TOAST_DURATION_MS } from "@/lib/constants/toast";
import { toast as sonnerToast } from "sonner";

type ToastMessage = Parameters<typeof sonnerToast.error>[0];
type ToastData = Parameters<typeof sonnerToast.error>[1];

function error(message: ToastMessage, data?: ToastData) {
  return sonnerToast.error(message, {
    duration: ERROR_TOAST_DURATION_MS,
    ...data,
  });
}

export const toast: typeof sonnerToast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  sonnerToast,
  { error },
);
