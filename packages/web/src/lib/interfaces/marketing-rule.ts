import type { ReactNode } from "react";

export interface MarketingRuleProps {
  lead: string;
  label?: string;
  aside?: ReactNode;
  className?: string;
}

export interface MarketingSectionHeaderProps {
  step: string;
  eyebrow: string;
  heading: string;
  subtitle: string;
}

export interface MarketingStepProps {
  step: string;
}
