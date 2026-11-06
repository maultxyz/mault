import { Badge } from "@/components/ui/badge";
import type { CollectionGameBadgeProps } from "@/lib/interfaces/collections";
import { collectionGameLabel } from "@magic-vault/shared";

export function CollectionGameBadge({ collection }: CollectionGameBadgeProps) {
  return (
    <Badge variant="outline" className="shrink-0 tabular-nums">
      {collectionGameLabel(collection)}
    </Badge>
  );
}
