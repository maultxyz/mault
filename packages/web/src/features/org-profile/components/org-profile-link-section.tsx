import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { copyWithToast } from "@/lib/clipboard";
import type { OrgProfileLinkSectionProps } from "@/lib/interfaces/org-profile";
import {
  ORG_PROFILE_HANDLE_MAX_LENGTH,
  ORG_PROFILE_PATH_PREFIX,
  buildOrgProfileUrl,
} from "@magic-vault/shared";
import { IconCopy, IconExternalLink, IconShare } from "@tabler/icons-react";
import { useId } from "react";
import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function OrgProfileLinkSection({
  form,
  control,
  disabled,
  savedHandle,
  isSavedPublished,
  shortUrl,
}: OrgProfileLinkSectionProps) {
  const { t } = useTranslation("org-profile");
  const handleId = useId();
  const urlNoteId = useId();
  const handle = (useWatch({ control, name: "handle" }) ?? "").trim().toLowerCase();
  const isPublished = useWatch({ control, name: "isPublished" });
  const isSavedHandle = handle === savedHandle;
  const url = buildOrgProfileUrl(window.location.origin, {
    handle,
    shortUrl: isSavedHandle ? shortUrl : null,
  });
  const isLive = isSavedPublished && isSavedHandle && isPublished;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const handleError = form.formState.errors.handle;

  return (
    <SettingsSection heading={t("link.heading")} description={t("link.description")}>
      <Field data-invalid={!!handleError}>
        <FieldLabel htmlFor={handleId}>{t("link.handleLabel")}</FieldLabel>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InputGroupText>{ORG_PROFILE_PATH_PREFIX.replace(/^\//, "")}</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id={handleId}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={ORG_PROFILE_HANDLE_MAX_LENGTH}
            aria-invalid={!!handleError}
            aria-describedby={urlNoteId}
            disabled={disabled}
            {...form.register("handle")}
          />
        </InputGroup>
        <FieldError errors={[handleError]} />
        <FieldDescription id={urlNoteId}>
          {isLive ? t("link.liveNote") : t("link.notLiveNote")}
        </FieldDescription>
      </Field>
      <div className="flex flex-col gap-2 rounded-lg bg-foreground/6 p-3 md:flex-row md:items-center md:p-2">
        <p className="min-w-0 flex-1 break-all text-sm font-medium tabular-nums">
          <span className="sr-only">{t("link.urlLabel")} </span>
          {url}
        </p>
        {isLive && (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyWithToast(url, t("link.copied"), t("link.copyFailed"))}
            >
              <IconCopy />
              {t("link.copy")}
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={url} target="_blank" rel="noopener noreferrer" />}
            >
              <IconExternalLink />
              {t("link.open")}
            </Button>
            {canShare && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void navigator.share({ url }).catch(() => undefined)}
              >
                <IconShare />
                {t("link.share")}
              </Button>
            )}
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
