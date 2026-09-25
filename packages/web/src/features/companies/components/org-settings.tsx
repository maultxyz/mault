import { DeleteDialog } from "@/components/delete-dialog";
import { SaveBar } from "@/components/save-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useBilling } from "@/features/billing/api/use-billing";
import { hasActiveSubscription } from "@/features/billing/lib/subscription";
import { apiDelete } from "@/lib/api/client";
import { neon } from "@/lib/auth/client";
import {
  orgInviteSchema,
  organizationNameSchema,
  type OrgInviteFormValues,
  type OrganizationNameFormValues,
} from "@/schemas/companies.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type OrgRole = "owner" | "admin" | "member";

export function OrgSettings() {
  const { t } = useTranslation("companies");
  const ROLE_LABELS: Record<OrgRole, string> = {
    owner: t("orgSettings.roleOwner"),
    admin: t("roleAdmin"),
    member: t("roleMember"),
  };
  const { refetch: refetchOrgs } = neon.auth.useListOrganizations();
  const { data: activeOrg, refetch: refetchActive } =
    neon.auth.useActiveOrganization();
  const { data: activeMember } = neon.auth.useActiveMember();

  const myRole = activeMember?.role as OrgRole | undefined;
  const canManage = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  const { billing, openPortal, isOpeningPortal } = useBilling();
  const blockedBySubscription = hasActiveSubscription(billing);

  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const renameForm = useForm<OrganizationNameFormValues>({
    resolver: zodResolver(organizationNameSchema),
    defaultValues: { name: "" },
  });

  const inviteForm = useForm<OrgInviteFormValues>({
    resolver: zodResolver(orgInviteSchema),
    defaultValues: { email: "", role: "member" },
  });

  async function handleRename({ name }: OrganizationNameFormValues) {
    if (!activeOrg) return;
    try {
      const { error } = await neon.auth.organization.update({
        organizationId: activeOrg.id,
        data: { name },
      });
      if (error) throw new Error(error.message);
      renameForm.reset();
      await refetchActive();
      toast.success(t("orgSettings.organizationRenamed"));
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : t("orgSettings.failedToRename"),
      );
    }
  }

  async function handleInvite({ email, role }: OrgInviteFormValues) {
    if (!activeOrg) return;
    try {
      const { error } = await neon.auth.organization.inviteMember({
        email,
        role,
        organizationId: activeOrg.id,
      });
      if (error) throw new Error(error.message);
      inviteForm.reset();
      await refetchActive();
      toast.success(t("orgSettings.inviteSent"));
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : t("orgSettings.failedToSendInvite"),
      );
    }
  }

  async function handleCancelInvite(invitationId: string) {
    try {
      const { error } = await neon.auth.organization.cancelInvitation({
        invitationId,
      });
      if (error) throw new Error(error.message);
      await refetchActive();
      toast.success(t("orgSettings.inviteCancelled"));
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : t("orgSettings.failedToCancelInvite"),
      );
    }
  }

  async function handleChangeRole(memberId: string, role: OrgRole) {
    try {
      const { error } = await neon.auth.organization.updateMemberRole({
        memberId,
        role,
        organizationId: activeOrg!.id,
      });
      if (error) throw new Error(error.message);
      await refetchActive();
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : t("orgSettings.failedToUpdateRole"),
      );
    }
  }

  async function handleRemoveMember() {
    if (!removeMemberTarget) return;
    try {
      const { error } = await neon.auth.organization.removeMember({
        memberIdOrEmail: removeMemberTarget.id,
        organizationId: activeOrg!.id,
      });
      if (error) throw new Error(error.message);
      setRemoveMemberTarget(null);
      await refetchActive();
      toast.success(t("orgSettings.memberRemoved"));
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : t("orgSettings.failedToRemoveMember"),
      );
    }
  }

  async function handleDelete() {
    if (!activeOrg) return;
    try {
      await apiDelete("/api/org-settings/data");
      const { error } = await neon.auth.organization.delete({
        organizationId: activeOrg.id,
      });
      if (error) throw new Error(error.message);
      await refetchOrgs();
      toast.success(t("orgSettings.organizationDeleted"));
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : t("orgSettings.failedToDelete"),
      );
    }
  }

  const pendingInvites =
    activeOrg?.invitations?.filter((i) => i.status === "pending") ?? [];

  return (
    <>
      <div className="flex flex-col gap-6">
        {!activeOrg && (
          <p className="text-xs text-muted-foreground">
            {t("orgSettings.noOrgSelected")}
          </p>
        )}

        {activeOrg && (
          <>
            {canManage && (
              <>
                <form
                  id="org-rename-form"
                  onSubmit={renameForm.handleSubmit(handleRename)}
                  className="flex flex-col gap-2"
                >
                  <h3 className="text-sm font-semibold font-heading">
                    {t("orgSettings.renameHeading", { name: activeOrg.name })}
                  </h3>
                  <Input
                    placeholder={activeOrg.name}
                    {...renameForm.register("name")}
                  />
                </form>
                <SaveBar
                  show={renameForm.formState.isDirty}
                  formId="org-rename-form"
                  isSaving={renameForm.formState.isSubmitting}
                  onDiscard={() => renameForm.reset()}
                />
                <UnsavedChangesGuard isDirty={renameForm.formState.isDirty} />
              </>
            )}

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold font-heading">
                {t("orgSettings.membersHeading")}
              </h3>
              <div className="flex flex-col divide-y divide-border rounded-lg border">
                {activeOrg.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-3 py-2 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">
                        {m.user.name || m.user.email}
                      </p>
                      {m.user.name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {m.user.email}
                        </p>
                      )}
                    </div>
                    {canManage && m.role !== "owner" ? (
                      <Select
                        value={m.role}
                        onValueChange={(e) =>
                          handleChangeRole(m.id, e as OrgRole)
                        }
                      >
                        <SelectTrigger className="w-28 shrink-0">
                          <SelectValue>
                            {ROLE_LABELS[m.role as OrgRole]}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            {t("roleAdmin")}
                          </SelectItem>
                          <SelectItem value="member">
                            {t("roleMember")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {ROLE_LABELS[m.role as OrgRole]}
                      </span>
                    )}
                    {isOwner && m.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setRemoveMemberTarget({
                            id: m.id,
                            name: m.user.name || m.user.email,
                          })
                        }
                      >
                        <IconTrash />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {canManage && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold font-heading">
                  {t("orgSettings.inviteMemberHeading")}
                </h3>
                <form
                  onSubmit={inviteForm.handleSubmit(handleInvite)}
                  className="flex gap-2"
                >
                  <Input
                    type="email"
                    placeholder={t("orgSettings.emailPlaceholder")}
                    {...inviteForm.register("email")}
                    className="flex-1"
                  />
                  <Controller
                    control={inviteForm.control}
                    name="role"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-28 shrink-0">
                          <SelectValue>
                            {ROLE_LABELS[field.value as OrgRole]}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            {t("roleAdmin")}
                          </SelectItem>
                          <SelectItem value="member">
                            {t("roleMember")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={inviteForm.formState.isSubmitting}
                  >
                    {inviteForm.formState.isSubmitting
                      ? t("orgSettings.sending")
                      : t("invite")}
                  </Button>
                </form>

                {pendingInvites.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground">
                      {t("orgSettings.pendingInvites")}
                    </p>
                    <div className="flex flex-col divide-y divide-border rounded-lg border">
                      {pendingInvites.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs"
                        >
                          <span className="flex-1 text-muted-foreground truncate">
                            {inv.email}
                          </span>
                          <span className="capitalize text-muted-foreground">
                            {inv.role}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelInvite(inv.id)}
                          >
                            <IconTrash size={12} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isOwner && (
              <div className="flex flex-col gap-3 bg-destructive rounded-lg p-4 text-destructive-foreground">
                <h3 className="text-sm font-semibold font-heading">
                  {t("orgSettings.dangerZoneHeading")}
                </h3>
                <p className="text-sm">
                  {t("orgSettings.deleteWarning", { name: activeOrg.name })}
                </p>
                {blockedBySubscription && (
                  <p className="text-sm font-medium">
                    {t("orgSettings.cancelSubscriptionFirst")}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {blockedBySubscription && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={openPortal}
                      disabled={isOpeningPortal}
                    >
                      {t("orgSettings.manageBilling")}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setDeleteOrgOpen(true)}
                    disabled={blockedBySubscription}
                  >
                    {t("orgSettings.deleteOrganization")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <DeleteDialog
        open={!!removeMemberTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveMemberTarget(null);
        }}
        title={t("orgSettings.removeMemberTitle")}
        description={t("orgSettings.removeMemberDescription", {
          name: removeMemberTarget?.name,
        })}
        confirm={{ type: "simple" }}
        onConfirm={handleRemoveMember}
      />

      <DeleteDialog
        open={deleteOrgOpen}
        onOpenChange={setDeleteOrgOpen}
        title={t("orgSettings.deleteOrganization")}
        description={t("orgSettings.deleteOrgDescription", {
          name: activeOrg?.name,
        })}
        confirm={{ type: "name", name: activeOrg?.name ?? "" }}
        onConfirm={handleDelete}
      />
    </>
  );
}
