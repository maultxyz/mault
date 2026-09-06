import { Button } from "@/components/ui/button";
import { IconError404 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  const { t } = useTranslation("common");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
      <IconError404 className="size-16 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-semibold">
          {t("notFound.title")}
        </h1>
        <p className="text-xs text-muted-foreground">
          {t("notFound.description")}
        </p>
      </div>
      <Button render={<Link to="/" />}>{t("notFound.backHome")}</Button>
    </div>
  );
}
