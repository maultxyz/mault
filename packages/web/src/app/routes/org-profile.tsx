import NotFoundPage from "@/app/routes/not-found";
import {
  orgProfileSource,
  publicOrgProfileQueryOptions,
} from "@/features/org-profile/api/org-profile";
import { PublicOrgProfileView } from "@/features/org-profile/components/public-org-profile";
import { PublicOrgProfileSkeleton } from "@/features/org-profile/components/public-org-profile-skeleton";
import { isPublicCardsUnavailableError } from "@/features/public-cards/api/public-cards";
import { ShareLinkStatusScreen } from "@/features/public-cards/components/share-link-status-screen";
import { PriceSourceProvider } from "@/hooks/use-price-source";
import { ORG_PROFILE_ROUTE_SEGMENT_PARAM } from "@/lib/constants/org-profile";
import type { OrgProfilePageContentProps } from "@/lib/interfaces/org-profile";
import { publicQueryClient } from "@/lib/query-client";
import {
  parseOrgProfileHandleFromPath,
  toConditionMultipliers,
  type OrgPricing,
} from "@magic-vault/shared";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

function OrgProfileContent({ handle }: OrgProfilePageContentProps) {
  const { t } = useTranslation("org-profile");
  const source = useMemo(() => orgProfileSource(handle), [handle]);
  const { data: info, isPending, isFetching, error, refetch } = useQuery(
    publicOrgProfileQueryOptions(source),
  );
  const validInfo = info?.handle === handle ? info : undefined;
  const pricing = useMemo<OrgPricing | null>(
    () =>
      validInfo
        ? {
            source: validInfo.priceSource,
            conditionMultipliers: toConditionMultipliers(validInfo.conditionMultipliers),
          }
        : null,
    [validInfo],
  );

  useEffect(() => {
    if (validInfo) document.title = `${validInfo.displayName} · Mault`;
  }, [validInfo]);

  if (!validInfo || !pricing) {
    if (isPending || isFetching) return <PublicOrgProfileSkeleton />;
    return (
      <ShareLinkStatusScreen
        status={isPublicCardsUnavailableError(error) ? "failed" : "invalid"}
        invalidTitle={t("public.notFoundTitle")}
        invalidDescription={t("public.notFoundDescription")}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <PriceSourceProvider value={pricing}>
      <PublicOrgProfileView source={source} info={validInfo} />
    </PriceSourceProvider>
  );
}

export default function OrgProfilePage() {
  const params = useParams();
  const handle = parseOrgProfileHandleFromPath(params[ORG_PROFILE_ROUTE_SEGMENT_PARAM] ?? "");
  if (!handle) return <NotFoundPage />;
  return (
    <QueryClientProvider client={publicQueryClient}>
      <OrgProfileContent handle={handle} />
    </QueryClientProvider>
  );
}
