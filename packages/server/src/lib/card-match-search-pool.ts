import { availableParallelism } from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { nearestCardFaceRows } from "./card-match-nearest";
import {
  CARD_MATCH_SEARCH_MAX_WORKERS,
  CARD_MATCH_SEARCH_WORKER_COUNT_ENV,
} from "./constants/card-search";
import type {
  CardMatchEmbeddingArrays,
  CardMatchSearchJob,
  CardMatchSearchWorker,
  CardMatchWorkerReply,
  CardMatchWorkerRequest,
  NearestCardFaceRow,
} from "./interfaces/card-match-index";

const workers: CardMatchSearchWorker[] = [];
const waitingJobs: CardMatchSearchJob[] = [];
let nextRequestId = 0;

export function cardMatchSearchWorkerCount(): number {
  const configured = parseInt(
    process.env[CARD_MATCH_SEARCH_WORKER_COUNT_ENV] ?? "",
  );
  if (Number.isInteger(configured) && configured >= 0) return configured;
  return Math.max(
    1,
    Math.min(CARD_MATCH_SEARCH_MAX_WORKERS, availableParallelism() - 1),
  );
}

function resolveWorkerEntry(): { modulePath: string; execArgv: string[] } {
  if (process.env.NODE_ENV === "production") {
    return {
      modulePath: path.join(__dirname, "lib", "card-match-worker.js"),
      execArgv: [],
    };
  }
  return {
    modulePath: path.join(__dirname, "card-match-worker.ts"),
    execArgv: ["--require", "tsx/cjs"],
  };
}

function isSharedWithWorkers(segment: CardMatchEmbeddingArrays): boolean {
  return (
    segment.frontEmbeddings.buffer instanceof SharedArrayBuffer &&
    segment.frontEmbeddingScales.buffer instanceof SharedArrayBuffer &&
    segment.backEmbeddings.buffer instanceof SharedArrayBuffer &&
    segment.backEmbeddingScales.buffer instanceof SharedArrayBuffer &&
    segment.backFaceIndexByRow.buffer instanceof SharedArrayBuffer
  );
}

function embeddingArraysOf(
  segment: CardMatchEmbeddingArrays,
): CardMatchEmbeddingArrays {
  return {
    rowCount: segment.rowCount,
    frontEmbeddings: segment.frontEmbeddings,
    frontEmbeddingScales: segment.frontEmbeddingScales,
    backEmbeddings: segment.backEmbeddings,
    backEmbeddingScales: segment.backEmbeddingScales,
    backFaceIndexByRow: segment.backFaceIndexByRow,
  };
}

function removeWorker(searchWorker: CardMatchSearchWorker, error: Error) {
  const index = workers.indexOf(searchWorker);
  if (index === -1) return;
  workers.splice(index, 1);
  const job = searchWorker.job;
  searchWorker.job = null;
  void searchWorker.worker.terminate();
  job?.reject(error);
  startWaitingJobs();
}

function startWorker(): CardMatchSearchWorker {
  const { modulePath, execArgv } = resolveWorkerEntry();
  const worker = new Worker(modulePath, { execArgv });
  worker.unref();
  const searchWorker: CardMatchSearchWorker = { worker, job: null };
  worker.on("message", (reply: CardMatchWorkerReply) => {
    const job = searchWorker.job;
    if (!job || job.request.requestId !== reply.requestId) return;
    searchWorker.job = null;
    worker.unref();
    job.resolve(reply.rows);
    startWaitingJobs();
  });
  worker.on("error", (error) => removeWorker(searchWorker, error));
  worker.on("exit", (exitCode) =>
    removeWorker(
      searchWorker,
      new Error(`The card match worker exited with code ${exitCode}.`),
    ),
  );
  workers.push(searchWorker);
  return searchWorker;
}

function startWaitingJobs() {
  while (waitingJobs.length > 0) {
    const idleWorker =
      workers.find((searchWorker) => searchWorker.job === null) ??
      (workers.length < cardMatchSearchWorkerCount() ? startWorker() : null);
    if (!idleWorker) return;
    const job = waitingJobs.shift()!;
    idleWorker.job = job;
    idleWorker.worker.ref();
    idleWorker.worker.postMessage(job.request);
  }
}

export function nearestCardFaceRowsOffMainThread(
  segments: CardMatchEmbeddingArrays[],
  query: Float32Array,
  limit: number,
): Promise<NearestCardFaceRow[]> {
  if (
    cardMatchSearchWorkerCount() === 0 ||
    !segments.every(isSharedWithWorkers)
  ) {
    return Promise.resolve(nearestCardFaceRows(segments, query, limit));
  }
  const request: CardMatchWorkerRequest = {
    requestId: nextRequestId++,
    segments: segments.map(embeddingArraysOf),
    query,
    limit,
  };
  return new Promise((resolve, reject) => {
    waitingJobs.push({ request, resolve, reject });
    startWaitingJobs();
  });
}
