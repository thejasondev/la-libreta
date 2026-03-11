import { atom } from "nanostores";

export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}

export const $toasts = atom<Toast[]>([]);

let toastCounter = 0;

export function showToast(
  message: string,
  type: Toast["type"] = "info",
  duration = 3500,
) {
  const id = `toast-${++toastCounter}-${Date.now()}`;
  const toast: Toast = { id, type, message, duration };

  $toasts.set([...$toasts.get(), toast]);

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }
}

export function dismissToast(id: string) {
  $toasts.set($toasts.get().filter((t) => t.id !== id));
}
