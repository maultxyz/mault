import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/components/ui/initials-avatar";
import { signOut, useAuthSession } from "@/lib/auth";
import { clearImpersonation } from "@/lib/auth/impersonation";
import { IconLogout, IconUserCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function UserMenu({
  variant = "icon",
  side = "right",
}: {
  variant?: "icon" | "tab";
  side?: "top" | "right";
}) {
  const { t } = useTranslation("common");
  const { data } = useAuthSession();
  const navigate = useNavigate();

  const name = data?.user?.name ?? undefined;
  const email = data?.user?.email;

  async function handleSignOut() {
    clearImpersonation();
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <DropdownMenu>
      {variant === "tab" ? (
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-all active:scale-90 text-muted-foreground aria-expanded:text-foreground"
            >
              <span className="grid size-5 place-items-center rounded-full bg-muted text-[9px] font-semibold">
                {getInitials(name)}
              </span>
              <span className="text-[10px] leading-none font-medium">
                {t("breadcrumb.account")}
              </span>
              <span className="sr-only">{t("userMenu.trigger")}</span>
            </button>
          }
        />
      ) : (
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-lg">
              <span className="text-[10px] font-semibold">
                {getInitials(name)}
              </span>
              <span className="sr-only">{t("userMenu.trigger")}</span>
            </Button>
          }
        />
      )}
      <DropdownMenuContent
        side={side}
        align="end"
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">
              {name || email}
            </span>
            {name && email && (
              <span className="truncate text-xs text-muted-foreground">
                {email}
              </span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/app/account/settings")}>
          <IconUserCircle size={14} />
          {t("breadcrumb.account")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <IconLogout size={14} />
          {t("userMenu.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
