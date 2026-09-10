import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconPlus, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const FIELD_OPTIONS = ["Rarity", "Color", "Set", "Type"];
const OPERATOR_OPTIONS = ["is", "is not", "includes"];

// A read-only stand-in for features/bins/components/condition-row.tsx,
// reusing the same Select/Button primitives - the real row pulls its field
// definitions from useBinConfigs/useCollections, which need the
// QueryClientProvider tree that only wraps the authenticated /app/* routes,
// not this public marketing page.
function DemoConditionRow({
  field,
  operator,
  value,
  valueOptions,
}: {
  field: string;
  operator: string;
  value: string;
  valueOptions: string[];
}) {
  const [f, setF] = useState(field);
  const [op, setOp] = useState(operator);
  const [val, setVal] = useState(value);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Select value={f} onValueChange={(v) => v && setF(v)}>
        <SelectTrigger className="min-w-24">
          <SelectValue>{f}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {FIELD_OPTIONS.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={op} onValueChange={(v) => v && setOp(v)}>
        <SelectTrigger className="min-w-20">
          <SelectValue>{op}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {OPERATOR_OPTIONS.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={val} onValueChange={(v) => v && setVal(v)}>
        <SelectTrigger className="min-w-20 flex-1">
          <SelectValue>{val}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {valueOptions.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon" className="shrink-0">
        <IconX />
      </Button>
    </div>
  );
}

export function DemoRuleBuilder() {
  const { t } = useTranslation("bins");
  const [combinator, setCombinator] = useState<"and" | "or">("and");

  return (
    <div className="flex flex-col gap-2">
      <ButtonGroup>
        <Button
          type="button"
          size="sm"
          variant={combinator === "and" ? "secondary" : "outline"}
          onClick={() => setCombinator("and")}
        >
          {t("ruleGroupEditor.and")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={combinator === "or" ? "secondary" : "outline"}
          onClick={() => setCombinator("or")}
        >
          {t("ruleGroupEditor.or")}
        </Button>
      </ButtonGroup>

      <div className="flex flex-col gap-2">
        <DemoConditionRow
          field="Rarity"
          operator="is"
          value="Mythic"
          valueOptions={["Common", "Uncommon", "Rare", "Mythic"]}
        />
        <DemoConditionRow
          field="Color"
          operator="includes"
          value="Red"
          valueOptions={["White", "Blue", "Black", "Red", "Green"]}
        />
      </div>

      <Button type="button" size="sm" variant="outline" className="self-start">
        <IconPlus /> {t("ruleGroupEditor.addCondition")}
      </Button>
    </div>
  );
}
