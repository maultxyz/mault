import {
  devicesQueryOptions,
  type Device,
} from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { useQuery } from "@tanstack/react-query";

export function useDevice(): Device | undefined {
  const { activeOrg } = useOrg();
  const { data } = useQuery(devicesQueryOptions(activeOrg?.id));
  return data?.[0];
}
