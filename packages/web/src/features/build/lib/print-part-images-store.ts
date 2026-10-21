import type { PrintPartImagesState } from "@/lib/interfaces/build";

let state: PrintPartImagesState = { status: "loading", images: {} };
const listeners = new Set<() => void>();

function publish(next: PrintPartImagesState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export const printPartImagesStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
  setImages: (images: PrintPartImagesState["images"]) =>
    publish({ status: "ready", images }),
  setError: () => publish({ status: "error", images: {} }),
};
