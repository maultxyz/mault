import { SettingsMobileMenu } from "@/components/settings-mobile-menu";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { BILLING_RETURN_PARAM } from "@/lib/constants/settings";
import { Navigate, useLocation } from "react-router-dom";

export default function SettingsIndexRedirect() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const fromCheckout =
    AUTH_PROVIDER !== "local" &&
    new URLSearchParams(location.search).has(BILLING_RETURN_PARAM);

  if (isMobile && !fromCheckout) return <SettingsMobileMenu />;

  return (
    <Navigate
      to={{
        pathname: fromCheckout ? "billing" : "general",
        search: location.search,
      }}
      replace
    />
  );
}
