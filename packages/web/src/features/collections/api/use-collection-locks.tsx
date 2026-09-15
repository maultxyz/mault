// Locks are one of several concerns multiplexed over the single app-wide SSE
// connection - see lib/app-stream.tsx. Re-exported here so existing feature
// imports don't need to change.
export { useCollectionLocks } from "@/lib/app-stream";
export type { ScanLockInfo } from "@/lib/app-stream";
