import { AlertBanner } from "@/components/alert-banner";
import { usePublicAnnouncementAlerts } from "@/hooks/alerts/use-public-announcement-alerts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The public marketing pages (landing, build guide) render outside the
// authenticated app shell's QueryClientProvider, so this brings its own
// rather than requiring every page that mounts it to remember to wrap one.
const publicQueryClient = new QueryClient();

function PublicAnnouncementBannerContent() {
  const alerts = usePublicAnnouncementAlerts();

  return (
    <>
      {alerts.map((alert) => (
        <AlertBanner key={alert.id} alert={alert} />
      ))}
    </>
  );
}

export function PublicAnnouncementBanner() {
  return (
    <QueryClientProvider client={publicQueryClient}>
      <PublicAnnouncementBannerContent />
    </QueryClientProvider>
  );
}
