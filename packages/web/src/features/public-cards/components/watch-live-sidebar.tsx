import { SessionErrorsPanel } from "@/features/scanner/components/session-errors-panel";
import { SessionStatsPanel } from "@/features/scanner/components/session-stats-panel";
import { UnmatchedCardsPanel } from "@/features/scanner/components/unmatched-cards-panel";
import type { WatchLiveSidebarProps } from "@/lib/interfaces/public-cards";

export function WatchLiveSidebar({ session, stats, cardCount }: WatchLiveSidebarProps) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <SessionStatsPanel stats={stats} totalCards={cardCount} />
      <UnmatchedCardsPanel cards={session.unmatchedCards} total={session.unmatchedCount} />
      <SessionErrorsPanel errors={session.errors} />
    </div>
  );
}
