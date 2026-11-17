import type { RequestWithToastsOptions } from "@/lib/interfaces/toast";
import { toast } from "@/lib/toast";
import type { Result } from "@magic-vault/shared";

export async function requestWithToasts<TData>(
  sendRequest: () => Promise<Result<TData>>,
  {
    successMessage,
    failureMessage,
    onSuccess,
  }: RequestWithToastsOptions<TData>,
): Promise<void> {
  try {
    const result = await sendRequest();
    if (!result.success || !result.data) {
      toast.error(result.message ?? failureMessage);
      return;
    }
    onSuccess(result.data);
    toast.success(successMessage);
  } catch {
    toast.error(failureMessage);
  }
}
