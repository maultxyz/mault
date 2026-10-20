import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CONDITION_NUMERIC_MAX,
  CONDITION_STRING_MAX_LENGTH,
  COUNT_OPERATORS,
  isScanRuleField,
  type BinCondition,
  type ConditionOperator,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-row";
import { SearchInput } from "@/components/ui/search-input";
import { defaultValueFor, isConditionComplete, isMultiValue, needsValue, sortFields } from "@/features/rules/lib/rules";
import { useTheme } from "@/hooks/use-theme";
import { CONDITION_SHEET_MAX_HEIGHT_RATIO, NUMERIC_INPUT_PATTERN } from "@/lib/constants/rules";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { ConditionSheetProps, ConditionSheetStep } from "@/lib/interfaces/rules";

export function ConditionSheet({
  condition,
  isNew,
  fieldDefinitions,
  freeformOptions,
  onSave,
  onRemove,
  onClose,
}: ConditionSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [draft, setDraft] = useState<BinCondition | null>(condition);
  const [step, setStep] = useState<ConditionSheetStep>(isNew ? "field" : "details");
  const [fieldQuery, setFieldQuery] = useState("");
  const [freeformText, setFreeformText] = useState("");
  const [numericText, setNumericText] = useState("");

  useEffect(() => {
    setDraft(condition);
    setStep(isNew ? "field" : "details");
    setFieldQuery("");
    setFreeformText(condition && Array.isArray(condition.value) ? condition.value.join(", ") : "");
    setNumericText(condition && !Array.isArray(condition.value) ? String(condition.value) : "");
  }, [condition, isNew]);

  const fields = useMemo(() => sortFields(fieldDefinitions), [fieldDefinitions]);
  const query = fieldQuery.trim().toLowerCase();
  const shownFields = query ? fields.filter((f) => f.label.toLowerCase().includes(query)) : fields;
  const meta = draft ? fieldDefinitions.find((f) => f.field === draft.field) : undefined;
  const multi = draft ? isMultiValue(meta, draft.operator) : false;
  const count = !!draft && COUNT_OPERATORS.includes(draft.operator);
  const options = meta && (meta.type === "enum" || meta.type === "set") ? (meta.options ?? null) : null;
  const freeform = !!draft && freeformOptions && !isScanRuleField(draft.field, fieldDefinitions);
  const sortedOptions = useMemo(() => (options ? [...options].sort((a, b) => a.label.localeCompare(b.label)) : []), [options]);
  const values = draft && Array.isArray(draft.value) ? draft.value : [];

  const chooseField = (field: string) => {
    if (!draft) return;
    const nextMeta = fieldDefinitions.find((f) => f.field === field);
    const operator: ConditionOperator = nextMeta?.operators[0]?.value ?? "equals";
    setFreeformText("");
    setNumericText("");
    setDraft({ ...draft, field, operator, value: defaultValueFor(nextMeta, operator) });
    setStep("details");
  };

  const chooseOperator = (operator: ConditionOperator) => {
    if (!draft) return;
    const switchesShape = isMultiValue(meta, operator) !== multi || COUNT_OPERATORS.includes(operator) !== count;
    if (switchesShape) {
      setFreeformText("");
      setNumericText("");
    }
    setDraft({ ...draft, operator, value: switchesShape ? defaultValueFor(meta, operator) : draft.value });
  };

  const toggleOption = (value: string) => {
    if (!draft) return;
    if (multi) {
      setDraft({ ...draft, value: values.includes(value) ? values.filter((v) => v !== value) : [...values, value] });
      return;
    }
    setDraft({ ...draft, value });
  };

  const renderValue = () => {
    if (!draft || !meta || !needsValue(draft.operator)) return null;
    if (options && freeform && multi && !count) {
      return (
        <Input
          accessibilityLabel={meta.label}
          value={freeformText}
          placeholder={t("rules.freeformPlaceholder")}
          onChangeText={(text) => {
            setFreeformText(text);
            setDraft({
              ...draft,
              value: text
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean),
            });
          }}
        />
      );
    }
    if (options && !freeform && !count) {
      return (
        <View style={{ marginHorizontal: -SPACING.sm }}>
          {sortedOptions.map((option) => (
            <ListRow
              key={option.value}
              title={option.label}
              selected={multi ? values.includes(option.value) : String(draft.value) === option.value}
              onPress={() => toggleOption(option.value)}
            />
          ))}
        </View>
      );
    }
    if (meta.type === "numeric" || count) {
      return (
        <Input
          accessibilityLabel={meta.label}
          keyboardType="decimal-pad"
          placeholder="0"
          value={numericText}
          onChangeText={(raw) => {
            const text = raw.replace(",", ".");
            if (text !== "" && !NUMERIC_INPUT_PATTERN.test(text)) return;
            setNumericText(text);
            const parsed = Number(text);
            setDraft({
              ...draft,
              value: text === "" || text === "." || text === "-" ? "" : Math.min(parsed, CONDITION_NUMERIC_MAX),
            });
          }}
        />
      );
    }
    return (
      <Input
        accessibilityLabel={meta.label}
        maxLength={CONDITION_STRING_MAX_LENGTH}
        placeholder={t("rules.valuePlaceholder")}
        value={String(draft.value)}
        onChangeText={(text) => setDraft({ ...draft, value: text })}
      />
    );
  };

  const title = step === "field" ? t("rules.chooseField") : isNew ? t("rules.newCondition") : t("rules.editCondition");

  return (
    <Modal visible={!!condition} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel={t("common.dismiss")} onPress={onClose} style={{ flex: 1, backgroundColor: colors.overlay }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View
          style={{
            maxHeight: windowHeight * CONDITION_SHEET_MAX_HEIGHT_RATIO,
            minHeight: Math.min(windowHeight * 0.5, 420),
            backgroundColor: colors.background,
            borderTopLeftRadius: RADIUS.xl,
            borderTopRightRadius: RADIUS.xl,
            paddingBottom: insets.bottom + SPACING.md,
          }}
        >
          <View style={{ alignItems: "center", paddingTop: SPACING.sm }}>
            <View style={{ width: 36, height: 4, borderRadius: RADIUS.full, backgroundColor: colors.border }} />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING.sm,
              paddingHorizontal: SCREEN_GUTTER,
              paddingVertical: SPACING.md,
            }}
          >
            {step === "field" && !isNew ? (
              <IconButton icon="back" size={36} accessibilityLabel={t("common.back")} onPress={() => setStep("details")} />
            ) : null}
            <AppText size="lg" heading weight="bold" style={{ flex: 1 }}>
              {title}
            </AppText>
            {onRemove && step === "details" ? (
              <IconButton icon="trash" size={36} variant="plain" accessibilityLabel={t("rules.removeCondition")} onPress={onRemove} />
            ) : null}
            <IconButton icon="dismiss" size={36} accessibilityLabel={t("common.dismiss")} onPress={onClose} />
          </View>

          {step === "field" ? (
            <View style={{ flexShrink: 1, gap: SPACING.sm }}>
              <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
                <SearchInput
                  value={fieldQuery}
                  onChangeText={setFieldQuery}
                  placeholder={t("rules.searchFields")}
                  accessibilityLabel={t("rules.searchFields")}
                />
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER - SPACING.sm }}>
                {shownFields.map((field) => (
                  <ListRow
                    key={field.field}
                    title={field.label}
                    selected={!isNew && draft?.field === field.field ? true : undefined}
                    onPress={() => chooseField(field.field)}
                  />
                ))}
                {shownFields.length === 0 ? (
                  <AppText tone="secondary" style={{ padding: SPACING.sm }}>
                    {t("rules.noFieldMatches")}
                  </AppText>
                ) : null}
              </ScrollView>
            </View>
          ) : draft ? (
            <>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ flexShrink: 1 }}
                contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: SPACING.lg, paddingBottom: SPACING.lg }}
              >
                <View style={{ marginHorizontal: -SPACING.sm }}>
                  <ListRow title={t("rules.field")} value={meta?.label ?? draft.field} onPress={() => setStep("field")} />
                </View>
                {meta ? (
                  <View style={{ gap: SPACING.sm }}>
                    <AppText size="sm" tone="secondary" weight="medium">
                      {t("rules.operator")}
                    </AppText>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
                      {meta.operators.map((op) => {
                        const active = op.value === draft.operator;
                        return (
                          <Pressable
                            key={op.value}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: active }}
                            onPress={() => chooseOperator(op.value)}
                            style={({ pressed }) => ({
                              paddingHorizontal: SPACING.md + 2,
                              height: 34,
                              justifyContent: "center",
                              borderRadius: RADIUS.full,
                              backgroundColor: active ? colors.foreground : pressed ? colors.border : colors.muted,
                            })}
                          >
                            <AppText size="sm" weight="medium" style={{ color: active ? colors.background : colors.foreground }}>
                              {op.label}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
                {meta && needsValue(draft.operator) ? (
                  <View style={{ gap: SPACING.sm }}>
                    <AppText size="sm" tone="secondary" weight="medium">
                      {t("rules.value")}
                    </AppText>
                    {renderValue()}
                  </View>
                ) : null}
              </ScrollView>
              <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.sm }}>
                <Button size="lg" label={t("common.done")} disabled={!isConditionComplete(draft)} onPress={() => onSave(draft)} />
              </View>
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
