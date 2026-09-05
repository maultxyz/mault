import { ApiKeysManager } from "@/features/account/components/api-keys-manager";
import { ChangeEmailForm } from "@/features/account/components/change-email-form";
import { ChangePasswordForm } from "@/features/account/components/change-password-form";
import { SessionsList } from "@/features/account/components/sessions-list";
import { UpdateNameForm } from "@/features/account/components/update-name-form";
import { useAuthSession } from "@/lib/auth";
import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { useTranslation } from "react-i18next";

// Local mode: own-auth backs sign-up/sign-in/sign-out only in this pass (see
// lib/auth/index.ts) - profile editing, email changes, and multi-device
// session management aren't wired up yet, so this shows a read-only summary
// instead of Neon's editable forms.
function LocalAccountSummary() {
  const { t } = useTranslation("account");
  const { data } = useAuthSession();

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <h2 className="font-heading text-sm font-semibold">
        {t("profile.heading")}
      </h2>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t("email.heading")}</dt>
          <dd className="font-medium">{data?.user?.email}</dd>
        </div>
        {data?.user?.name && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("profile.heading")}</dt>
            <dd className="font-medium">{data.user.name}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export default function AccountPage() {
  const { t } = useTranslation("account");

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-6">
        <div>
          <h1 className="font-heading text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {AUTH_PROVIDER === "local" ? (
          <>
            <LocalAccountSummary />
            <div className="flex flex-col gap-4 rounded-lg border p-4">
              <h2 className="font-heading text-sm font-semibold">
                {t("apiKeys.heading")}
              </h2>
              <ApiKeysManager />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4 rounded-lg border p-4">
              <h2 className="font-heading text-sm font-semibold">
                {t("profile.heading")}
              </h2>
              <UpdateNameForm />
            </div>

            <div className="flex flex-col gap-4 rounded-lg border p-4">
              <h2 className="font-heading text-sm font-semibold">
                {t("email.heading")}
              </h2>
              <ChangeEmailForm />
            </div>

            <div className="flex flex-col gap-4 rounded-lg border p-4">
              <h2 className="font-heading text-sm font-semibold">
                {t("password.heading")}
              </h2>
              <ChangePasswordForm />
            </div>

            <div className="flex flex-col gap-4 rounded-lg border p-4">
              <h2 className="font-heading text-sm font-semibold">
                {t("sessions.heading")}
              </h2>
              <SessionsList />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
