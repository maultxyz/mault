import type { SettingsSectionLayout } from "@/lib/interfaces/settings-section";
import { createContext } from "react";

export const SettingsSectionLayoutContext =
  createContext<SettingsSectionLayout>("card");
