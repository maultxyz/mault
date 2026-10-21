import {
  MOBILE_ACCOUNT_PATH,
  MOBILE_SCAN_PAIR_PATH,
  MOBILE_SCAN_PATH,
  MOBILE_SORTER_PATH,
} from "@/lib/constants/nav";
import AuthGuard from "@/app/routes/auth-guard";
import ErrorPage from "@/app/routes/error";
import NotFoundPage from "@/app/routes/not-found";
import { RequireCollectionDialog } from "@/components/require-collection-dialog";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";
import { CALIBRATE_PATH } from "@/lib/constants/calibration";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePiHost, usePiHostState } from "@/hooks/use-pi-host";
import { useRole } from "@/hooks/use-role";
import { ALL_NAMESPACES, withNamespaces } from "@/lib/i18n";
import { SORTERS_OVERVIEW_PATH } from "@/lib/constants/scanner";
import { STORAGE_PATH } from "@/lib/constants/storage";
import { STATS_PATH } from "@/lib/constants/stats";
import { lazy, Suspense, useEffect } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { SORTING_RULES_PATH } from "@/lib/constants/bins";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { AUTH_PROVIDER } from "@/lib/constants/auth";
import { SELF_HOST_PATH } from "@/lib/constants/self-host";

const LandingPage = lazy(
  withNamespaces(
    () => import("@/app/routes/index"),
    ["common", "landing", "scanner", "cards", "bins", "collections"],
  ),
);
const BuildGuidePage = lazy(
  withNamespaces(() => import("@/app/routes/build"), ["common", "build"]),
);
const SelfHostPage = lazy(
  withNamespaces(() => import("@/app/routes/self-host"), ["common", "selfhost"]),
);
const DiscordBotPage = lazy(
  withNamespaces(
    () => import("@/app/routes/discord-bot"),
    ["common", "discordBot"],
  ),
);
const WatchPage = lazy(
  withNamespaces(
    () => import("@/app/routes/watch"),
    ["common", "scanner", "cards", "collections"],
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
const CollectionViewPage = lazy(
  () => import("@/app/routes/app/collection-view"),
);
const BinsPage = lazy(() => import("@/app/routes/app/bins"));
const CalibrateLayout = lazy(() => import("@/app/routes/app/calibrate/layout"));
const CalibrateConnectionPage = lazy(
  () => import("@/app/routes/app/calibrate/connection"),
);
const CalibrateSorterLayoutPage = lazy(
  () => import("@/app/routes/app/calibrate/sorter-layout"),
);
const CalibrateTestPage = lazy(
  () => import("@/app/routes/app/calibrate/test"),
);
const CalibrateScanRegionPage = lazy(
  () => import("@/app/routes/app/calibrate/scan-region"),
);
const CalibrateCalibrationPage = lazy(
  () => import("@/app/routes/app/calibrate/calibration"),
);
const AdminLayout = lazy(() => import("@/app/routes/app/admin/layout"));
const AdminCardsPage = lazy(() => import("@/app/routes/app/admin/cards"));
const AdminGameEditorPage = lazy(
  () => import("@/app/routes/app/admin/game-editor"),
);
const AdminUsersPage = lazy(() => import("@/app/routes/app/admin/users"));
const AdminPlansPage = lazy(() => import("@/app/routes/app/admin/plans"));
const AdminDiscordPage = lazy(() => import("@/app/routes/app/admin/discord"));
const AdminDeletedPage = lazy(() => import("@/app/routes/app/admin/deleted"));
const AdminHardwarePage = lazy(
  () => import("@/app/routes/app/admin/hardware"),
);
const AdminDeveloperPage = lazy(
  () => import("@/app/routes/app/admin/developer"),
);
const MonitorSessionsPage = lazy(loadMonitorSessionsPage);
const MonitorPage = lazy(() => import("@/app/routes/app/monitor"));
const PhoneCameraPage = lazy(() => import("@/app/routes/app/phone-camera"));
const ScanPage = lazy(() => import("@/app/routes/app/scan"));
const ScanPairPage = lazy(() => import("@/app/routes/app/scan-pair"));
const SorterPage = lazy(() => import("@/app/routes/app/sorter"));
const MePage = lazy(() => import("@/app/routes/app/me"));
const SettingsLayout = lazy(() => import("@/app/routes/app/settings/layout"));
const SettingsIndexRedirect = lazy(
  () => import("@/app/routes/app/settings/index"),
);
const SettingsGeneralPage = lazy(
  () => import("@/app/routes/app/settings/general"),
);
const SettingsOrganizationPage = lazy(
  () => import("@/app/routes/app/settings/organization"),
);
const SettingsBillingPage = lazy(
  () => import("@/app/routes/app/settings/billing"),
);
const SettingsScanningPage = lazy(
  () => import("@/app/routes/app/settings/scanning"),
);
const SettingsPricingPage = lazy(
  () => import("@/app/routes/app/settings/pricing"),
);
const SettingsSoundsPage = lazy(
  () => import("@/app/routes/app/settings/sounds"),
);
const SettingsIntegrationsPage = lazy(
  () => import("@/app/routes/app/settings/integrations"),
);
const SettingsNotificationsPage = lazy(
  () => import("@/app/routes/app/settings/notifications"),
);
const AccountPage = lazy(() => import("@/app/routes/app/account"));
const HealthPage = lazy(() => import("@/app/routes/app/health"));
const SortersPage = lazy(() => import("@/app/routes/app/sorters"));
const StoragePage = lazy(() => import("@/app/routes/app/storage"));
const StatsPage = lazy(() => import("@/app/routes/app/stats"));

// Otherwise the app shell's chunks only start downloading once the auth
// session resolves, then the landing route's once the loading gate lifts.
// A failed preload is ignored here, the lazy() route surfaces it instead.
function AppChunkPreloader() {
  const isMobile = useIsMobile();
  const piHost = usePiHost();
  useEffect(() => {
    const ignoreFailure = () => {};
    loadAppLayout().catch(ignoreFailure);
    (isMobile && !piHost ? loadMonitorSessionsPage() : loadScannerPage()).catch(
      ignoreFailure,
    );
  }, [isMobile, piHost]);
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
  const { pathname } = useLocation();
  const { piHost, settled } = usePiHostState();
  const onCalibrate =
    pathname === CALIBRATE_PATH || pathname.startsWith(`${CALIBRATE_PATH}/`);
  const onScanner = pathname === "/app" || pathname.startsWith("/app/cards/");
  const piPage = onCalibrate || onScanner;
  if (!isMobile) return <Outlet />;
  if (piPage && !settled) return null;
  if (piPage && piHost) return <Outlet />;
  return <Navigate to="/app/monitor" replace />;
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
        path: SELF_HOST_PATH,
        element: <SelfHostPage />,
      },
      {
        path: "/discord-bot",
        element: <DiscordBotPage />,
      },
      {
        path: "/watch/:collectionGuid",
        element: <WatchPage />,
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
                        path: "/app/collections/:collectionGuid",
                        element: <CollectionViewPage />,
                      },
                      {
                        path: "/app/collections/:collectionGuid/cards/:scanId",
                        element: <CollectionViewPage />,
                      },
                      {
                        path: "/app/collections/:collectionGuid/bins",
                        element: <Navigate to={SORTING_RULES_PATH} replace />,
                      },
                      {
                        path: "/app/calibrate",
                        element: <CalibrateLayout />,
                        children: [
                          {
                            index: true,
                            element: <Navigate to="connection" replace />,
                          },
                          {
                            path: "modules",
                            element: <Navigate to="../layout" replace />,
                          },
                          {
                            path: "connection",
                            element: <CalibrateConnectionPage />,
                          },
                          {
                            path: "layout",
                            element: <CalibrateSorterLayoutPage />,
                          },
                          {
                            path: "scan-region",
                            element: <CalibrateScanRegionPage />,
                          },
                          {
                            path: "calibration",
                            element: <CalibrateCalibrationPage />,
                          },
                          {
                            path: "test",
                            element: <CalibrateTestPage />,
                          },
                        ],
                      },
                    ],
                  },
                  {
                    path: SORTERS_OVERVIEW_PATH,
                    element: <SortersPage />,
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
                            path: "cards/games/new",
                            element: <AdminGameEditorPage />,
                          },
                          {
                            path: "cards/games/:guid",
                            element: <AdminGameEditorPage />,
                          },
                          {
                            path: "games",
                            element: <Navigate to="../cards" replace />,
                          },
                          {
                            path: "users",
                            element: <AdminUsersPage />,
                          },
                          {
                            path: "plans",
                            element: <AdminPlansPage />,
                          },
                          {
                            path: "discord",
                            element: <AdminDiscordPage />,
                          },
                          {
                            path: "discord-channels",
                            element: <Navigate to="../discord" replace />,
                          },
                          {
                            path: "announcements",
                            element: <Navigate to="../discord" replace />,
                          },
                          {
                            path: "deleted",
                            element: <AdminDeletedPage />,
                          },
                          {
                            path: "unmatched",
                            element: <Navigate to="../deleted" replace />,
                          },
                          {
                            path: "hardware",
                            element: <AdminHardwarePage />,
                          },
                          {
                            path: "servos",
                            element: <Navigate to="../hardware" replace />,
                          },
                          {
                            path: "device",
                            element: <Navigate to="../hardware" replace />,
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
                path: MOBILE_SCAN_PATH,
                element: <ScanPage />,
              },
              {
                path: STORAGE_PATH,
                element: <StoragePage />,
              },
              {
                path: MOBILE_SCAN_PAIR_PATH,
                element: <ScanPairPage />,
              },
              {
                path: MOBILE_SORTER_PATH,
                element: <SorterPage />,
              },
              {
                element: <RequireCollectionGuard />,
                children: [
                  {
                    path: SORTING_RULES_PATH,
                    element: <BinsPage />,
                  },
                ],
              },
              {
                path: MOBILE_ACCOUNT_PATH,
                element: <MePage />,
              },
              {
                path: SETTINGS_PATHS.root,
                element: <SettingsLayout />,
                children: [
                  { index: true, element: <SettingsIndexRedirect /> },
                  { path: "general", element: <SettingsGeneralPage /> },
                  {
                    path: "organization",
                    element: <SettingsOrganizationPage />,
                  },
                  { path: "billing", element: <SettingsBillingPage /> },
                  { path: "scanning", element: <SettingsScanningPage /> },
                  { path: "pricing", element: <SettingsPricingPage /> },
                  { path: "sounds", element: <SettingsSoundsPage /> },
                  {
                    path: "notifications",
                    element: <SettingsNotificationsPage />,
                  },
                  {
                    path: "integrations",
                    element: <SettingsIntegrationsPage />,
                  },
                ],
              },
              {
                path: "/app/sounds",
                element: <Navigate to={SETTINGS_PATHS.sounds} replace />,
              },
              {
                path: "/app/integrations",
                element: <Navigate to={SETTINGS_PATHS.integrations} replace />,
              },
              {
                path: "/app/health",
                element: <HealthPage />,
              },
              {
                path: STATS_PATH,
                element: <StatsPage />,
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
