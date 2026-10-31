import { Callout } from "@/components/callout";
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
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useImpersonation } from "@/hooks/use-impersonation";
import { createOrganization } from "@/lib/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconBuilding,
  IconCheck,
  IconSelector,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";
import { useOrg } from "../api/use-organization";
import { useOrganizationLimit } from "../api/use-organization-limit";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import {
  organizationNameFormSchema,
  type OrganizationNameFormValues,
} from "@magic-vault/shared";

function OrgBadge({
  initial,
  className,
}: {
  initial: string;
  className: string;
}) {
  return <span className={className}>{initial}</span>;
}

export function OrgSwitcher() {
  const { t } = useTranslation("companies");
  const { orgs, activeOrg, setActiveOrg } = useOrg();
  const { isImpersonating } = useImpersonation();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const { organizationLimit, atOrganizationLimit, activeOrgName } =
    useOrganizationLimit();

  const form = useForm<OrganizationNameFormValues>({
    resolver: zodResolver(organizationNameFormSchema),
    defaultValues: { name: "" },
  });

  async function handleCreate({ name }: OrganizationNameFormValues) {
    if (atOrganizationLimit) return;
    const result = await createOrganization(name.trim());
    if ("error" in result) {
      toast.error(result.error || t("failedToCreateOrganization"));
      return;
    }
    await setActiveOrg(result.id);
    form.reset();
    setCreateOpen(false);
    toast.success(t("orgSwitcher.organizationCreated", { name: name.trim() }));
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="max-w-56 min-w-0 shrink gap-1.5 px-1 hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent"
            >
              {activeOrg ? (
                <OrgBadge
                  initial={activeOrg.name[0].toUpperCase()}
                  className="grid size-4.5 shrink-0 place-items-center rounded-sm bg-primary text-2xs font-bold text-primary-foreground"
                />
              ) : (
                <IconBuilding />
              )}
              <span className="truncate font-semibold text-foreground">
                {activeOrg?.name ?? t("orgSwitcher.organizations")}
              </span>
              <IconSelector className="size-3.5 text-foreground/70" />
            </Button>
          }
        />
        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={8}
          className="w-64"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {t("orgSwitcher.organizations")}
            </DropdownMenuLabel>
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => setActiveOrg(org.id)}
              >
                <span className="flex-1 truncate">{org.name}</span>
                {org.id === activeOrg?.id && (
                  <IconCheck size={14} className="text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          {!isImpersonating && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <IconPlus size={14} />
                {t("newOrganization")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate(SETTINGS_PATHS.organization)}
              >
                <IconSettings size={14} />
                {t("orgSwitcher.manageOrganizations")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DynamicDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) form.reset();
        }}
        title={t("orgSwitcher.newOrganizationTitle")}
        description={t("orgSwitcher.newOrganizationDescription")}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("orgSwitcher.cancel")}
            </Button>
            <Button
              type="submit"
              form="create-org-form"
              disabled={form.formState.isSubmitting || atOrganizationLimit}
            >
              {form.formState.isSubmitting
                ? t("creatingOrganization")
                : t("create")}
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      >
        <form
          id="create-org-form"
          onSubmit={form.handleSubmit(handleCreate)}
          className="flex flex-col gap-3"
        >
          {atOrganizationLimit && (
            <Callout
              variant="warning"
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    navigate(SETTINGS_PATHS.billing);
                  }}
                >
                  {t("orgSwitcher.organizationLimitUpgrade")}
                </Button>
              }
            >
              {t("orgSwitcher.organizationLimitReached", {
                count: organizationLimit ?? 0,
                name: activeOrgName,
              })}
            </Callout>
          )}
          <Input
            placeholder={t("organizationNamePlaceholder")}
            {...form.register("name")}
            autoFocus
          />
        </form>
      </DynamicDialog>
    </>
  );
}
