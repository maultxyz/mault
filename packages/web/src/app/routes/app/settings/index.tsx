import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { BILLING_RETURN_PARAM } from "@/lib/constants/settings";
import { Navigate, useLocation } from "react-router-dom";

export default function SettingsIndexRedirect() {
  const location = useLocation();
  const fromCheckout =
    AUTH_PROVIDER !== "local" &&
    new URLSearchParams(location.search).has(BILLING_RETURN_PARAM);

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
