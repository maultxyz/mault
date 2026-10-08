import type { BinRuleGroup } from "@magic-vault/shared";
import type { Control } from "react-hook-form";

export interface RuleDialogFormBase {
  isEnabled: boolean;
  rules: BinRuleGroup;
}

export interface RuleDialogFieldsLabels {
  enabled: string;
  conditions: string;
  cancel: string;
  save: string;
}

export interface RuleDialogFieldsProps<T extends RuleDialogFormBase> {
  control: Control<T>;
  rulesError?: { message?: string };
  isPending: boolean;
  labels: RuleDialogFieldsLabels;
}
