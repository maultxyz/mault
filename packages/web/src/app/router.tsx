import ErrorPage from "@/app/routes/error";
import NotFoundPage from "@/app/routes/not-found";
import { RequireCollectionDialog } from "@/components/require-collection-dialog";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useRole } from "@/hooks/use-role";
import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { lazy } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

const AuthGuard = lazy(() => import("@/app/routes/auth-guard"));

const LandingPage = lazy(() => import("@/app/routes/index"));
const BuildGuidePage = lazy(() => import("@/app/routes/build"));
const DiscordBotPage = lazy(() => import("@/app/routes/discord-bot"));
const PrivacyPolicyPage = lazy(() => import("@/app/routes/privacy"));
const TermsOfServicePage = lazy(() => import("@/app/routes/terms"));
const AuthPage = lazy(() => import("@/app/routes/auth"));
const AuthJoinPage = lazy(() => import("@/app/routes/auth-join"));
const AuthForgotPasswordPage = lazy(
  () => import("@/app/routes/auth-forgot-password"),
);
const AuthResetPasswordPage = lazy(
  () => import("@/app/routes/auth-reset-password"),
);
const VerifyEmailPage = lazy(() => import("@/app/routes/app/verify-email"));
const AppLayout = lazy(() => import("@/app/routes/app/layout"));
const ScannerPage = lazy(() => import("@/app/routes/app/index"));
const CollectionsPage = lazy(() => import("@/app/routes/app/collections"));
const BinsPage = lazy(() => import("@/app/routes/app/bins"));
const CalibratePage = lazy(() => import("@/app/routes/app/calibrate"));
const AdminPage = lazy(() => import("@/app/routes/app/admin"));
const MonitorSessionsPage = lazy(
  () => import("@/app/routes/app/monitor-sessions"),
);
const MonitorPage = lazy(() => import("@/app/routes/app/monitor"));
const PhoneCameraPage = lazy(() => import("@/app/routes/app/phone-camera"));
const SettingsPage = lazy(() => import("@/app/routes/app/settings"));
const AccountPage = lazy(() => import("@/app/routes/app/account"));
const HealthPage = lazy(() => import("@/app/routes/app/health"));

function AdminGuard() {
  const { isAdmin, isPending } = useRole();
  if (isPending) return null;
  if (!isAdmin) return <Navigate to="/app" replace />;
  return <Outlet />;
}

function DesktopOnlyGuard() {
  const isMobile = useIsMobile();
  if (isMobile) return <Navigate to="/app/monitor" replace />;
  return <Outlet />;
}

function RequireCollectionGuard() {
  return (
    <>
      <RequireCollectionDialog />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      },
      {
        path: "/build",
        element: <BuildGuidePage />,
      },
      {
        path: "/discord-bot",
        element: <DiscordBotPage />,
      },
      {
        path: "/privacy",
        element: <PrivacyPolicyPage />,
      },
      {
        path: "/terms",
        element: <TermsOfServicePage />,
      },
      {
        path: "/auth/:path",
        element: <AuthPage />,
      },
      { path: "/auth/forgot-password", element: <AuthForgotPasswordPage /> },
      { path: "/auth/reset-password", element: <AuthResetPasswordPage /> },
      ...(AUTH_PROVIDER === "local"
        ? [{ path: "/auth/join", element: <AuthJoinPage /> }]
        : []),
      {
        element: <AuthGuard />,
        children: [
          {
            path: "/app/verify-email",
            element:
              AUTH_PROVIDER === "local" ? (
                <Navigate to="/app" replace />
              ) : (
                <VerifyEmailPage />
              ),
          },
          {
            element: <AppLayout />,
            children: [
              {
                element: <DesktopOnlyGuard />,
                children: [
                  {
                    element: <RequireCollectionGuard />,
                    children: [
                      {
                        path: "/app",
                        element: <ScannerPage />,
                      },
                      {
                        path: "/app/collections",
                        element: <CollectionsPage />,
                      },
                      {
                        path: "/app/collections/:collectionGuid/bins",
                        element: <BinsPage />,
                      },
                      {
                        path: "/app/calibrate",
                        element: <CalibratePage />,
                      },
                    ],
                  },
                  {
                    element: <AdminGuard />,
                    children: [
                      {
                        path: "/app/admin",
                        element: <AdminPage />,
                      },
                    ],
                  },
                ],
              },
              {
                path: "/app/monitor",
                element: <MonitorSessionsPage />,
              },
              {
                path: "/app/monitor/:collectionGuid",
                element: <MonitorPage />,
              },
              {
                path: "/app/monitor/:collectionGuid/camera",
                element: <PhoneCameraPage />,
              },
              {
                path: "/app/settings",
                element: <SettingsPage />,
              },
              {
                path: "/app/health",
                element: <HealthPage />,
              },
              {
                path: "/app/account/:path",
                element: <AccountPage />,
              },
            ],
          },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
