import { MarketingFooter } from "@/components/marketing-footer";
import { REPORT_ISSUE_URL } from "@/lib/constants/links";
import { useTranslation } from "react-i18next";

export function BuildFooter() {
  const { t } = useTranslation("build");

  return (
    <MarketingFooter
      links={[
        { label: t("footer.openSource"), to: "/#open-source" },
        {
          label: t("footer.reportIssue"),
          href: REPORT_ISSUE_URL,
          external: true,
        },
        { label: t("footer.signIn"), to: "/auth/sign-in" },
        { label: t("footer.privacy"), to: "/privacy" },
        { label: t("footer.terms"), to: "/terms" },
      ]}
      end={
        <p className="text-sm text-foreground/70">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
      }
    />
  );
}
