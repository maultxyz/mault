import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Switch } from "@/components/ui/switch";
import { FeatureHighlightSlideFields } from "@/features/feature-highlights/components/feature-highlight-slide-fields";
import { FeatureHighlightsPreview } from "@/features/feature-highlights/components/feature-highlights-preview";
import { featureHighlightFormValuesOf } from "@/features/feature-highlights/lib/feature-highlight-slides";
import {
  EMPTY_FEATURE_HIGHLIGHT_SLIDE,
  FEATURE_HIGHLIGHT_FORM_ID,
} from "@/lib/constants/feature-highlights";
import type { FeatureHighlightFormDialogProps } from "@/lib/interfaces/feature-highlights";
import {
  featureHighlightFormSchema,
  type FeatureHighlightFormValues,
} from "@/schemas/feature-highlights.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FEATURE_HIGHLIGHT_MAX_SLIDES } from "@magic-vault/shared";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useId } from "react";
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { useTranslation } from "react-i18next";

export function FeatureHighlightFormDialog({
  open,
  onOpenChange,
  highlight,
  onSubmit,
}: FeatureHighlightFormDialogProps) {
  const { t } = useTranslation("admin");
  const idPrefix = useId();
  const form = useForm<FeatureHighlightFormValues>({
    resolver: zodResolver(featureHighlightFormSchema),
    defaultValues: featureHighlightFormValuesOf(highlight, new Date()),
  });
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;
  const slidesFieldArray = useFieldArray({ control, name: "slides" });

  useEffect(() => {
    if (open) reset(featureHighlightFormValuesOf(highlight, new Date()));
  }, [open, highlight, reset]);

  async function handleFormSubmit(values: FeatureHighlightFormValues) {
    const saved = await onSubmit(values);
    if (saved) onOpenChange(false);
  }

  const slideCount = slidesFieldArray.fields.length;

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-5xl"
      title={
        highlight
          ? t("featureHighlights.form.editTitle")
          : t("featureHighlights.form.createTitle")
      }
      description={t("featureHighlights.form.description")}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("featureHighlights.form.cancel")}
          </Button>
          <Button
            type="submit"
            form={FEATURE_HIGHLIGHT_FORM_ID}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t("featureHighlights.form.saving")
              : t("featureHighlights.form.save")}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-[minmax(0,1fr)_22rem] md:gap-3">
          <form
            id={FEATURE_HIGHLIGHT_FORM_ID}
            onSubmit={handleSubmit(handleFormSubmit)}
            className="flex min-w-0 flex-col gap-4 md:gap-2"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-2">
              <Field data-invalid={!!errors.publishedAt}>
                <FieldLabel htmlFor={`${idPrefix}-published-at`}>
                  {t("featureHighlights.form.publishedAt")}
                </FieldLabel>
                <Input
                  id={`${idPrefix}-published-at`}
                  type="datetime-local"
                  {...register("publishedAt")}
                />
                <FieldError errors={[errors.publishedAt]} />
              </Field>
              <Field orientation="horizontal" className="self-end">
                <FieldLabel htmlFor={`${idPrefix}-published`}>
                  {t("featureHighlights.form.published")}
                </FieldLabel>
                <Controller
                  control={control}
                  name="isPublished"
                  render={({ field }) => (
                    <Switch
                      id={`${idPrefix}-published`}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </Field>
            </div>
            <p className="text-xs text-foreground/70">
              {t("featureHighlights.form.publishHint")}
            </p>

            {slidesFieldArray.fields.map((field, index) => (
              <FeatureHighlightSlideFields
                key={field.id}
                index={index}
                slideCount={slideCount}
                onMoveUp={() => slidesFieldArray.move(index, index - 1)}
                onMoveDown={() => slidesFieldArray.move(index, index + 1)}
                onRemove={() => slidesFieldArray.remove(index)}
              />
            ))}
            <FieldError errors={[errors.slides?.root, errors.slides]} />

            <Button
              type="button"
              variant="outline"
              className="self-start"
              disabled={slideCount >= FEATURE_HIGHLIGHT_MAX_SLIDES}
              onClick={() =>
                slidesFieldArray.append({ ...EMPTY_FEATURE_HIGHLIGHT_SLIDE })
              }
            >
              <IconPlus aria-hidden />
              {t("featureHighlights.form.addSlide")}
            </Button>
          </form>

          <FeatureHighlightsPreview />
        </div>
      </FormProvider>
    </DynamicDialog>
  );
}
