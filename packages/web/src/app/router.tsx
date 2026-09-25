import AuthGuard from "@/app/routes/auth-guard";
import ErrorPage from "@/app/routes/error";
import NotFoundPage from "@/app/routes/not-found";
import { RequireCollectionDialog } from "@/components/require-collection-dialog";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useRole } from "@/hooks/use-role";
import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { ALL_NAMESPACES, withNamespaces } from "@/lib/i18n";
import { lazy, Suspense, useEffect } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

const LandingPage = lazy(
  withNamespaces(
    () => import("@/app/routes/index"),
    ["common", "landing", "scanner", "cards", "bins", "collections"],
  ),
);
const BuildGuidePage = lazy(
  withNamespaces(() => import("@/app/routes/build"), ["common", "build"]),
);
const DiscordBotPage = lazy(
  withNamespaces(
    () => import("@/app/routes/discord-bot"),
    ["common", "discordBot"],
  ),
);
const PrivacyPolicyPage = lazy(
  withNamespaces(() => import("@/app/routes/privacy"), ["common", "legal"]),
);
const TermsOfServicePage = lazy(
  withNamespaces(() => import("@/app/routes/terms"), ["common", "legal"]),
);
const AuthPage = lazy(
  withNamespaces(() => import("@/app/routes/neon/auth"), ["common", "auth"]),
);
const AuthLocalPage = lazy(
  withNamespaces(() => import("@/app/routes/local/auth"), ["common", "auth"]),
);
const AuthJoinPage = lazy(
  withNamespaces(() => import("@/app/routes/local/join"), ["common", "auth"]),
);
const AuthForgotPasswordPage = lazy(
  withNamespaces(
    () => import("@/app/routes/local/forgot-password"),
    ["common", "auth"],
  ),
);
const AuthResetPasswordPage = lazy(
  withNamespaces(
    () => import("@/app/routes/local/reset-password"),
    ["common", "auth"],
  ),
);
const VerifyEmailPage = lazy(
  withNamespaces(
    () => import("@/app/routes/app/neon/verify-email"),
    ALL_NAMESPACES,
  ),
);
const loadAppLayout = withNamespaces(
  () => import("@/app/routes/app/layout"),
  ALL_NAMESPACES,
);
const loadScannerPage = () => import("@/app/routes/app/index");
const loadMonitorSessionsPage = () =>
  import("@/app/routes/app/monitor-sessions");
const AppLayout = lazy(loadAppLayout);
const ScannerPage = lazy(loadScannerPage);
const CollectionsPage = lazy(() => import("@/app/routes/app/collections"));
const BinsPage = lazy(() => import("@/app/routes/app/bins"));
const CalibrateLayout = lazy(() => import("@/app/routes/app/calibrate/layout"));
const CalibrateModulesPage = lazy(
  () => import("@/app/routes/app/calibrate/modules"),
);
const CalibrateScanRegionPage = lazy(
  () => import("@/app/routes/app/calibrate/scan-region"),
);
const CalibrateCalibrationPage = lazy(
  () => import("@/app/routes/app/calibrate/calibration"),
);
const AdminLayout = lazy(() => import("@/app/routes/app/admin/layout"));
const AdminCardsPage = lazy(() => import("@/app/routes/app/admin/cards"));
const AdminGamesPage = lazy(() => import("@/app/routes/app/admin/games"));
const AdminUsersPage = lazy(() => import("@/app/routes/app/admin/users"));
const AdminAnnouncementsPage = lazy(
  () => import("@/app/routes/app/admin/announcements"),
);
const AdminServosPage = lazy(() => import("@/app/routes/app/admin/servos"));
const AdminDeveloperPage = lazy(
  () => import("@/app/routes/app/admin/developer"),
);
const MonitorSessionsPage = lazy(loadMonitorSessionsPage);
const MonitorPage = lazy(() => import("@/app/routes/app/monitor"));
const PhoneCameraPage = lazy(() => import("@/app/routes/app/phone-camera"));
const SettingsPage = lazy(() => import("@/app/routes/app/settings"));
const AccountPage = lazy(() => import("@/app/routes/app/account"));
const HealthPage = lazy(() => import("@/app/routes/app/health"));

// Otherwise the app shell's chunks only start downloading once the auth
// session resolves, then the landing route's once the loading gate lifts.
// A failed preload is ignored here, the lazy() route surfaces it instead.
function AppChunkPreloader() {
  const isMobile = useIsMobile();
  useEffect(() => {
    const ignoreFailure = () => {};
    loadAppLayout().catch(ignoreFailure);
    (isMobile ? loadMonitorSessionsPage() : loadScannerPage()).catch(
      ignoreFailure,
    );
  }, [isMobile]);
  return null;
}

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
        element: AUTH_PROVIDER === "local" ? <AuthLocalPage /> : <AuthPage />,
      },
      // Local-mode only - Neon's prebuilt <AuthView> already covers
      // invites/password reset. React Router ranks static segments above
      // dynamic ones regardless of array order, so these still take
      // priority over /auth/:path above.
      ...(AUTH_PROVIDER === "local"
        ? [
            { path: "/auth/join", element: <AuthJoinPage /> },
            {
              path: "/auth/forgot-password",
              element: <AuthForgotPasswordPage />,
            },
            {
              path: "/auth/reset-password",
              element: <AuthResetPasswordPage />,
            },
          ]
        : []),
      {
        // Scopes the branded "Loading your vault" screen to the /app/*
        // portion only - the outer Suspense in main.tsx has no fallback so
        // the public marketing pages don't flash it while their own chunk
        // loads.
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <AppChunkPreloader />
            <AuthGuard />
          </Suspense>
        ),
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
                        path: "/app/cards/:scanId",
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
                        element: <CalibrateLayout />,
                        children: [
                          {
                            index: true,
                            element: <Navigate to="modules" replace />,
                          },
                          {
                            path: "modules",
                            element: <CalibrateModulesPage />,
                          },
                          {
                            path: "scan-region",
                            element: <CalibrateScanRegionPage />,
                          },
                          {
                            path: "calibration",
                            element: <CalibrateCalibrationPage />,
                          },
                        ],
                      },
                    ],
                  },
                  {
                    element: <AdminGuard />,
                    children: [
                      {
                        path: "/app/admin",
                        element: <AdminLayout />,
                        children: [
                          {
                            index: true,
                            element: <Navigate to="cards" replace />,
                          },
                          {
                            path: "cards",
                            element: <AdminCardsPage />,
                          },
                          {
                            path: "games",
                            element: <AdminGamesPage />,
                          },
                          {
                            path: "users",
                            element: <AdminUsersPage />,
                          },
                          {
                            path: "announcements",
                            element: <AdminAnnouncementsPage />,
                          },
                          {
                            path: "servos",
                            element: <AdminServosPage />,
                          },
                          {
                            path: "developer",
                            element: <AdminDeveloperPage />,
                          },
                        ],
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
