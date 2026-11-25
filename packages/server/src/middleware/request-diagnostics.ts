import { createMiddleware } from "hono/factory";
import { pool, singleStatementPool, backgroundLoadPool } from "../db";
import { isPiHost } from "../lib/pi-host";
import { REQUEST_DIAGNOSTICS_CATEGORIES, REQUEST_DIAGNOSTICS_CATEGORY_PATTERNS, REQUEST_DIAGNOSTICS_MAX_TRACKED, REQUEST_DIAGNOSTICS_METHODS, REQUEST_DIAGNOSTICS_SLOW_MS, REQUEST_DIAGNOSTICS_STAGES } from "../lib/constants/request-diagnostics";
import type { RequestDiagnosticOptions, RequestDiagnosticPoolCounts, RequestDiagnosticStage, RequestDiagnosticState } from "../lib/interfaces/request-diagnostics";

const states = new WeakMap<object, RequestDiagnosticState>();

export function markRequestDiagnosticStage(context: object, stage: RequestDiagnosticStage) {
  const state = states.get(context);
  if (state && REQUEST_DIAGNOSTICS_STAGES.has(stage)) state.stage = stage;
}

function category(path: string) {
  if (Object.prototype.hasOwnProperty.call(REQUEST_DIAGNOSTICS_CATEGORIES, path)) return REQUEST_DIAGNOSTICS_CATEGORIES[path];
  for (const [pattern, label] of REQUEST_DIAGNOSTICS_CATEGORY_PATTERNS) {
    if (pattern.test(path)) return label;
  }
  return "other";
}

function counts(value: { totalCount: number; idleCount: number; waitingCount: number }): RequestDiagnosticPoolCounts {
  return { total: value.totalCount, idle: value.idleCount, waiting: value.waitingCount };
}

export function createRequestDiagnostics(options: Partial<RequestDiagnosticOptions> = {}) {
  const settings: RequestDiagnosticOptions = {
    enabled: isPiHost,
    readPools: () => ({ main: counts(pool), single: counts(singleStatementPool), background: counts(backgroundLoadPool) }),
    emit: (record) => console.info("[request-diagnostics]", JSON.stringify(record)),
    slowMs: REQUEST_DIAGNOSTICS_SLOW_MS,
    maxTracked: REQUEST_DIAGNOSTICS_MAX_TRACKED,
    ...options,
  };
  let tracked = 0;
  let ordinal = 0;
  return createMiddleware(async (c, next) => {
    let enabled = false;
    try { enabled = settings.enabled(); } catch {}
    if (!enabled || tracked >= settings.maxTracked) return next();
    tracked++;
    const id = ++ordinal;
    const started = performance.now();
    const state: RequestDiagnosticState = { stage: "request" };
    states.set(c, state);
    const routeCategory = category(c.req.path);
    const method = REQUEST_DIAGNOSTICS_METHODS.has(c.req.method) ? c.req.method : "OTHER";
    let closed = false;
    let slow = false;
    const write = (event: "slow" | "complete" | "abort") => {
      try {
        const emitted = settings.emit({ event, ordinal: id, category: routeCategory, method, elapsedMs: Math.round(performance.now() - started), status: c.finalized ? c.res.status : 0, stage: state.stage, pools: settings.readPools() });
        if (emitted instanceof Promise) void emitted.catch(() => {});
      } catch {}
    };
    const finish = (event: "complete" | "abort") => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      c.req.raw.signal.removeEventListener("abort", aborted);
      states.delete(c);
      tracked--;
      if (slow || performance.now() - started >= settings.slowMs) write(event);
    };
    const aborted = () => finish("abort");
    const timer = setTimeout(() => {
      if (closed) return;
      slow = true;
      write("slow");
    }, settings.slowMs);
    timer.unref();
    c.req.raw.signal.addEventListener("abort", aborted, { once: true });
    if (c.req.raw.signal.aborted) finish("abort");
    try {
      await next();
    } finally {
      finish("complete");
    }
  });
}

export const requestDiagnostics = createRequestDiagnostics();
