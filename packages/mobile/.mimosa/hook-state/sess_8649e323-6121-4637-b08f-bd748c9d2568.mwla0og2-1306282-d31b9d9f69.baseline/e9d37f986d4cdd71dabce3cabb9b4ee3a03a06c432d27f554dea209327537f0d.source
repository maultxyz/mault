import { PLATFORM_ADMIN_ROLE, PLATFORM_MODERATOR_ROLE } from "@magic-vault/shared";
import { useSession } from "@/lib/auth/session";
import type { PlatformRole } from "@/lib/interfaces/admin";

export function useRole(): PlatformRole {
  const { user } = useSession();
  const role = user?.role ?? null;
  const isAdmin = role === PLATFORM_ADMIN_ROLE;
  const isModerator = role === PLATFORM_MODERATOR_ROLE;
  return { role, isAdmin, isModerator, isStaff: isAdmin || isModerator };
}
