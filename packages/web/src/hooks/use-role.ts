import { useAuthSession } from "@/lib/auth";

export function useRole() {
  const { data, isPending } = useAuthSession();
  const role = data?.user?.role ?? null;

  return {
    role,
    isPending,
    isAdmin: role === "admin",
    hasRole: (...roles: string[]) => role !== null && roles.includes(role),
  };
}
