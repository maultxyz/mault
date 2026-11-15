import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { IconLoader2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PublicCardsLoadingScreen() {
  const { t } = useTranslation("common");

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex h-dvh items-center justify-center bg-background p-6 outline-none"
    >
      <div role="status">
        <IconLoader2
          className="size-6 animate-spin text-foreground/70 motion-reduce:animate-none"
          aria-hidden
        />
        <span className="sr-only">{t("a11y.loading")}</span>
      </div>
    </main>
  );
}
