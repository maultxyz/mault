import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { PublicBackdrop } from "@/components/public-backdrop";
import { PublicAnnouncementBanner } from "@/components/public-announcement-banner";
import { PublicNav } from "@/components/public-nav";
import { useScrollToHash } from "@/hooks/use-scroll-to-hash";
import type { GuidePageProps } from "@/lib/interfaces/guide";

export function GuidePage({ footer, children }: GuidePageProps) {
  useScrollToHash();

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background text-foreground">
      <PublicBackdrop />
      <PublicAnnouncementBanner />
      <PublicNav />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 outline-none">{children}</main>
      {footer}
    </div>
  );
}
