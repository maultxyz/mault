import { AppLoadingScreen } from "@/components/app-loading-screen";
import { neon } from "@/lib/auth/client";
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
      redirectTo="/app"
      account={{
        basePath: "/app/account",
      }}
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
