import { EmptyState } from "@/components/empty-state";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrgProfileReorderButtons } from "@/features/org-profile/components/org-profile-reorder-buttons";
import {
  DEFAULT_ORG_PROFILE_LINK_KIND,
  ORG_PROFILE_LINK_KIND_ICONS,
} from "@/lib/constants/org-profile";
import type { OrgProfileEditorSectionProps } from "@/lib/interfaces/org-profile";
import {
  ORG_PROFILE_LINK_KINDS,
  ORG_PROFILE_LINK_LABEL_MAX_LENGTH,
  ORG_PROFILE_LINK_URL_MAX_LENGTH,
  ORG_PROFILE_LINKS_MAX,
  type OrgProfileLinkKind,
} from "@magic-vault/shared";
import { IconLink, IconPlus } from "@tabler/icons-react";
import { useId } from "react";
import { Controller, useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function OrgProfileLinksSection({ form, control, disabled }: OrgProfileEditorSectionProps) {
  const { t } = useTranslation("org-profile");
  const idPrefix = useId();
  const { fields, append, remove, move } = useFieldArray({ control, name: "links" });
  const linkErrors = form.formState.errors.links;
  const isFull = fields.length >= ORG_PROFILE_LINKS_MAX;

  return (
    <SettingsSection
      heading={t("links.heading")}
      description={t("links.description", { max: ORG_PROFILE_LINKS_MAX })}
      action={
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isFull}
          onClick={() => append({ kind: DEFAULT_ORG_PROFILE_LINK_KIND, url: "", label: "" })}
        >
          <IconPlus />
          {t("links.add")}
        </Button>
      }
    >
      {fields.length === 0 ? (
        <EmptyState size="compact" icon={IconLink} title={t("links.empty")} />
      ) : (
        <ol className="flex flex-col divide-y divide-border">
          {fields.map((field, index) => {
            const position = t("links.position", { position: index + 1 });
            const errors = linkErrors?.[index];
            return (
              <li
                key={field.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 md:py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground/70">{position}</span>
                  <OrgProfileReorderButtons
                    itemLabel={position}
                    index={index}
                    count={fields.length}
                    disabled={disabled}
                    onMove={move}
                    onRemove={() => remove(index)}
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,12rem)]">
                  <Controller
                    control={control}
                    name={`links.${index}.kind`}
                    render={({ field: kindField }) => {
                      const KindIcon = ORG_PROFILE_LINK_KIND_ICONS[kindField.value];
                      return (
                        <Field>
                          <FieldLabel htmlFor={`${idPrefix}-kind-${index}`}>
                            {t("links.kindLabel")}
                          </FieldLabel>
                          <Select
                            value={kindField.value}
                            disabled={disabled}
                            onValueChange={(kind) =>
                              kind && kindField.onChange(kind as OrgProfileLinkKind)
                            }
                          >
                            <SelectTrigger id={`${idPrefix}-kind-${index}`} className="w-full">
                              <SelectValue>
                                <KindIcon aria-hidden />
                                {t(`kinds.${kindField.value}`)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {ORG_PROFILE_LINK_KINDS.map((kind) => {
                                const OptionIcon = ORG_PROFILE_LINK_KIND_ICONS[kind];
                                return (
                                  <SelectItem key={kind} value={kind}>
                                    <OptionIcon aria-hidden />
                                    {t(`kinds.${kind}`)}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </Field>
                      );
                    }}
                  />
                  <Field data-invalid={!!errors?.url}>
                    <FieldLabel htmlFor={`${idPrefix}-url-${index}`}>
                      {t("links.urlLabel")}
                    </FieldLabel>
                    <Input
                      id={`${idPrefix}-url-${index}`}
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={t("links.urlPlaceholder")}
                      maxLength={ORG_PROFILE_LINK_URL_MAX_LENGTH}
                      aria-invalid={!!errors?.url}
                      disabled={disabled}
                      {...form.register(`links.${index}.url`)}
                    />
                    <FieldError errors={[errors?.url]} />
                  </Field>
                  <Field data-invalid={!!errors?.label}>
                    <FieldLabel htmlFor={`${idPrefix}-label-${index}`}>
                      {t("links.labelLabel")}
                    </FieldLabel>
                    <Input
                      id={`${idPrefix}-label-${index}`}
                      placeholder={t("links.labelPlaceholder")}
                      maxLength={ORG_PROFILE_LINK_LABEL_MAX_LENGTH}
                      aria-invalid={!!errors?.label}
                      disabled={disabled}
                      {...form.register(`links.${index}.label`)}
                    />
                    <FieldError errors={[errors?.label]} />
                  </Field>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </SettingsSection>
  );
}
