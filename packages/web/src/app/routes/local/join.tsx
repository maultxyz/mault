import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthSession, savePendingInviteToken } from "@/lib/auth";
import { localPost } from "@/lib/auth/local-api";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

// Local-mode-only "accept an org invite" landing page - the link generated
// by features/companies/components/local-org-invites.tsx points here. If
// the visitor isn't signed in yet, saves the token (see lib/auth's
// savePendingInviteToken/acceptPendingInviteIfAny) and sends them through
// sign-in/sign-up first, which picks the invite back up automatically once
// they're authenticated.
export default function AuthJoinPage() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  // Display-only, not trusted for anything security-relevant - see
  // routes/local-auth.ts's /invites for why accepting always re-validates
  // against the real token regardless of what's in this URL.
  const orgName = searchParams.get("org");
  const { data, isPending } = useAuthSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token || isPending || !data?.user || accepting) return;
    setAccepting(true);
    localPost<{ success: boolean; message?: string }>(
      "/api/local-auth/invites/accept",
      { token },
    )
      .then((res) => {
        if (!res.success) {
          setError(res.message ?? t("local.joinFailed"));
          setAccepting(false);
          return;
        }
        navigate("/app", { replace: true });
      })
      .catch(() => {
        setError(t("local.joinUnreachable"));
        setAccepting(false);
      });
  }, [token, isPending, data, accepting, navigate, t]);

  function goToAuth(path: "sign-in" | "sign-up") {
    if (token) savePendingInviteToken(token);
    navigate(`/auth/${path}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {orgName ? t("local.joinTitleWithOrg", { org: orgName }) : t("local.joinTitle")}
          </CardTitle>
          <CardDescription>
            {!token
              ? t("local.joinInvalid")
              : error
                ? error
                : t("local.joinDescription")}
          </CardDescription>
        </CardHeader>
        {token && !error && (
          <CardContent>
            {isPending || accepting ? (
              <div className="flex justify-center py-4">
                <IconLoader2 className="animate-spin text-muted-foreground" />
              </div>
            ) : !data?.user ? (
              <CardFooter className="flex flex-col gap-2 px-0">
                <Button className="w-full" onClick={() => goToAuth("sign-in")}>
                  {t("local.signIn")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => goToAuth("sign-up")}
                >
                  {t("local.signUp")}
                </Button>
              </CardFooter>
            ) : null}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
