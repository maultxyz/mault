import { AppLoadingScreen } from "@/components/app-loading-screen";
import { neon } from "@/lib/auth/client";
import { NEON_SOCIAL_PROVIDERS } from "@/lib/constants/auth";
import {
  AuthLoading,
  RedirectToSignIn,
  SignedIn,
} from "@neondatabase/neon-js/auth/react";
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";
import { Outlet } from "react-router-dom";

export default function AuthGuard() {
  return (
    <NeonAuthUIProvider
      defaultTheme="system"
      authClient={neon.auth}
      baseURL={window.location.origin}
      redirectTo="/app"
      account={{
        basePath: "/app/account",
      }}
      social={{ providers: [...NEON_SOCIAL_PROVIDERS] }}
    >
      <AuthLoading>
        <AppLoadingScreen />
      </AuthLoading>
      <SignedIn>
        <Outlet />
      </SignedIn>
      <RedirectToSignIn />
    </NeonAuthUIProvider>
  );
}
