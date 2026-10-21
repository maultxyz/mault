import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

export type SelfHostHost = "compose" | "coolify";

export type SelfHostAuth = "local" | "neon";

export interface SelfHostSetupState {
  host: SelfHostHost;
  auth: SelfHostAuth;
}

export interface SelfHostSetupValue extends SelfHostSetupState {
  updateSetup: (patch: Partial<SelfHostSetupState>) => void;
}

export interface SelfHostCondition {
  host?: SelfHostHost;
  auth?: SelfHostAuth;
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

export interface SelfHostSetupStepProps {
  step: number;
  label: string;
  children: ReactNode;
}

export interface SelfHostCodeBlockProps {
  code: string;
}

export interface SelfHostHeroProps {
  sections: SelfHostSection[];
  checked: Record<string, boolean>;
}
