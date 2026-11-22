export interface PendingSaveQueueOptions<TSave, TResult> {
  keyOf: (save: TSave) => string;
  send: (save: TSave, isRetry: boolean) => Promise<TResult>;
  put: (save: TSave) => void | Promise<void>;
  remove: (key: string) => void | Promise<void>;
  onPendingCountChange: (delta: 1 | -1) => void;
  onRetryableFailure?: (save: TSave, error: unknown, wasQueued: boolean) => void;
}
