import { neon } from "@/lib/auth/client";
import { sortLinkedSignInAccounts, type LinkedSignInAccount } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const linkedSignInAccountsQueryKey = ["me", "linked-sign-in-accounts"] as const;

async function listLinkedSignInAccounts(): Promise<LinkedSignInAccount[]> {
  const { data, error } = await neon.auth.listAccounts();
  if (error) throw new Error(error.message);
  return sortLinkedSignInAccounts(data ?? []);
}

export const linkedSignInAccountsQueryOptions = () =>
  queryOptions({
    queryKey: linkedSignInAccountsQueryKey,
    queryFn: listLinkedSignInAccounts,
    staleTime: 0,
  });
