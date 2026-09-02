const CARD_API_TIMEOUT_MS = 10_000;

export function fetchCardApi(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(CARD_API_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(url, { ...init, signal });
}
