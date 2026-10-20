import { DeletedItemsManager } from "@/features/admin/components/deleted-items-manager";
import { UnmatchedRetryManager } from "@/features/admin/components/unmatched-retry-manager";

export default function AdminDeletedPage() {
  return (
    <>
      <DeletedItemsManager />

      <UnmatchedRetryManager />
    </>
  );
}
