import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/delete-dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgLocal } from "@/features/companies/api/use-organization.local";
import { apiGet } from "@/lib/api/client";
import { localDelete, localPost } from "@/lib/auth/local-api";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCopy, IconMailPlus, IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

interface Invitation {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: string;
  expiresAt: string;
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
});
type InviteValues = z.infer<typeof inviteSchema>;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Local mode only, org owner/admin only (server-enforced). No SMTP is
// configured for local mode (see the self-hosted-email discussion), so this
// generates a shareable link instead of emailing one - see
// routes/local-auth.ts's /invites and LocalEmailProvider for how.
export function LocalOrgInvites() {
  const { t } = useTranslation("companies");
  const { activeOrg } = useOrgLocal();
  const [invites, setInvites] = useState<Invitation[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null);
  const [newInviteEmailSent, setNewInviteEmailSent] = useState(false);

  const canManage = activeOrg?.role === "owner" || activeOrg?.role === "admin";

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member" },
  });

  const load = useCallback(async () => {
    if (!canManage) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data?: Invitation[] }>(
        "/api/local-auth/invites",
      );
      setInvites((res.data ?? []).filter((i) => i.status === "pending"));
    } catch {
      toast.error(t("invites.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [canManage, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInvite({ email, role }: InviteValues) {
    try {
      const res = await localPost<{
        success: boolean;
        data?: { inviteUrl: string | null; emailSent: boolean };
        message?: string;
      }>("/api/local-auth/invites", { email, role });
      if (!res.success || !res.data) {
        throw new Error(res.message ?? t("invites.createFailed"));
      }
      form.reset();
      setShowInvite(false);
      setNewInviteUrl(res.data.inviteUrl);
      setNewInviteEmailSent(res.data.emailSent);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("invites.createFailed"));
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    try {
      const res = await localDelete<{ success: boolean; message?: string }>(
        `/api/local-auth/invites/${revokeTarget.id}`,
      );
      if (!res.success) throw new Error(res.message ?? t("invites.revokeFailed"));
      toast.success(t("invites.revoked"));
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("invites.revokeFailed"));
    } finally {
      setRevokeTarget(null);
    }
  }

  function copyInviteUrl() {
    if (!newInviteUrl) return;
    navigator.clipboard
      .writeText(newInviteUrl)
      .then(() => toast.success(t("invites.copied")))
      .catch(() => toast.error(t("invites.copyFailed")));
  }

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">{t("invites.membersOnly")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("invites.description")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowInvite(true)}
        >
          <IconPlus size={14} />
          {t("invites.invite")}
        </Button>
      </div>

      {isLoading && <Skeleton className="h-12 w-full" />}

      {!isLoading && invites?.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("invites.empty")}</p>
      )}

      {!isLoading && invites && invites.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-3 px-3 py-2.5 text-sm"
            >
              <IconMailPlus className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{invite.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {invite.role} ·{" "}
                  {t("invites.expires", { date: formatDate(invite.expiresAt) })}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRevokeTarget(invite)}
              >
                {t("invites.revoke")}
              </Button>
            </div>
          ))}
        </div>
      )}

      <DynamicDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        title={t("invites.inviteTitle")}
        description={t("invites.inviteDescription")}
        footer={
          <Button
            type="submit"
            form="invite-form"
            disabled={form.formState.isSubmitting}
            className="w-full"
          >
            {t("invites.invite")}
          </Button>
        }
      >
        <form id="invite-form" onSubmit={form.handleSubmit(handleInvite)} className="flex flex-col gap-3">
          <Field data-invalid={!!form.formState.errors.email}>
            <FieldLabel htmlFor="invite-email">{t("invites.emailLabel")}</FieldLabel>
            <Input
              id="invite-email"
              type="email"
              placeholder={t("invites.emailPlaceholder")}
              autoFocus
              {...form.register("email")}
            />
            <FieldError errors={[form.formState.errors.email]} />
          </Field>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="invite-role">{t("invites.roleLabel")}</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">{t("invites.roleMember")}</SelectItem>
                    <SelectItem value="admin">{t("invites.roleAdmin")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
        </form>
      </DynamicDialog>

      <DynamicDialog
        open={!!newInviteUrl}
        onOpenChange={(open) => {
          if (!open) setNewInviteUrl(null);
        }}
        dismissible={false}
        title={t("invites.revealTitle")}
        description={
          newInviteEmailSent
            ? t("invites.revealDescriptionEmailed")
            : t("invites.revealDescription")
        }
        footer={
          <Button type="button" className="w-full" onClick={() => setNewInviteUrl(null)}>
            {t("invites.revealDone")}
          </Button>
        }
      >
        <div className="flex items-center gap-2 rounded-lg border bg-muted p-2">
          <code className="flex-1 overflow-x-auto whitespace-nowrap text-sm">
            {newInviteUrl}
          </code>
          <Button type="button" variant="outline" size="icon" onClick={copyInviteUrl}>
            <IconCopy size={14} />
          </Button>
        </div>
      </DynamicDialog>

      <DeleteDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title={t("invites.revokeConfirmTitle")}
        description={t("invites.revokeConfirmDescription")}
        confirm={{ type: "simple" }}
        confirmLabel={t("invites.revoke")}
        onConfirm={handleRevoke}
      />
    </div>
  );
}
