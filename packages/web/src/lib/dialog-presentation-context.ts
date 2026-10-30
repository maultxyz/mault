import type { DialogPresentation } from "@/lib/interfaces/dialog";
import { createContext } from "react";

export const DialogPresentationContext =
  createContext<DialogPresentation>("dialog");
