import { useAuthSession } from "@/lib/auth";
import {
  PLATFORM_ADMIN_ROLE,
  PLATFORM_MODERATOR_ROLE,
} from "@magic-vault/shared";

export function useRole() {
  const { data, isPending } = useAuthSession();
  const role = data?.user?.role ?? null;
  const isAdmin = role === PLATFORM_ADMIN_ROLE;
  const isModerator = role === PLATFORM_MODERATOR_ROLE;

  return {
    role,
    isPending,
    isAdmin,
    isModerator,
    isStaff: isAdmin || isModerator,
    hasRole: (...roles: string[]) => role !== null && roles.includes(role),
  };
}
