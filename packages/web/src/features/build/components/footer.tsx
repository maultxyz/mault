import { BrandMark } from "@/components/brand-mark";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function BuildFooter() {
  const { t } = useTranslation("build");

  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <BrandMark size="sm" />

        <nav className="flex items-center gap-5 text-sm text-foreground/70">
          <Link to="/#open-source" className="transition-colors hover:text-foreground">
            {t("footer.openSource")}
          </Link>
          <a
            href="https://github.com/dishwasher-detergent/mault/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            {t("footer.reportIssue")}
          </a>
          <Link to="/auth/sign-in" className="transition-colors hover:text-foreground">
            {t("footer.signIn")}
          </Link>
          <Link to="/privacy" className="transition-colors hover:text-foreground">
            {t("footer.privacy")}
          </Link>
          <Link to="/terms" className="transition-colors hover:text-foreground">
            {t("footer.terms")}
          </Link>
        </nav>

        <p className="text-sm text-foreground/70">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
