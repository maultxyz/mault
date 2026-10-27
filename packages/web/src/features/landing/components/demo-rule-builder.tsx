import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEMO_SCANNED_CARDS } from "@/features/landing/lib/demo-cards";
import { cardMatchesDemoRule } from "@/features/landing/lib/demo-rule-matching";
import {
  DEMO_RULE_ADDED_CONDITION,
  DEMO_RULE_FIELDS,
  DEMO_RULE_INITIAL_CONDITIONS,
  DEMO_RULE_MATCH_BIN,
  DEMO_RULE_MAX_CONDITIONS,
  DEMO_RULE_OPERATORS,
} from "@/lib/constants/landing";
import type {
  DemoRuleCondition,
  DemoRuleConditionRowProps,
  DemoRuleFieldName,
  DemoRuleOperator,
} from "@/lib/interfaces/landing";
import { cn } from "@/lib/utils";
import { IconArrowDown, IconPlus, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function DemoConditionRow({
  condition,
  canRemove,
  onChange,
  onRemove,
}: DemoRuleConditionRowProps) {
  return (
    <div className="flex items-center gap-1.5 sm:flex-wrap">
      <Select
        value={condition.field}
        onValueChange={(field) =>
          field &&
          onChange({
            ...condition,
            field: field as DemoRuleFieldName,
            value: DEMO_RULE_FIELDS[field as DemoRuleFieldName].values[0],
          })
        }
      >
        <SelectTrigger className="min-w-0 flex-1 max-sm:px-3 sm:min-w-24 sm:flex-none">
          <SelectValue>{condition.field}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.keys(DEMO_RULE_FIELDS).map((field) => (
            <SelectItem key={field} value={field}>
              {field}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={condition.operator}
        onValueChange={(operator) =>
          operator &&
          onChange({ ...condition, operator: operator as DemoRuleOperator })
        }
      >
        <SelectTrigger className="shrink-0 max-sm:px-3 sm:min-w-20">
          <SelectValue>{condition.operator}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DEMO_RULE_OPERATORS.map((operator) => (
            <SelectItem key={operator} value={operator}>
              {operator}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={condition.value}
        onValueChange={(value) => value && onChange({ ...condition, value })}
      >
        <SelectTrigger className="min-w-0 flex-1 max-sm:px-3 sm:min-w-24">
          <SelectValue>{condition.value}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DEMO_RULE_FIELDS[condition.field].values.map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 max-sm:size-8"
        disabled={!canRemove}
        onClick={onRemove}
      >
        <IconX />
      </Button>
    </div>
  );
}

export function DemoRuleBuilder() {
  const { t } = useTranslation("bins");
  const { t: tLanding } = useTranslation("landing");
  const [combinator, setCombinator] = useState<"and" | "or">("or");
  const [conditions, setConditions] = useState<DemoRuleCondition[]>(
    DEMO_RULE_INITIAL_CONDITIONS,
  );

  const matchingCardIds = new Set(
    DEMO_SCANNED_CARDS.filter(({ card }) =>
      cardMatchesDemoRule(card, conditions, combinator),
    ).map(({ card }) => card.id),
  );

  const updateCondition = (index: number, condition: DemoRuleCondition) =>
    setConditions((current) =>
      current.map((existing, i) => (i === index ? condition : existing)),
    );

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <ButtonGroup>
          {(["and", "or"] as const).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={combinator === option ? "outline-selected" : "outline"}
              onClick={() => setCombinator(option)}
            >
              {t(option)}
            </Button>
          ))}
        </ButtonGroup>
        {conditions.map((condition, index) => (
          <DemoConditionRow
            key={index}
            condition={condition}
            canRemove={conditions.length > 1}
            onChange={(updated) => updateCondition(index, updated)}
            onRemove={() =>
              setConditions((current) => current.filter((_, i) => i !== index))
            }
          />
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="self-start"
          disabled={conditions.length >= DEMO_RULE_MAX_CONDITIONS}
          onClick={() =>
            setConditions((current) => [...current, DEMO_RULE_ADDED_CONDITION])
          }
        >
          <IconPlus /> {t("ruleGroupEditor.addCondition")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <IconArrowDown className="size-4 text-primary" />
          {tLanding("features.demo.ruleMatches", {
            count: matchingCardIds.size,
            bin: DEMO_RULE_MATCH_BIN,
          })}
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {DEMO_SCANNED_CARDS.map(({ card }) => {
            const isMatch = matchingCardIds.has(card.id);
            return (
              <img
                key={card.id}
                src={card.image?.small ?? ""}
                alt={card.name}
                title={card.name}
                className={cn(
                  "aspect-5/7 w-full rounded-sm object-cover transition-all duration-500 motion-reduce:transition-none",
                  isMatch
                    ? "-translate-y-1.5 ring-2 ring-primary"
                    : "scale-90 opacity-35 grayscale",
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
