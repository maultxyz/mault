import { OrderBatchPick } from "@/features/business/components/order-batch-pick";
import { ORDER_PARAM } from "@/lib/constants/business";
import { useSearchParams } from "react-router-dom";

export default function PickBatchPage() {
  const [searchParams] = useSearchParams();
  const orderGuids = searchParams.getAll(ORDER_PARAM);
  return <OrderBatchPick key={orderGuids.join(",")} orderGuids={orderGuids} />;
}
