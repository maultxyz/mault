import { DEMO_SCANNED_CARDS } from "@/features/landing/lib/demo-cards";
import { DemoCardTile } from "@/features/landing/components/demo-scanned-card";

export function DemoCardStrip() {
  const cards = DEMO_SCANNED_CARDS.slice(0, 3);

  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map((d) => (
        <DemoCardTile
          key={d.card.id}
          card={d.card}
          binNumber={d.binNumber}
          isFoil={d.isFoil}
        />
      ))}
    </div>
  );
}
