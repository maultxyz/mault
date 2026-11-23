import { createCachedValue } from "./cached-value";
import { computeScanMetrics } from "./scan-stats";

export const scanMetricsCache = createCachedValue("publicMetrics.scans", computeScanMetrics);
