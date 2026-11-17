import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { buildMobileSocialSignInAppCallbackUrl } from "@/lib/auth/mobile-social-sign-in";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export default function MobileAuthCallbackPage() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const appCallbackUrl = useMemo(
    () => buildMobileSocialSignInAppCallbackUrl(searchParams),
    [searchParams],
  );

  useEffect(() => {
    window.location.replace(appCallbackUrl);
  }, [appCallbackUrl]);

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center outline-none"
    >
      <BrandMark />
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="font-heading text-base font-semibold">
          {t("mobileCallback.title")}
        </h1>
        <p className="text-foreground/70 text-sm">
          {t("mobileCallback.description")}
        </p>
      </div>
      <Button render={<a href={appCallbackUrl} />}>
        {t("mobileCallback.openApp")}
      </Button>
    </main>
  );
}
