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
import {
  organizationNameSchema,
  type OrganizationNameFormValues,
} from "@/schemas/companies.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconBuilding,
  IconCheck,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useOrg } from "../api/use-organization";

function OrgBadge({
  initial,
  className,
}: {
  initial: string;
  className: string;
}) {
  return <span className={className}>{initial}</span>;
}

export function OrgSwitcher({
  side = "right",
  variant = "icon",
}: {
  side?: "right" | "top";
  variant?: "icon" | "tab";
}) {
  const { t } = useTranslation("companies");
  const { t: tCommon } = useTranslation("common");
  const { orgs, activeOrg, setActiveOrg } = useOrg();
  const { isImpersonating } = useImpersonation();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<OrganizationNameFormValues>({
    resolver: zodResolver(organizationNameSchema),
    defaultValues: { name: "" },
  });

  async function handleCreate({ name }: OrganizationNameFormValues) {
    const result = await createOrganization(name.trim());
    if ("error" in result) {
      toast.error(result.error || t("orgSwitcher.failedToCreate"));
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
        {variant === "tab" ? (
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-all active:scale-90 text-muted-foreground aria-expanded:text-foreground"
              >
                <span className="relative">
                  <IconBuilding size={20} />
                  {activeOrg && (
                    <OrgBadge
                      initial={activeOrg.name[0].toUpperCase()}
                      className="pointer-events-none absolute -right-1.5 -top-1 grid size-3 place-items-center rounded-full bg-primary text-[0.5rem] font-bold leading-none text-primary-foreground"
                    />
                  )}
                </span>
                <span className="text-[10px] leading-none font-medium">
                  {tCommon("nav.organization")}
                </span>
              </button>
            }
          />
        ) : (
          <div className="relative">
            <DropdownMenuTrigger
              render={
                <Button size="icon-lg" variant="ghost">
                  <IconBuilding />
                </Button>
              }
            />
            {activeOrg && (
              <OrgBadge
                initial={activeOrg.name[0].toUpperCase()}
                className="pointer-events-none absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[0.6rem] font-bold leading-none text-primary-foreground"
              />
            )}
          </div>
        )}
        <DropdownMenuContent
          side={side}
          align="end"
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
                {t("orgSwitcher.newOrganization")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/app/settings")}>
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
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? t("orgSwitcher.creating")
                : t("orgSwitcher.create")}
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      >
        <form id="create-org-form" onSubmit={form.handleSubmit(handleCreate)}>
          <Input
            placeholder={t("orgSwitcher.organizationNamePlaceholder")}
            {...form.register("name")}
            autoFocus
          />
        </form>
      </DynamicDialog>
    </>
  );
}
