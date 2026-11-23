import { Button } from "@/components/ui/button";
import { UserInitials } from "@/components/user-initials";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSignOut } from "@/features/account/api/use-sign-out";
import { useAuthSession } from "@/lib/auth";
import {
  LANGUAGE_NATIVE_NAMES,
  SUPPORTED_LANGUAGES,
} from "@/lib/constants/languages";
import { ACCOUNT_SETTINGS_PATH, THEME_OPTIONS } from "@/lib/constants/nav";
import type { SupportedLanguage } from "@/lib/interfaces/languages";
import {
  IconLanguage,
  IconLogout,
  IconPalette,
  IconUserCircle,
} from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function UserMenu() {
  const { t, i18n } = useTranslation("common");
  const { theme, setTheme } = useTheme();
  const { data } = useAuthSession();
  const currentLanguage = i18n.language as SupportedLanguage;
  const navigate = useNavigate();

  const name = data?.user?.name ?? undefined;
  const email = data?.user?.email;

  const handleSignOut = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent"
          >
            <UserInitials name={name} />
            <span className="sr-only">{t("userMenu.trigger")}</span>
          </Button>
        }
      />
      <DropdownMenuContent
        side="bottom"
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
              <span className="truncate text-xs text-foreground/70">
                {email}
              </span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(ACCOUNT_SETTINGS_PATH)}>
          <IconUserCircle size={14} />
          {t("breadcrumb.account")}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <IconPalette size={14} />
            <span className="flex-1">{t("userMenu.theme")}</span>
            <span className="text-foreground/70">
              {t(`theme.${theme ?? "system"}`)}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={theme ?? "system"}
              onValueChange={(value) => setTheme(value as string)}
            >
              {THEME_OPTIONS.map((preference) => (
                <DropdownMenuRadioItem key={preference} value={preference}>
                  {t(`theme.${preference}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <IconLanguage size={14} />
            <span className="flex-1">{t("userMenu.language")}</span>
            <span className="text-foreground/70">
              {LANGUAGE_NATIVE_NAMES[currentLanguage] ?? currentLanguage}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={currentLanguage}
              onValueChange={(value) => void i18n.changeLanguage(value as string)}
            >
              {SUPPORTED_LANGUAGES.map((language) => (
                <DropdownMenuRadioItem key={language} value={language}>
                  {LANGUAGE_NATIVE_NAMES[language]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <IconLogout size={14} />
          {t("userMenu.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
