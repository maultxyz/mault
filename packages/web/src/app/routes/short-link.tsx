import { ShareLinkStatusScreen } from "@/features/public-cards/components/share-link-status-screen";
import { shortLinkQueryOptions } from "@/features/share-links/api/short-links";
import { publicQueryClient } from "@/lib/query-client";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

function ShortLinkRedirect() {
  const { t } = useTranslation("common");
  const { shortCode = "" } = useParams<{ shortCode: string }>();
  const { data: target, isPending, isError, refetch } = useQuery(
    shortLinkQueryOptions(shortCode),
  );

  if (target) return <Navigate to={target.path} replace />;

  return (
    <ShareLinkStatusScreen
      status={isPending ? "checking" : isError ? "failed" : "invalid"}
      invalidTitle={t("shareLink.shortLinkInvalidTitle")}
      invalidDescription={t("shareLink.shortLinkInvalidDescription")}
      onRetry={() => void refetch()}
    />
  );
}

export default function ShortLinkPage() {
  return (
    <QueryClientProvider client={publicQueryClient}>
      <ShortLinkRedirect />
    </QueryClientProvider>
  );
}
