import type { Icon } from "@tabler/icons-react";

export type SelfHostHost = "compose" | "coolify" | "pi";

export type SelfHostAuth = "local" | "neon";

export type SelfHostSorter = "usb" | "gpio";

export type SelfHostBoard = "raspberry-pi" | "orange-pi-zero4";

export interface SelfHostSetupState {
  host: SelfHostHost;
  auth: SelfHostAuth;
  sorter: SelfHostSorter;
  board: SelfHostBoard;
}

export interface SelfHostSetupValue extends SelfHostSetupState {
  updateSetup: (patch: Partial<SelfHostSetupState>) => void;
}

export interface SelfHostCondition {
  host?: SelfHostHost | readonly SelfHostHost[];
  auth?: SelfHostAuth;
  sorter?: SelfHostSorter;
  board?: SelfHostBoard;
}

export interface SelfHostStep {
  key: string;
  code?: string;
  hasNote?: boolean;
  when?: SelfHostCondition;
}

export interface SelfHostSection {
  key: string;
  steps: SelfHostStep[];
  when?: SelfHostCondition;
}

export interface SelfHostOption<T extends string> {
  value: T;
  icon: Icon;
}

export interface SelfHostSectionProps {
  section: SelfHostSection;
  step: string;
  checked: Record<string, boolean>;
  toggle: (key: string) => void;
}
