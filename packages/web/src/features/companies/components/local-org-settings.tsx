import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { useOrgLocal } from "@/features/companies/api/use-organization.local";
import { setLocalActiveOrgId } from "@/lib/auth/local-active-org";
import { localDelete } from "@/lib/auth/local-api";
import { LOCAL_ORGS_QUERY_KEY } from "@/lib/constants/query";
import { invalidateAppQueries } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function LocalOrgSettings() {
  const { t } = useTranslation("companies");
  const { t: tSettings } = useTranslation("settings");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrgLocal();
  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false);

  async function handleDelete() {
    if (!activeOrg) return;
    try {
      const res = await localDelete<{ success: boolean; message?: string }>(
        "/api/local-auth/organizations",
      );
      if (!res.success) throw new Error(res.message);
      setLocalActiveOrgId(null);
      await queryClient.invalidateQueries({ queryKey: [LOCAL_ORGS_QUERY_KEY] });
      await invalidateAppQueries(queryClient);
      toast.success(t("orgSettings.organizationDeleted"));
    } catch (e: unknown) {
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : t("orgSettings.failedToDelete"),
      );
    }
  }

  // Deleting is the only org-level setting local mode has, and own-auth
  // restricts it to the owner, so the whole section is owner-only.
  if (activeOrg?.role !== "owner") return null;

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-4">
      <h2 className="text-sm font-semibold font-heading">
        {tSettings("organizations.heading")}
      </h2>
      <div className="flex flex-col gap-3 bg-destructive rounded-lg p-4 text-destructive-foreground">
        <h3 className="text-sm font-semibold font-heading">
          {t("orgSettings.dangerZoneHeading")}
        </h3>
        <p className="text-sm">
          {t("orgSettings.deleteWarning", { name: activeOrg.name })}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDeleteOrgOpen(true)}
        >
          {t("orgSettings.deleteOrganization")}
        </Button>
      </div>

      <DeleteDialog
        open={deleteOrgOpen}
        onOpenChange={setDeleteOrgOpen}
        title={t("orgSettings.deleteOrganization")}
        description={t("orgSettings.deleteOrgDescription", {
          name: activeOrg.name,
        })}
        confirm={{ type: "name", name: activeOrg.name }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
