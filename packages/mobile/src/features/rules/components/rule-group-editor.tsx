import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { isRuleGroup, type BinCondition, type BinRuleGroup } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { OptionSheet } from "@/components/ui/option-sheet";
import { ConditionRow } from "@/features/rules/components/condition-row";
import { ConditionSheet } from "@/features/rules/components/condition-sheet";
import { createCondition, createGroup } from "@/features/rules/lib/rules";
import { useTheme } from "@/hooks/use-theme";
import { MAX_RULE_GROUP_DEPTH } from "@/lib/constants/rules";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { ConditionEditTarget, RuleGroupEditorProps } from "@/lib/interfaces/rules";

export function RuleGroupEditor({
  group,
  onChange,
  onRemove,
  depth = 0,
  fieldDefinitions,
  freeformOptions,
  disabled = false,
}: RuleGroupEditorProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [combinatorOpen, setCombinatorOpen] = useState(false);
  const [editing, setEditing] = useState<{ target: ConditionEditTarget; condition: BinCondition } | null>(null);
  const nested = depth > 0;
  const cardColor = nested ? colors.background : colors.muted;

  const update = (index: number, next: BinCondition | BinRuleGroup) => {
    const conditions = [...group.conditions];
    conditions[index] = next;
    onChange({ ...group, conditions });
  };
  const remove = (index: number) => onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== index) });

  const saveCondition = (condition: BinCondition) => {
    if (!editing) return;
    if (editing.target.kind === "new") onChange({ ...group, conditions: [...group.conditions, condition] });
    else update(editing.target.index, condition);
    setEditing(null);
  };

  return (
    <View style={{ gap: SPACING.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
        <AppText size="base" weight="medium">
          {t("rules.matchPrefix")}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("rules.combinatorTitle")}
          disabled={disabled}
          onPress={() => setCombinatorOpen(true)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING.xs,
            height: 32,
            paddingHorizontal: SPACING.md,
            borderRadius: RADIUS.full,
            backgroundColor: pressed ? colors.border : nested ? colors.background : colors.muted,
          })}
        >
          <AppText size="base" weight="bold">
            {group.combinator === "and" ? t("rules.combinatorAll") : t("rules.combinatorAny")}
          </AppText>
          {!disabled ? <Icon name="expand" size={14} color={colors.foreground} /> : null}
        </Pressable>
        <AppText size="base" weight="medium" style={{ flex: 1 }}>
          {t("rules.matchSuffix")}
        </AppText>
        {onRemove && !disabled ? (
          <IconButton icon="trash" size={32} variant="plain" accessibilityLabel={t("rules.removeGroup")} onPress={onRemove} />
        ) : null}
      </View>

      <View style={{ borderRadius: RADIUS.lg, backgroundColor: cardColor, overflow: "hidden" }}>
        {group.conditions.map((item, index) => (
          <View key={item.id} style={index > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined}>
            {isRuleGroup(item) ? (
              <View style={{ padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <RuleGroupEditor
                  group={item}
                  depth={depth + 1}
                  fieldDefinitions={fieldDefinitions}
                  freeformOptions={freeformOptions}
                  disabled={disabled}
                  onChange={(next) => update(index, next)}
                  onRemove={() => remove(index)}
                />
              </View>
            ) : (
              <ConditionRow
                condition={item}
                fieldDefinitions={fieldDefinitions}
                disabled={disabled}
                onPress={() => setEditing({ target: { kind: "edit", index }, condition: item })}
              />
            )}
          </View>
        ))}
        {group.conditions.length === 0 ? (
          <AppText tone="secondary" style={{ padding: SPACING.md }}>
            {t("rules.noConditionsYet")}
          </AppText>
        ) : null}
      </View>

      {!disabled ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
          <Button
            size="sm"
            variant="secondary"
            icon="plus"
            label={t("rules.addCondition")}
            onPress={() => setEditing({ target: { kind: "new" }, condition: createCondition(fieldDefinitions) })}
          />
          {depth < MAX_RULE_GROUP_DEPTH ? (
            <Button
              size="sm"
              variant="secondary"
              icon="group"
              label={t("rules.addGroup")}
              onPress={() => onChange({ ...group, conditions: [...group.conditions, createGroup(fieldDefinitions)] })}
            />
          ) : null}
        </View>
      ) : null}

      <OptionSheet
        visible={combinatorOpen}
        title={t("rules.combinatorTitle")}
        options={[
          { value: "and", label: t("rules.combinatorAllOption") },
          { value: "or", label: t("rules.combinatorAnyOption") },
        ]}
        selected={[group.combinator]}
        onSelect={(value) => {
          setCombinatorOpen(false);
          onChange({ ...group, combinator: value === "or" ? "or" : "and" });
        }}
        onClose={() => setCombinatorOpen(false)}
      />
      <ConditionSheet
        condition={editing?.condition ?? null}
        isNew={editing?.target.kind === "new"}
        fieldDefinitions={fieldDefinitions}
        freeformOptions={freeformOptions}
        onSave={saveCondition}
        onRemove={
          editing?.target.kind === "edit"
            ? () => {
                const target = editing.target;
                if (target.kind === "edit") remove(target.index);
                setEditing(null);
              }
            : undefined
        }
        onClose={() => setEditing(null)}
      />
    </View>
  );
}
