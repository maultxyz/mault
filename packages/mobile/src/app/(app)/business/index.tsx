import { router } from "expo-router";
import { BusinessHub } from "@/features/business/components/business-hub";

export default function BusinessScreen() {
  return <BusinessHub onBack={() => router.back()} />;
}
