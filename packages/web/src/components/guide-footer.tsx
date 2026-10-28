import { MarketingFooter } from "@/components/marketing-footer";
import { REPORT_ISSUE_URL } from "@/lib/constants/links";
import type {
  GuideFooterProps,
  MarketingFooterLink,
} from "@/lib/interfaces/marketing-footer";
import { useCurrentYear } from "@/hooks/use-current-year";
import { useTranslation } from "react-i18next";

export function GuideFooter({
  showOpenSourceLink = false,
  showSignInLink = false,
}: GuideFooterProps) {
  const { t } = useTranslation("common");
  const year = useCurrentYear();

  const links: MarketingFooterLink[] = [
    ...(showOpenSourceLink
      ? [{ label: t("footer.openSource"), to: "/#open-source" }]
      : []),
    { label: t("footer.reportIssue"), href: REPORT_ISSUE_URL, external: true },
    ...(showSignInLink
      ? [{ label: t("footer.signIn"), to: "/auth/sign-in" }]
      : []),
    { label: t("footer.privacy"), to: "/privacy" },
    { label: t("footer.terms"), to: "/terms" },
  ];

  return (
    <MarketingFooter
      links={links}
      end={
        <p className="text-sm text-foreground/70">
          {t("footer.copyright", { year })}
        </p>
      }
    />
  );
}
