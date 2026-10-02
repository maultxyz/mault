const latestSessionInits = new WeakMap<EventSource, Map<string, string>>();

export function recordSessionInits(es: EventSource, guids: string[]): void {
  const byGuid = new Map<string, string>();
  latestSessionInits.set(es, byGuid);
  for (const guid of guids) {
    es.addEventListener(`session:${guid}:session_init`, (event) => {
      byGuid.set(guid, (event as MessageEvent).data);
    });
  }
}

export function latestSessionInit(
  es: EventSource,
  guid: string,
): string | undefined {
  return latestSessionInits.get(es)?.get(guid);
}
