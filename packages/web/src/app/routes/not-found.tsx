import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";
import { SITE_NAME } from "@/lib/constants/seo";
import { IconError404 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

export default function NotFoundPage() {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  usePageMeta({
    title: `${t("notFound.title")} | ${SITE_NAME}`,
    description: t("notFound.description"),
    path: pathname,
    noIndex: true,
  });

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center outline-none"
    >
      <IconError404 className="size-16 text-foreground/70" />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-lg font-semibold">
          {t("notFound.title")}
        </h1>
        <p className="text-xs text-foreground/70">
          {t("notFound.description")}
        </p>
      </div>
      <Button nativeButton={false} render={<Link to="/" />}>
        {t("backHome")}
      </Button>
    </main>
  );
}
