import { ERROR_TOAST_DURATION_MS } from "@/lib/constants/toast";
import { isValidElement, type ReactNode } from "react";
import { toast as sonnerToast } from "sonner";
import type { ToastMessage, ToastData } from "@/lib/interfaces/toast";

function toPlainText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toPlainText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return toPlainText(node.props.children);
  }
  return "";
}

function resolve(value: ToastMessage | NonNullable<ToastData>["description"]): string {
  return toPlainText(typeof value === "function" ? value() : value).trim();
}

function notifyDesktop(message: ToastMessage, data?: ToastData) {
  const desktop = window.maultDesktop;
  if (!desktop) return;
  const title = resolve(message);
  if (!title) return;
  const body = resolve(data?.description);
  desktop.notify({ title, body: body || undefined });
}

function error(message: ToastMessage, data?: ToastData) {
  notifyDesktop(message, data);
  return sonnerToast.error(message, {
    duration: ERROR_TOAST_DURATION_MS,
    ...data,
  });
}

function warning(message: ToastMessage, data?: ToastData) {
  notifyDesktop(message, data);
  return sonnerToast.warning(message, data);
}

export const toast: typeof sonnerToast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  sonnerToast,
  { error, warning },
);
