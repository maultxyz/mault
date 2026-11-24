import {
  SHARED_CARD_PATH_PREFIX,
  SHARED_STORAGE_PATH_PREFIX,
  SHOP_CATALOG_PATH_PREFIX,
  SHORT_LINK_NOT_FOUND_PATH,
  MOBILE_SOCIAL_SIGN_IN_CALLBACK_PATH,
} from "@magic-vault/shared";
import {
  HOME_PATH,
  LIBRARY_PATH,
  MOBILE_ACCOUNT_PATH,
  MOBILE_SCAN_PAIR_PATH,
  MOBILE_SCAN_PATH,
  MOBILE_SORTER_PATH,
} from "@/lib/constants/nav";
import { COLLECTIONS_PATH } from "@/lib/constants/collections";
import ErrorPage from "@/app/routes/error";
import { MarketingRoute } from "@/app/marketing-route";
import { MARKETING_PAGE_PATHS } from "@/lib/constants/marketing-pages";
import NotFoundPage from "@/app/routes/not-found";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";
import { CALIBRATE_PATH } from "@/lib/constants/calibration";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePiHostState } from "@/hooks/use-pi-host";
import { useRole } from "@/hooks/use-role";
import { useImpersonation } from "@/hooks/use-impersonation";
import { ScanningBlockedWhileImpersonating } from "@/components/scanning-blocked-while-impersonating";
import {
  ALL_NAMESPACES,
  APP_SHELL_NAMESPACES,
  withNamespaces,
} from "@/lib/i18n";
import { lazyRoute } from "@/lib/route-chunks";
import { MACHINES_ROUTE_PATH } from "@/lib/constants/machines";
import { WHATS_NEW_PATH } from "@/lib/constants/feature-highlights";
import { SORTERS_OVERVIEW_PATH } from "@/lib/constants/scanner";
import {
  STORAGE_LABELS_PATH,
  STORAGE_PATH,
  STORAGE_PICK_LIST_PATH,
} from "@/lib/constants/storage";
import {
  IN_PERSON_TRADE_PATH,
  SENT_TRADE_OFFER_PATH,
  TRADE_OFFER_PATH,
  TRADES_PATH,
} from "@/lib/constants/trade-offers";
import { STATS_PATH } from "@/lib/constants/stats";
import { CATALOG_CARD_ROUTE_PATH, SEARCH_PATH } from "@/lib/constants/search";
import { CONTROL_CARDS_PATH } from "@/lib/constants/control-cards";
import {
  MATCH_VALIDATIONS_ENABLED,
  MATCH_VALIDATIONS_PATH,
} from "@/lib/constants/match-validations";
import { PublicPageLayout } from "@/components/public-page-layout";
import { lazy, Suspense, useEffect } from "react";
import { runTasksOneByOneWhenIdle } from "@/lib/idle-tasks";
import {
  IDLE_ROUTE_PRELOAD_DELAY_MS,
  IDLE_ROUTE_PRELOAD_TIMEOUT_MS,
} from "@/lib/constants/timing";
import {
  type RouteObject,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";
import { PRESET_WORKFLOW_PATH, SORTING_RULES_PATH } from "@/lib/constants/bins";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { AUTH_PROVIDER } from "@/lib/constants/auth";
import { SERVED_FROM_PI_BUNDLE } from "@/lib/constants/pi-bundle";
import {
  INTAKE_PATH,
  intakeReceiptPath,
  LEGACY_INTAKE_PATH,
  LEGACY_PICKS_VIEW,
  LEGACY_PICKS_VIEW_PARAM,
  ORDER_PARAM,
  ORDERS_PATH,
  PICK_IMPORT_PATH,
  PACKING_SLIPS_PATH,
  PICK_BATCH_PATH,
  PICKS_PATH,
  PRICE_LABELS_PATH,
  RESERVATIONS_PATH,
  SALES_PATH,
  picksPath,
  LEGACY_REPORTS_PATH,
} from "@/lib/constants/business";

const loadAuthGuard = () => import("@/app/routes/auth-guard");
const AuthGuard = lazy(loadAuthGuard);
const RequireCollectionDialog = lazy(() =>
  import("@/components/require-collection-dialog").then((module) => ({
    default: module.RequireCollectionDialog,
  })),
);
const WatchPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/watch"),
    ["common", "scanner", "cards", "collections"],
  ),
);
const SharedStoragePage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/shared-storage"),
    ["common", "storage", "cards"],
  ),
);
const SharedCardPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/shared-card"), ["common", "cards"]),
);
const ShopCatalogPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/shop-catalog"),
    ["common", "business", "cards"],
  ),
);
const LinkNotFoundPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/link-not-found"), ["common"]),
);
const AuthPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/neon/auth"), ["common", "auth"]),
);
const MobileAuthCallbackPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/neon/mobile-auth-callback"),
    ["common", "auth"],
  ),
);
const AuthLocalPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/local/auth"), ["common", "auth"]),
);
const AuthJoinPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/local/join"), ["common", "auth"]),
);
const AuthForgotPasswordPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/local/forgot-password"),
    ["common", "auth"],
  ),
);
const AuthResetPasswordPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/local/reset-password"),
    ["common", "auth"],
  ),
);
const VerifyEmailPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/neon/verify-email"),
    ALL_NAMESPACES,
  ),
);
const loadAppLayout = withNamespaces(
  () => import("@/app/routes/app/layout"),
  APP_SHELL_NAMESPACES,
);
const loadScannerPage = () => import("@/app/routes/app/index");
const loadHomePage = () => import("@/app/routes/app/home");
const HomePage = lazyRoute(loadHomePage);
const loadLibraryPage = () => import("@/app/routes/app/library");
const loadCollectionsPage = () => import("@/app/routes/app/collections");
const loadCollectionViewPage = () => import("@/app/routes/app/collection-view");
const loadStoragePage = () => import("@/app/routes/app/storage");
const loadStatsPage = withNamespaces(
  () => import("@/app/routes/app/stats"),
  ["stats"],
);
const LibraryPage = lazyRoute(loadLibraryPage);
const GlobalSearchRedirect = lazyRoute(() => import("@/app/routes/app/search"));
const CatalogCardPage = lazyRoute(() => import("@/app/routes/app/catalog-card"));
const AppLayout = lazyRoute(loadAppLayout);
const ScannerPage = lazyRoute(loadScannerPage);
const CollectionsPage = lazyRoute(loadCollectionsPage);
const CollectionViewPage = lazyRoute(loadCollectionViewPage);
const BinsPage = lazyRoute(() => import("@/app/routes/app/bins"));
const ValidateMatchesPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/validate-matches"),
    ["matchValidations"],
  ),
);
const PresetWorkflowPage = lazyRoute(
  () => import("@/app/routes/app/preset-workflow"),
);
const CalibrateLayout = lazyRoute(() => import("@/app/routes/app/calibrate/layout"));
const CalibrateConnectionPage = lazyRoute(
  () => import("@/app/routes/app/calibrate/connection"),
);
const CalibrateSorterLayoutPage = lazyRoute(
  () => import("@/app/routes/app/calibrate/sorter-layout"),
);
const CalibrateTestPage = lazyRoute(() => import("@/app/routes/app/calibrate/test"));
const CalibrateScanRegionPage = lazyRoute(
  () => import("@/app/routes/app/calibrate/scan-region"),
);
const CalibrateCalibrationPage = lazyRoute(
  () => import("@/app/routes/app/calibrate/calibration"),
);
const AdminLayout = lazyRoute(
  withNamespaces(() => import("@/app/routes/app/admin/layout"), ["admin"]),
);
const AdminIndexPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/app/admin/index"), ["admin"]),
);
const AdminCardsPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/admin/cards"),
    ["admin", "games"],
  ),
);
const AdminGameEditorPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/admin/game-editor"),
    ["admin", "games"],
  ),
);
const AdminUsersPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/app/admin/users"), ["admin"]),
);
const AdminPlansPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/app/admin/plans"), ["admin"]),
);
const AdminDiscordPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/admin/discord"),
    ["admin", "integrations"],
  ),
);
const AdminWhatsNewPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/app/admin/whats-new"), ["admin"]),
);
const AdminSoundsPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/admin/sounds"),
    ["admin", "sounds"],
  ),
);
const AdminDeletedPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/app/admin/deleted"), ["admin"]),
);
const AdminHardwarePage = lazyRoute(
  withNamespaces(() => import("@/app/routes/app/admin/hardware"), ["admin"]),
);
const AdminShortLinksPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/admin/short-links"),
    ["admin"],
  ),
);
const AdminShareLinksPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/admin/share-links"),
    ["admin"],
  ),
);
const AdminDeveloperPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/app/admin/developer"), ["admin"]),
);
const MonitorPage = lazyRoute(() => import("@/app/routes/app/monitor"));
const WhatsNewPage = lazyRoute(() => import("@/app/routes/app/whats-new"));
const MachinesPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/machines"),
    ["common", "machines", "scanner"],
  ),
);
const PhoneCameraPage = lazyRoute(() => import("@/app/routes/app/phone-camera"));
const ScanPage = lazyRoute(() => import("@/app/routes/app/scan"));
const ScanPairPage = lazyRoute(() => import("@/app/routes/app/scan-pair"));
const SorterPage = lazyRoute(() => import("@/app/routes/app/sorter"));
const MePage = lazyRoute(
  withNamespaces(() => import("@/app/routes/app/me"), ["health"]),
);
const SettingsLayout = lazyRoute(() => import("@/app/routes/app/settings/layout"));
const SettingsIndexRedirect = lazyRoute(
  () => import("@/app/routes/app/settings/index"),
);
const SettingsGeneralPage = lazyRoute(
  () => import("@/app/routes/app/settings/general"),
);
const SettingsOrganizationPage = lazyRoute(
  () => import("@/app/routes/app/settings/organization"),
);
const SettingsBillingPage = lazyRoute(
  () => import("@/app/routes/app/settings/billing"),
);
const SettingsScanningPage = lazyRoute(
  () => import("@/app/routes/app/settings/scanning"),
);
const SettingsPricingPage = lazyRoute(
  () => import("@/app/routes/app/settings/pricing"),
);
const SettingsBusinessPage = lazyRoute(
  () => import("@/app/routes/app/settings/business"),
);
const SettingsSoundsPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/app/settings/sounds"), ["sounds"]),
);
const SettingsIntegrationsPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/settings/integrations"),
    ["integrations"],
  ),
);
const SettingsNotificationsPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/settings/notifications"),
    ["integrations", "notifications"],
  ),
);
const AccountPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/app/account"), ["account"]),
);
const HealthPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/app/health"), ["games", "health"]),
);
const SortersPage = lazyRoute(() => import("@/app/routes/app/sorters"));
const StoragePage = lazyRoute(loadStoragePage);
const TradesPage = lazyRoute(() => import("@/app/routes/app/trades"));
const InPersonTradePage = lazyRoute(
  () => import("@/app/routes/app/in-person-trade"),
);
const TradeOfferRoutePage = lazyRoute(() => import("@/app/routes/app/trade-offer"));
const SentTradeOfferRoutePage = lazyRoute(
  () => import("@/app/routes/app/sent-trade-offer"),
);
const StoragePickListPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/storage-pick-list"),
    ["csvImport"],
  ),
);
const StorageLabelsPage = lazyRoute(() => import("@/app/routes/app/storage-labels"));
const StatsPage = lazyRoute(loadStatsPage);
const BusinessOverviewPage = lazyRoute(
  withNamespaces(() => import("@/app/routes/app/business-overview"), ["stats"]),
);
const IntakePage = lazyRoute(() => import("@/app/routes/app/intake"));
const PicksPage = lazyRoute(() => import("@/app/routes/app/picks"));
const PriceLabelsPage = lazyRoute(() => import("@/app/routes/app/price-labels"));
const ReservationsPage = lazyRoute(() => import("@/app/routes/app/reservations"));
const SalesPage = lazyRoute(() => import("@/app/routes/app/sales"));
const PickBatchPage = lazyRoute(() => import("@/app/routes/app/pick-batch"));
const PackingSlipsPage = lazyRoute(() => import("@/app/routes/app/packing-slips"));
const PickImportPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/pick-import"),
    ["common", "business", "csvImport"],
  ),
);
const ControlCardsPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/control-cards"),
    ["common", "scanner", "cards"],
  ),
);
const IntakeReceiptPage = lazyRoute(
  withNamespaces(
    () => import("@/app/routes/app/intake-receipt"),
    ["common", "business"],
  ),
);

function AppChunkPreloader() {
  const isMobile = useIsMobile();
  const isInApp = useLocation().pathname.startsWith("/app");
  useEffect(() => {
    const ignoreFailure = () => {};
    loadAuthGuard().catch(ignoreFailure);
    loadAppLayout().catch(ignoreFailure);
    loadHomePage().catch(ignoreFailure);
  }, []);
  useEffect(() => {
    if (!isInApp) return;
    let cancelIdlePreload = () => {};
    const delayHandle = setTimeout(() => {
      cancelIdlePreload = runTasksOneByOneWhenIdle(
        [
          ...(!isMobile ? [loadScannerPage] : []),
          loadLibraryPage,
          loadCollectionViewPage,
          loadStatsPage,
          loadStoragePage,
          loadCollectionsPage,
        ],
        IDLE_ROUTE_PRELOAD_TIMEOUT_MS,
      );
    }, IDLE_ROUTE_PRELOAD_DELAY_MS);
    return () => {
      clearTimeout(delayHandle);
      cancelIdlePreload();
    };
  }, [isInApp, isMobile]);
  return null;
}

function StaffGuard() {
  const { isStaff, isPending } = useRole();
  if (isPending) return null;
  if (!isStaff) return <Navigate to="/app" replace />;
  return <Outlet />;
}

function AdminGuard() {
  const { isAdmin, isPending } = useRole();
  if (isPending) return null;
  if (!isAdmin) return <Navigate to="/app/admin" replace />;
  return <Outlet />;
}

function BlockedWhileImpersonatingGuard() {
  const { isImpersonating } = useImpersonation();
  if (isImpersonating) return <ScanningBlockedWhileImpersonating />;
  return <Outlet />;
}

function DesktopOrPiHostGuard() {
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
  return <Navigate to={HOME_PATH} replace />;
}

function MonitorIndexRedirect() {
  const isMobile = useIsMobile();
  return <Navigate to={isMobile ? LIBRARY_PATH : COLLECTIONS_PATH} replace />;
}

function LegacyIntakeRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (params.get(LEGACY_PICKS_VIEW_PARAM) === LEGACY_PICKS_VIEW) {
    return <Navigate to={picksPath(params.get(ORDER_PARAM))} replace />;
  }
  return <Navigate to={`${INTAKE_PATH}${search}`} replace />;
}

function LegacyIntakeReceiptRedirect() {
  const { guid } = useParams();
  const { search } = useLocation();
  return <Navigate to={`${intakeReceiptPath(guid ?? "")}${search}`} replace />;
}

function RequireCollectionGuard() {
  return (
    <>
      <Suspense fallback={null}>
        <RequireCollectionDialog />
      </Suspense>
      <Outlet />
    </>
  );
}

const marketingPageRoutes: RouteObject[] = [
  {
    path: MARKETING_PAGE_PATHS.home,
    element: <MarketingRoute path={MARKETING_PAGE_PATHS.home} />,
  },
  {
    path: MARKETING_PAGE_PATHS.build,
    element: <MarketingRoute path={MARKETING_PAGE_PATHS.build} />,
  },
  {
    path: MARKETING_PAGE_PATHS.selfHost,
    element: <MarketingRoute path={MARKETING_PAGE_PATHS.selfHost} />,
  },
  {
    path: MARKETING_PAGE_PATHS.discordBot,
    element: <MarketingRoute path={MARKETING_PAGE_PATHS.discordBot} />,
  },
  {
    path: MARKETING_PAGE_PATHS.download,
    element: <MarketingRoute path={MARKETING_PAGE_PATHS.download} />,
  },
];

const legalPageRoutes: RouteObject[] = [
  {
    path: MARKETING_PAGE_PATHS.privacy,
    element: <MarketingRoute path={MARKETING_PAGE_PATHS.privacy} />,
  },
  {
    path: MARKETING_PAGE_PATHS.terms,
    element: <MarketingRoute path={MARKETING_PAGE_PATHS.terms} />,
  },
];

const piHostHomeRoutes: RouteObject[] = [
  {
    path: MARKETING_PAGE_PATHS.home,
    element: <Navigate to={HOME_PATH} replace />,
  },
];

export const routes: RouteObject[] = [
  {
    element: <Outlet />,
    errorElement: <ErrorPage />,
    children: [
      ...(SERVED_FROM_PI_BUNDLE ? piHostHomeRoutes : marketingPageRoutes),
      {
        element: <PublicPageLayout />,
        children: [
          {
            path: "/watch/:collectionGuid",
            element: <WatchPage />,
          },
          {
            path: `${SHARED_STORAGE_PATH_PREFIX}/:locationGuid`,
            element: <SharedStoragePage />,
          },
          {
            path: `${SHARED_CARD_PATH_PREFIX}/:scanGuid`,
            element: <SharedCardPage />,
          },
          {
            path: `${SHOP_CATALOG_PATH_PREFIX}/:catalogGuid`,
            element: <ShopCatalogPage />,
          },
          {
            path: SHORT_LINK_NOT_FOUND_PATH,
            element: <LinkNotFoundPage />,
          },
        ],
      },
      ...(SERVED_FROM_PI_BUNDLE ? [] : legalPageRoutes),
      ...(AUTH_PROVIDER === "neon"
        ? [
            {
              path: MOBILE_SOCIAL_SIGN_IN_CALLBACK_PATH,
              element: <MobileAuthCallbackPage />,
            },
          ]
        : []),
      {
        path: "/auth/:path",
        element: AUTH_PROVIDER === "local" ? <AuthLocalPage /> : <AuthPage />,
      },
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
        element: (
          <>
            <AppChunkPreloader />
            <Suspense fallback={<RouteLoadingFallback />}>
              <AuthGuard />
            </Suspense>
          </>
        ),
        children: [
          {
            path: `${INTAKE_PATH}/:guid/receipt`,
            element: <IntakeReceiptPage />,
          },
          {
            path: PACKING_SLIPS_PATH,
            element: <PackingSlipsPage />,
          },
          {
            path: `${LEGACY_INTAKE_PATH}/:guid/receipt`,
            element: <LegacyIntakeReceiptRedirect />,
          },
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
                element: <DesktopOrPiHostGuard />,
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
                        children: [
                          {
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
                    ],
                  },
                  {
                    path: SORTERS_OVERVIEW_PATH,
                    element: <SortersPage />,
                  },
                  {
                    path: LEGACY_REPORTS_PATH,
                    element: <Navigate to={STATS_PATH} replace />,
                  },
                ],
              },
              {
                element: <StaffGuard />,
                children: [
                  {
                    path: "/app/admin",
                    element: <AdminLayout />,
                    children: [
                      {
                        index: true,
                        element: <AdminIndexPage />,
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
                        element: <AdminGuard />,
                        children: [
                          {
                            path: "plans",
                            element: <AdminPlansPage />,
                          },
                        ],
                      },
                      {
                        path: "discord",
                        element: <AdminDiscordPage />,
                      },
                      {
                        path: "whats-new",
                        element: <AdminWhatsNewPage />,
                      },
                      {
                        path: "sounds",
                        element: <AdminSoundsPage />,
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
                        path: "short-links",
                        element: <AdminShortLinksPage />,
                      },
                      {
                        element: <AdminGuard />,
                        children: [
                          {
                            path: "share-links",
                            element: <AdminShareLinksPage />,
                          },
                        ],
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
                        element: <AdminGuard />,
                        children: [
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
                path: HOME_PATH,
                element: <HomePage />,
              },
              {
                path: MACHINES_ROUTE_PATH,
                element: <MachinesPage />,
              },
              {
                path: WHATS_NEW_PATH,
                element: <WhatsNewPage />,
              },
              {
                path: LIBRARY_PATH,
                element: <LibraryPage />,
              },
              {
                path: SEARCH_PATH,
                element: <GlobalSearchRedirect />,
              },
              {
                path: CATALOG_CARD_ROUTE_PATH,
                element: <CatalogCardPage />,
              },
              {
                path: "/app/monitor",
                element: <MonitorIndexRedirect />,
              },
              {
                path: "/app/monitor/:collectionGuid",
                element: <MonitorPage />,
              },
              {
                element: <BlockedWhileImpersonatingGuard />,
                children: [
                  {
                    path: "/app/monitor/:collectionGuid/camera",
                    element: <PhoneCameraPage />,
                  },
                  {
                    path: MOBILE_SCAN_PATH,
                    element: <ScanPage />,
                  },
                  {
                    path: MOBILE_SCAN_PAIR_PATH,
                    element: <ScanPairPage />,
                  },
                  {
                    path: MOBILE_SORTER_PATH,
                    element: <SorterPage />,
                  },
                ],
              },
              {
                path: STORAGE_PATH,
                element: <StoragePage />,
              },
              {
                path: TRADES_PATH,
                element: <TradesPage />,
              },
              {
                path: IN_PERSON_TRADE_PATH,
                element: <InPersonTradePage />,
              },
              {
                path: TRADE_OFFER_PATH,
                element: <TradeOfferRoutePage />,
              },
              {
                path: SENT_TRADE_OFFER_PATH,
                element: <SentTradeOfferRoutePage />,
              },
              {
                path: STORAGE_PICK_LIST_PATH,
                element: <StoragePickListPage />,
              },
              {
                path: STORAGE_LABELS_PATH,
                element: <StorageLabelsPage />,
              },
              {
                path: ORDERS_PATH,
                element: <BusinessOverviewPage />,
              },
              {
                path: INTAKE_PATH,
                element: <IntakePage />,
              },
              {
                path: PICKS_PATH,
                element: <PicksPage />,
              },
              {
                path: PICK_IMPORT_PATH,
                element: <PickImportPage />,
              },
              {
                path: PRICE_LABELS_PATH,
                element: <PriceLabelsPage />,
              },
              {
                path: RESERVATIONS_PATH,
                element: <ReservationsPage />,
              },
              {
                path: SALES_PATH,
                element: <SalesPage />,
              },
              {
                path: PICK_BATCH_PATH,
                element: <PickBatchPage />,
              },
              {
                path: LEGACY_INTAKE_PATH,
                element: <LegacyIntakeRedirect />,
              },
              {
                element: <RequireCollectionGuard />,
                children: [
                  {
                    path: SORTING_RULES_PATH,
                    element: <BinsPage />,
                  },
                  {
                    path: PRESET_WORKFLOW_PATH,
                    element: <PresetWorkflowPage />,
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
                  { path: "business", element: <SettingsBusinessPage /> },
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
                path: CONTROL_CARDS_PATH,
                element: <ControlCardsPage />,
              },
              ...(MATCH_VALIDATIONS_ENABLED
                ? [
                    {
                      path: MATCH_VALIDATIONS_PATH,
                      element: <ValidateMatchesPage />,
                    },
                  ]
                : []),
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
];
