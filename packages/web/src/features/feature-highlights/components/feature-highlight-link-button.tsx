import { Button } from "@/components/ui/button";
import { resolveFeatureHighlightText } from "@/features/feature-highlights/lib/feature-highlight-slides";
import type { FeatureHighlightLinkButtonProps } from "@/lib/interfaces/feature-highlights";
import { IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function FeatureHighlightLinkButton({ link }: FeatureHighlightLinkButtonProps) {
  const { t } = useTranslation("common");
  const label =
    resolveFeatureHighlightText(t, link.label).trim() ||
    t("featureHighlights.learnMore");
  const isInternalLink = link.url.startsWith("/") && !link.url.startsWith("//");

  if (isInternalLink) {
    return (
      <Button
        variant="secondary"
        className="self-start"
        nativeButton={false}
        render={<Link to={link.url} />}
      >
        {label}
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      className="self-start"
      nativeButton={false}
      render={
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${label}, ${t("featureHighlights.opensInBrowser")}`}
        />
      }
    >
      {label}
      <IconExternalLink aria-hidden />
    </Button>
  );
}
