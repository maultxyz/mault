import { queryOptions } from "@tanstack/react-query";
import type { Result } from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, unwrap } from "@/lib/api/client";
import { neonAuthRequest } from "@/lib/auth/neon-backend";
import { getSessionToken } from "@/lib/auth/session";
import { AUTH_PROVIDER } from "@/lib/constants/config";
import type { NeonFullOrganization, OrgDetails, OrgInvitation, OrgRole } from "@/lib/interfaces/settings";

const isLocal = AUTH_PROVIDER === "local";

function token(): string {
  const value = getSessionToken();
  if (!value) throw new Error("Not signed in.");
  return value;
}

async function loadOrganization(orgId: string, orgName: string): Promise<OrgDetails> {
  if (isLocal) {
    const invitations = await unwrap(apiGet<Result<OrgInvitation[]>>("/api/local-auth/invites"));
    return { name: orgName, members: [], invitations, canManageMembers: false, canRename: false };
  }
  const org = await neonAuthRequest<NeonFullOrganization>(
    `/organization/get-full-organization?organizationId=${encodeURIComponent(orgId)}`,
    token(),
  );
  return {
    name: org.name,
    members: (org.members ?? []).map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      name: m.user?.name ?? "",
      email: m.user?.email ?? "",
    })),
    invitations: (org.invitations ?? []).filter((i) => i.status === "pending"),
    canManageMembers: true,
    canRename: true,
  };
}

export const organizationQueryOptions = (orgId: string | null, orgName: string) =>
  queryOptions({
    queryKey: ["organization", orgId] as const,
    queryFn: () => loadOrganization(orgId ?? "", orgName),
    enabled: !!orgId,
  });

export async function renameOrganization(orgId: string, name: string): Promise<void> {
  await neonAuthRequest("/organization/update", token(), { organizationId: orgId, data: { name } });
}

export async function inviteMember(orgId: string, email: string, role: OrgRole): Promise<void> {
  if (isLocal) {
    await unwrap(apiPost<Result<unknown>>("/api/local-auth/invites", { email, role }));
    return;
  }
  await neonAuthRequest("/organization/invite-member", token(), { organizationId: orgId, email, role });
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  if (isLocal) {
    await unwrap(apiDelete<Result<unknown>>(`/api/local-auth/invites/${invitationId}`));
    return;
  }
  await neonAuthRequest("/organization/cancel-invitation", token(), { invitationId });
}

export async function updateMemberRole(orgId: string, memberId: string, role: OrgRole): Promise<void> {
  await neonAuthRequest("/organization/update-member-role", token(), { organizationId: orgId, memberId, role });
}

export async function removeMember(orgId: string, memberId: string): Promise<void> {
  await neonAuthRequest("/organization/remove-member", token(), { organizationId: orgId, memberIdOrEmail: memberId });
}

export async function deleteOrganization(orgId: string): Promise<void> {
  if (isLocal) {
    await unwrap(apiDelete<Result<unknown>>("/api/local-auth/organizations"));
    return;
  }
  await neonAuthRequest("/organization/delete", token(), { organizationId: orgId });
}
