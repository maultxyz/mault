import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ConditionRow } from "@/features/bins/components/condition-row";
import type { RuleGroupEditorProps } from "@/features/bins/types";
import { BinCondition, BinRuleGroup, isRuleGroup } from "@magic-vault/shared";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

function createCondition(): BinCondition {
  return {
    id: crypto.randomUUID(),
    field: "rarity",
    operator: "in",
    value: [],
  };
}

function createGroup(): BinRuleGroup {
  return {
    id: crypto.randomUUID(),
    combinator: "and",
    conditions: [createCondition()],
  };
}

export function RuleGroupEditor({
  group,
  onChange,
  onRemove,
  depth = 0,
}: RuleGroupEditorProps) {
  const { t } = useTranslation("bins");
  const updateCondition = useCallback(
    (index: number, updated: BinCondition | BinRuleGroup) => {
      const newConditions = [...group.conditions];
      newConditions[index] = updated;
      onChange({ ...group, conditions: newConditions });
    },
    [group, onChange],
  );

  const removeCondition = useCallback(
    (index: number) => {
      const newConditions = group.conditions.filter((_, i) => i !== index);
      onChange({ ...group, conditions: newConditions });
    },
    [group, onChange],
  );

  const addCondition = useCallback(() => {
    onChange({
      ...group,
      conditions: [...group.conditions, createCondition()],
    });
  }, [group, onChange]);

  const addGroup = useCallback(() => {
    onChange({
      ...group,
      conditions: [...group.conditions, createGroup()],
    });
  }, [group, onChange]);

  const toggleCombinator = useCallback(
    (combinator: "and" | "or") => {
      onChange({ ...group, combinator });
    },
    [group, onChange],
  );

  return (
    <div
      className={`flex flex-col gap-2 ${depth > 0 ? "rounded-lg border border-dashed p-2.5" : ""}`}
    >
      <div className="flex items-center gap-2">
        <ButtonGroup>
          <Button
            type="button"
            size="sm"
            variant={group.combinator === "and" ? "secondary" : "outline"}
            onClick={() => toggleCombinator("and")}
          >
            {t("ruleGroupEditor.and")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={group.combinator === "or" ? "secondary" : "outline"}
            onClick={() => toggleCombinator("or")}
          >
            {t("ruleGroupEditor.or")}
          </Button>
        </ButtonGroup>

        {onRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
            <IconTrash />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 pl-4">
        {group.conditions.map((item, index) =>
          isRuleGroup(item) ? (
            <RuleGroupEditor
              key={item.id}
              group={item}
              onChange={(updated) => updateCondition(index, updated)}
              onRemove={() => removeCondition(index)}
              depth={depth + 1}
            />
          ) : (
            <ConditionRow
              key={item.id}
              condition={item}
              onChange={(updated) => updateCondition(index, updated)}
              onRemove={() => removeCondition(index)}
            />
          ),
        )}
        {group.conditions.length === 0 && (
          <p className="text-muted-foreground py-1.5 rounded-lg border px-3 text-sm bg-sidebar">
            {t("ruleGroupEditor.emptyState")}
          </p>
        )}
      </div>

      <ButtonGroup className="ml-4">
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={addCondition}
        >
          <IconPlus /> {t("ruleGroupEditor.addCondition")}
        </Button>
        {depth < 2 && (
          <Button size="sm" type="button" variant="outline" onClick={addGroup}>
            <IconPlus /> {t("ruleGroupEditor.addGroup")}
          </Button>
        )}
      </ButtonGroup>
    </div>
  );
}
