import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePiLinkSetup } from "@/features/pi-link-setup/api/use-pi-link-setup";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { SIGN_IN_PATH } from "@/lib/constants/auth";
import { HOME_PATH } from "@/lib/constants/nav";
import { RASPBERRY_PI_LINK_CODE_PARAM } from "@/lib/constants/raspberry-pis";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import type {
  PiLinkSetupLinkedProps,
  PiLinkSetupStepsProps,
} from "@/lib/interfaces/raspberry-pis";
import { formatPiPairingCode } from "@magic-vault/shared";
import { IconCircleCheck, IconExternalLink } from "@tabler/icons-react";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

function PiLinkSetupStepNumber({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
    >
      {children}
    </span>
  );
}

function PiLinkSetupSteps({ code, appUrl }: PiLinkSetupStepsProps) {
  const { t } = useTranslation("common");
  const linkUrl = `${appUrl}${SETTINGS_PATHS["raspberry-pis"]}?${new URLSearchParams({
    [RASPBERRY_PI_LINK_CODE_PARAM]: code,
  })}`;
  const opensInNewTab = <span className="sr-only">{t("publicNav.opensInNewTab")}</span>;

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        <li className="flex gap-3">
          <PiLinkSetupStepNumber>1</PiLinkSetupStepNumber>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-sm">{t("piLinkSetup.signInStep")}</p>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={`${appUrl}${SIGN_IN_PATH}`} target="_blank" rel="noopener noreferrer" />}
            >
              {t("piLinkSetup.signInButton")}
              <IconExternalLink />
              {opensInNewTab}
            </Button>
          </div>
        </li>
        <li className="flex gap-3">
          <PiLinkSetupStepNumber>2</PiLinkSetupStepNumber>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-sm">{t("piLinkSetup.linkStep")}</p>
            <Button
              nativeButton={false}
              render={<a href={linkUrl} target="_blank" rel="noopener noreferrer" />}
            >
              {t("piLinkSetup.linkButton")}
              <IconExternalLink />
              {opensInNewTab}
            </Button>
            <div className="rounded-lg bg-foreground/6 p-3 text-center">
              <p className="text-xs text-foreground/70">{t("piLinkSetup.codeLabel")}</p>
              <p className="select-all font-mono text-2xl font-semibold tracking-widest tabular-nums">
                {formatPiPairingCode(code)}
              </p>
            </div>
          </div>
        </li>
        <li className="flex gap-3">
          <PiLinkSetupStepNumber>3</PiLinkSetupStepNumber>
          <p className="min-w-0 flex-1 text-sm">{t("piLinkSetup.nameStep")}</p>
        </li>
      </ol>
      <p role="status" className="text-sm font-medium">
        {t("piLinkSetup.waiting")}
      </p>
      <p className="text-xs text-foreground/70">{t("piLinkSetup.codeChanges")}</p>
    </div>
  );
}

function PiLinkSetupLinked({ hostName, connected, appUrl }: PiLinkSetupLinkedProps) {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <IconCircleCheck aria-hidden className="size-5 shrink-0 text-success-foreground" />
        {t("piLinkSetup.linkedTitle", { name: hostName })}
      </p>
      <p role="status" className="text-sm text-foreground/70">
        {connected ? t("piLinkSetup.connected") : t("piLinkSetup.disconnected")}
      </p>
      {appUrl && (
        <Button
          nativeButton={false}
          render={<a href={`${appUrl}${HOME_PATH}`} target="_blank" rel="noopener noreferrer" />}
        >
          {t("piLinkSetup.openMault")}
          <IconExternalLink />
          <span className="sr-only">{t("publicNav.opensInNewTab")}</span>
        </Button>
      )}
    </div>
  );
}

export function PiLinkSetupPage() {
  const { t } = useTranslation("common");
  const { status, isUnreachable } = usePiLinkSetup();
  const appUrl = status?.appUrl ?? null;
  const pageTitle = t("piLinkSetup.title");

  useEffect(() => {
    document.title = `${pageTitle} · Mault`;
  }, [pageTitle]);

  let content;
  if (!status && isUnreachable) {
    content = (
      <p role="alert" className="text-sm">
        {t("piLinkSetup.unreachable")}
      </p>
    );
  } else if (!status) {
    content = (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  } else if (status.state === "linked") {
    content = (
      <PiLinkSetupLinked hostName={status.hostName} connected={status.connected} appUrl={appUrl} />
    );
  } else if (status.state === "pairing" && status.code && appUrl) {
    content = <PiLinkSetupSteps code={status.code} appUrl={appUrl} />;
  } else if (status.state === "pairing") {
    content = (
      <p role="status" className="text-sm">
        {t("piLinkSetup.gettingCode")}
      </p>
    );
  } else {
    content = (
      <p role="alert" className="text-sm">
        {t("piLinkSetup.unreachable")}
      </p>
    );
  }

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-4 outline-none"
    >
      <BrandMark />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>{t("piLinkSetup.title")}</h1>
          </CardTitle>
          <CardDescription>{t("piLinkSetup.intro")}</CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    </main>
  );
}
