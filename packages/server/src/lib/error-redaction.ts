import {
  REDACTED_QUERY_PARAMS_TEXT,
  QUERY_PARAMS_IN_ERROR_MESSAGE_PATTERN,
} from "./constants/error-redaction";

function isFailedQueryError(error: unknown): error is Error & { query: string; params: unknown[] } {
  return (
    error instanceof Error &&
    typeof (error as { query?: unknown }).query === "string" &&
    Array.isArray((error as { params?: unknown }).params)
  );
}

export function withoutQueryParamsText(text: string): string {
  return text.replace(QUERY_PARAMS_IN_ERROR_MESSAGE_PATTERN, REDACTED_QUERY_PARAMS_TEXT);
}

export function withoutUrlQuery(url: string): string {
  const queryStart = url.indexOf("?");
  return queryStart === -1 ? url : url.slice(0, queryStart);
}

export function redactedError(error: unknown): unknown {
  if (!isFailedQueryError(error)) return error;
  const redacted = new Error(
    `Failed query: ${error.query}\n${REDACTED_QUERY_PARAMS_TEXT} (${error.params.length} values)`,
    { cause: error.cause },
  );
  redacted.name = error.name;
  if (error.stack) {
    const firstStackLine = error.stack.indexOf("\n    at ");
    redacted.stack =
      firstStackLine === -1
        ? `${redacted.name}: ${redacted.message}`
        : `${redacted.name}: ${redacted.message}${error.stack.slice(firstStackLine)}`;
  }
  return redacted;
}

export function redactConsoleErrors(): void {
  for (const method of ["error", "warn"] as const) {
    const write = console[method].bind(console);
    console[method] = (...values: unknown[]) => write(...values.map(redactedError));
  }
}
