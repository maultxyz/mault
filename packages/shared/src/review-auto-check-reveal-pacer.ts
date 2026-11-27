import {
  REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS,
  REVIEW_AUTO_CHECK_REVEAL_MAX_MS_PER_CARD,
  REVIEW_AUTO_CHECK_REVEAL_MIN_MS_PER_CARD,
  REVIEW_AUTO_CHECK_REVEAL_PACE_SHARE_OF_REQUEST_TIME,
} from "./constants/review-auto-check.constant";
import type {
  ReviewAutoCheckOutcome,
  ReviewAutoCheckRevealPacerOptions,
} from "./interfaces/review-auto-check.interface";

export class ReviewAutoCheckRevealPacer {
  private readonly onReveal: ReviewAutoCheckRevealPacerOptions["onReveal"];
  private readonly onCheckingScanIdChange: ReviewAutoCheckRevealPacerOptions["onCheckingScanIdChange"];
  private readonly now: () => number;
  private readonly setTimer: (callback: () => void, delayMs: number) => unknown;
  private readonly clearTimer: (timer: unknown) => void;
  private pendingScanIds: string[] = [];
  private currentBatchScanIds: string[] = [];
  private readonly arrivedOutcomes = new Map<string, ReviewAutoCheckOutcome>();
  private batchStartedAt: number | null = null;
  private measuredMsPerCard: number | null = null;
  private lastRevealAt = Number.NEGATIVE_INFINITY;
  private revealTimer: unknown = null;
  private checkingScanId: string | null = null;
  private isDraining = false;
  private drainWaiters: (() => void)[] = [];

  constructor(options: ReviewAutoCheckRevealPacerOptions) {
    this.onReveal = options.onReveal;
    this.onCheckingScanIdChange = options.onCheckingScanIdChange;
    this.now = options.now ?? (() => Date.now());
    this.setTimer = options.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs));
    this.clearTimer =
      options.clearTimer ?? ((timer) => clearTimeout(timer as ReturnType<typeof setTimeout>));
  }

  addBatch(scanIds: string[]): void {
    this.currentBatchScanIds = scanIds;
    this.batchStartedAt = this.now();
    for (const scanId of scanIds) {
      if (!this.pendingScanIds.includes(scanId)) this.pendingScanIds.push(scanId);
    }
    this.scheduleReveal();
  }

  addOutcomes(outcomes: ReviewAutoCheckOutcome[]): void {
    if (this.batchStartedAt !== null && outcomes.length > 0) {
      const sampleMsPerCard = (this.now() - this.batchStartedAt) / outcomes.length;
      this.measuredMsPerCard =
        this.measuredMsPerCard === null
          ? sampleMsPerCard
          : (this.measuredMsPerCard + sampleMsPerCard) / 2;
    }
    this.batchStartedAt = null;
    for (const outcome of outcomes) {
      this.arrivedOutcomes.set(outcome.scanId, outcome);
      if (!this.pendingScanIds.includes(outcome.scanId)) this.pendingScanIds.push(outcome.scanId);
    }
    const unansweredScanIds = new Set(
      this.currentBatchScanIds.filter((scanId) => !this.arrivedOutcomes.has(scanId)),
    );
    this.pendingScanIds = this.pendingScanIds.filter((scanId) => !unansweredScanIds.has(scanId));
    this.currentBatchScanIds = [];
    this.scheduleReveal();
  }

  drain(): Promise<void> {
    this.isDraining = true;
    this.pendingScanIds = this.pendingScanIds.filter((scanId) => this.arrivedOutcomes.has(scanId));
    this.cancelRevealTimer();
    const drained = new Promise<void>((resolve) => this.drainWaiters.push(resolve));
    this.scheduleReveal();
    return drained;
  }

  flush(): void {
    this.cancelRevealTimer();
    const scanIds = this.pendingScanIds;
    this.pendingScanIds = [];
    for (const scanId of scanIds) {
      const outcome = this.arrivedOutcomes.get(scanId);
      if (outcome) this.onReveal(outcome);
    }
    this.arrivedOutcomes.clear();
    this.currentBatchScanIds = [];
    this.batchStartedAt = null;
    this.updateCheckingScanId();
    this.resolveDrainWaiters();
  }

  dispose(): void {
    this.cancelRevealTimer();
    this.pendingScanIds = [];
    this.arrivedOutcomes.clear();
    this.resolveDrainWaiters();
  }

  private scheduleReveal(): void {
    if (this.revealTimer !== null) return;
    const nextScanId = this.pendingScanIds[0];
    this.updateCheckingScanId();
    if (nextScanId === undefined) {
      this.resolveDrainWaiters();
      return;
    }
    if (!this.arrivedOutcomes.has(nextScanId)) return;
    const delayMs = Math.max(0, this.lastRevealAt + this.msPerReveal() - this.now());
    this.revealTimer = this.setTimer(() => this.revealNext(), delayMs);
  }

  private revealNext(): void {
    this.revealTimer = null;
    const scanId = this.pendingScanIds.shift();
    const outcome = scanId === undefined ? undefined : this.arrivedOutcomes.get(scanId);
    if (scanId !== undefined) this.arrivedOutcomes.delete(scanId);
    this.lastRevealAt = this.now();
    if (outcome) this.onReveal(outcome);
    this.scheduleReveal();
  }

  private msPerReveal(): number {
    if (this.isDraining || this.arrivedOutcomes.size > REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS) {
      return REVIEW_AUTO_CHECK_REVEAL_MIN_MS_PER_CARD;
    }
    const pacedMs =
      (this.measuredMsPerCard ?? REVIEW_AUTO_CHECK_REVEAL_MIN_MS_PER_CARD) *
      REVIEW_AUTO_CHECK_REVEAL_PACE_SHARE_OF_REQUEST_TIME;
    return Math.min(
      REVIEW_AUTO_CHECK_REVEAL_MAX_MS_PER_CARD,
      Math.max(REVIEW_AUTO_CHECK_REVEAL_MIN_MS_PER_CARD, pacedMs),
    );
  }

  private updateCheckingScanId(): void {
    const nextCheckingScanId = this.pendingScanIds[0] ?? null;
    if (nextCheckingScanId === this.checkingScanId) return;
    this.checkingScanId = nextCheckingScanId;
    this.onCheckingScanIdChange(nextCheckingScanId);
  }

  private cancelRevealTimer(): void {
    if (this.revealTimer === null) return;
    this.clearTimer(this.revealTimer);
    this.revealTimer = null;
  }

  private resolveDrainWaiters(): void {
    if (this.pendingScanIds.length > 0) return;
    const waiters = this.drainWaiters;
    this.drainWaiters = [];
    for (const resolve of waiters) resolve();
  }
}
