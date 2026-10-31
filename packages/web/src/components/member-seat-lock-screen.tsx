import { Button } from "@/components/ui/button";
import { useSignOut } from "@/features/account/api/use-sign-out";
import { useOrg } from "@/features/companies/api/use-organization";
import { useMemberSeatLock } from "@/lib/member-seat-lock";
import { IconBuilding, IconLock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MemberSeatLockScreen() {
  const { t } = useTranslation("common");
  const lock = useMemberSeatLock();
  const { orgs, activeOrg, setActiveOrg } = useOrg();
  const signOut = useSignOut();

  if (!lock || !activeOrg || lock.orgId !== activeOrg.id) return null;

  const otherOrgs = orgs.filter((org) => org.id !== activeOrg.id);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center overflow-y-auto bg-background p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex w-full max-w-sm flex-col gap-4 animate-in fade-in motion-reduce:animate-none">
        <span className="grid size-10 place-items-center rounded-lg bg-muted">
          <IconLock className="size-5 text-foreground/70" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-base font-semibold text-foreground">
            {t("memberSeatLock.title")}
          </h1>
          <p className="text-sm text-foreground/70">
            {t("memberSeatLock.description", {
              count: lock.limit,
              name: activeOrg.name,
            })}
          </p>
        </div>
        {otherOrgs.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-foreground/70">
              {t("memberSeatLock.switchOrganization")}
            </p>
            {otherOrgs.map((org) => (
              <Button
                key={org.id}
                variant="outline"
                className="justify-start"
                onClick={() => void setActiveOrg(org.id)}
              >
                <IconBuilding />
                <span className="truncate">{org.name}</span>
              </Button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          <Button onClick={() => window.location.reload()}>
            {t("memberSeatLock.tryAgain")}
          </Button>
          <Button variant="outline" onClick={() => void signOut()}>
            {t("memberSeatLock.signOut")}
          </Button>
        </div>
      </div>
    </div>
  );
}
