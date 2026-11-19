import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { uploadFeatureHighlightMedia } from "@/features/feature-highlights/api/feature-highlights";
import {
  FEATURE_HIGHLIGHT_MEDIA_ACCEPT,
  FEATURE_HIGHLIGHT_MEDIA_TYPE_OPTIONS,
} from "@/lib/constants/feature-highlights";
import type { FeatureHighlightSlideFieldsProps } from "@/lib/interfaces/feature-highlights";
import { toast } from "@/lib/toast";
import type { FeatureHighlightFormValues } from "@/schemas/feature-highlights.schema";
import {
  FEATURE_HIGHLIGHT_IMAGE_MAX_BYTES,
  FEATURE_HIGHLIGHT_MEDIA_CONTENT_TYPES,
  FEATURE_HIGHLIGHT_VIDEO_MAX_BYTES,
} from "@magic-vault/shared";
import {
  IconArrowDown,
  IconArrowUp,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useId, useRef, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

function mediaTypeOfFile(file: File) {
  return (
    FEATURE_HIGHLIGHT_MEDIA_CONTENT_TYPES as Record<
      string,
      "image" | "video" | undefined
    >
  )[file.type];
}

export function FeatureHighlightSlideFields({
  index,
  slideCount,
  onMoveUp,
  onMoveDown,
  onRemove,
}: FeatureHighlightSlideFieldsProps) {
  const { t } = useTranslation("admin");
  const idPrefix = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<FeatureHighlightFormValues>();
  const mediaType = useWatch({ control, name: `slides.${index}.mediaType` });
  const slideErrors = errors.slides?.[index];
  const slideNumber = index + 1;

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    const fileMediaType = mediaTypeOfFile(file);
    if (!fileMediaType) {
      toast.error(t("featureHighlights.toasts.unsupportedFile"));
      return;
    }
    const maxBytes =
      fileMediaType === "video"
        ? FEATURE_HIGHLIGHT_VIDEO_MAX_BYTES
        : FEATURE_HIGHLIGHT_IMAGE_MAX_BYTES;
    if (file.size > maxBytes) {
      toast.error(
        t("featureHighlights.toasts.fileTooLarge", {
          size: Math.round(maxBytes / (1024 * 1024)),
        }),
      );
      return;
    }
    setIsUploading(true);
    try {
      const result = await uploadFeatureHighlightMedia(file);
      if (!result.success || !result.data) {
        toast.error(result.message || t("featureHighlights.toasts.uploadError"));
        return;
      }
      setValue(`slides.${index}.mediaType`, result.data.mediaType, {
        shouldDirty: true,
      });
      setValue(`slides.${index}.mediaUrl`, result.data.url, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.success(t("featureHighlights.toasts.uploadSuccess"));
    } catch {
      toast.error(t("featureHighlights.toasts.uploadError"));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div
      role="group"
      aria-labelledby={`${idPrefix}-heading`}
      className="flex flex-col gap-3 rounded-lg bg-foreground/6 p-3 md:gap-2 md:p-2.5"
    >
      <div className="flex items-center gap-1.5">
        <h3
          id={`${idPrefix}-heading`}
          className="flex-1 font-heading text-sm font-semibold text-foreground"
        >
          {t("featureHighlights.form.slideHeading", { number: slideNumber })}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={index === 0}
          aria-label={t("featureHighlights.form.moveUp", { number: slideNumber })}
          onClick={onMoveUp}
        >
          <IconArrowUp aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={index === slideCount - 1}
          aria-label={t("featureHighlights.form.moveDown", { number: slideNumber })}
          onClick={onMoveDown}
        >
          <IconArrowDown aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={slideCount <= 1}
          aria-label={t("featureHighlights.form.removeSlide", { number: slideNumber })}
          onClick={onRemove}
        >
          <IconTrash aria-hidden />
        </Button>
      </div>

      <Field data-invalid={!!slideErrors?.title}>
        <FieldLabel htmlFor={`${idPrefix}-title`}>
          {t("featureHighlights.form.title")}
        </FieldLabel>
        <Input id={`${idPrefix}-title`} {...register(`slides.${index}.title`)} />
        <FieldError errors={[slideErrors?.title]} />
      </Field>

      <Field data-invalid={!!slideErrors?.body}>
        <FieldLabel htmlFor={`${idPrefix}-body`}>
          {t("featureHighlights.form.body")}
        </FieldLabel>
        <Textarea id={`${idPrefix}-body`} {...register(`slides.${index}.body`)} />
        <FieldError errors={[slideErrors?.body]} />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-media-type`}>
          {t("featureHighlights.form.mediaType")}
        </FieldLabel>
        <Controller
          control={control}
          name={`slides.${index}.mediaType`}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={`${idPrefix}-media-type`}>
                <SelectValue>
                  {t(`featureHighlights.mediaTypes.${field.value}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FEATURE_HIGHLIGHT_MEDIA_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`featureHighlights.mediaTypes.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {mediaType !== "none" && (
        <>
          <Field data-invalid={!!slideErrors?.mediaUrl}>
            <FieldLabel htmlFor={`${idPrefix}-media-url`}>
              {t("featureHighlights.form.mediaUrl")}
            </FieldLabel>
            <div className="flex items-center gap-1.5">
              <Input
                id={`${idPrefix}-media-url`}
                className="flex-1"
                placeholder={t("featureHighlights.form.urlPlaceholder")}
                {...register(`slides.${index}.mediaUrl`)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <IconUpload aria-hidden />
                {isUploading
                  ? t("featureHighlights.form.uploading")
                  : t("featureHighlights.form.upload")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={FEATURE_HIGHLIGHT_MEDIA_ACCEPT}
                className="hidden"
                tabIndex={-1}
                aria-hidden
                onChange={(event) => {
                  void uploadFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
            <FieldDescription>
              {t("featureHighlights.form.mediaUrlHint")}
            </FieldDescription>
            <FieldError errors={[slideErrors?.mediaUrl]} />
          </Field>

          {mediaType === "video" && (
            <Field data-invalid={!!slideErrors?.mediaPosterUrl}>
              <FieldLabel htmlFor={`${idPrefix}-poster-url`}>
                {t("featureHighlights.form.posterUrl")}
              </FieldLabel>
              <Input
                id={`${idPrefix}-poster-url`}
                placeholder={t("featureHighlights.form.urlPlaceholder")}
                {...register(`slides.${index}.mediaPosterUrl`)}
              />
              <FieldError errors={[slideErrors?.mediaPosterUrl]} />
            </Field>
          )}

          <Field data-invalid={!!slideErrors?.mediaAltText}>
            <FieldLabel htmlFor={`${idPrefix}-alt-text`}>
              {t("featureHighlights.form.altText")}
            </FieldLabel>
            <Input
              id={`${idPrefix}-alt-text`}
              {...register(`slides.${index}.mediaAltText`)}
            />
            <FieldError errors={[slideErrors?.mediaAltText]} />
          </Field>
        </>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-2">
        <Field data-invalid={!!slideErrors?.linkUrl}>
          <FieldLabel htmlFor={`${idPrefix}-link-url`}>
            {t("featureHighlights.form.linkUrl")}
          </FieldLabel>
          <Input
            id={`${idPrefix}-link-url`}
            placeholder={t("featureHighlights.form.urlPlaceholder")}
            {...register(`slides.${index}.linkUrl`)}
          />
          <FieldError errors={[slideErrors?.linkUrl]} />
        </Field>
        <Field data-invalid={!!slideErrors?.linkLabel}>
          <FieldLabel htmlFor={`${idPrefix}-link-label`}>
            {t("featureHighlights.form.linkLabel")}
          </FieldLabel>
          <Input
            id={`${idPrefix}-link-label`}
            {...register(`slides.${index}.linkLabel`)}
          />
          <FieldError errors={[slideErrors?.linkLabel]} />
        </Field>
      </div>
    </div>
  );
}
