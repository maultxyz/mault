import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { formatRuleGroup } from "@/features/bins/lib/rule-format";
import { BinRuleGroup } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function RuleSummary({ rules }: { rules: BinRuleGroup }) {
  const { t } = useTranslation("bins");
  const { ruleFieldDefinitions } = useBinConfigs();
  const text = formatRuleGroup(rules, ruleFieldDefinitions, t);

  return (
    <p className="text-xs line-clamp-3 wrap-break-words text-foreground/70 truncate">
      {text}
    </p>
  );
}
