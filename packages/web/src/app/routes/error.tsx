import { Button } from "@/components/ui/button";
import { rollbar } from "@/lib/rollbar";
import { IconBug, IconRefresh } from "@tabler/icons-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const { t } = useTranslation("common");
  const error = useRouteError();

  console.error(error);

  useEffect(() => {
    if (!isRouteErrorResponse(error)) {
      rollbar.error(error instanceof Error ? error : String(error));
    }
  }, [error]);

  const statusText = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : null;

  const detail =
    import.meta.env.DEV && error instanceof Error
      ? (error.stack ?? error.message)
      : null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
      <IconBug className="size-16 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-semibold">
          {t("errorPage.title")}
        </h1>
        <p className="text-xs text-muted-foreground">
          {t("errorPage.description")}
        </p>
        {statusText && (
          <p className="font-mono text-xs text-muted-foreground">
            {statusText}
          </p>
        )}
      </div>
      {detail && (
        <pre className="max-w-lg overflow-auto rounded-lg border bg-muted p-3 text-left text-[10px] text-muted-foreground">
          {detail}
        </pre>
      )}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <IconRefresh size={14} />
          {t("errorPage.reload")}
        </Button>
        <Button nativeButton={false} render={<Link to="/" />}>
          {t("errorPage.backHome")}
        </Button>
      </div>
    </div>
  );
}
