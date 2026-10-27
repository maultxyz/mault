let activeFlashes = 0;

export function isFlashInProgress(): boolean {
  return activeFlashes > 0;
}

export async function trackFlash<T>(flash: () => Promise<T>): Promise<T> {
  activeFlashes++;
  try {
    return await flash();
  } finally {
    activeFlashes--;
  }
}
