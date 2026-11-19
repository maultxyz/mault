const apiPort = process.env.PORT?.trim() || "3001";
const readinessUrl = `http://127.0.0.1:${apiPort}/public/version`;
const pollIntervalMs = 500;
const giveUpAfterMs = 3 * 60 * 1000;
const configuredApiUrl = process.env.VITE_API_URL?.trim() ?? "";

if (/^https?:\/\//i.test(configuredApiUrl)) {
  console.log(`[wait-for-api] VITE_API_URL points at ${configuredApiUrl}, not waiting for a local API.`);
  process.exit(0);
}

const startedAt = Date.now();
let hasLoggedWaiting = false;

async function apiAnswers() {
  try {
    const response = await fetch(readinessUrl, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

while (!(await apiAnswers())) {
  if (Date.now() - startedAt > giveUpAfterMs) {
    console.error(
      `[wait-for-api] The API did not answer ${readinessUrl} within ${giveUpAfterMs / 1000} s. Check the server output for a startup error.`,
    );
    process.exit(1);
  }
  if (!hasLoggedWaiting) {
    console.log(`[wait-for-api] Waiting for the API at ${readinessUrl} before starting Vite...`);
    hasLoggedWaiting = true;
  }
  await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
}

console.log(`[wait-for-api] API is up after ${((Date.now() - startedAt) / 1000).toFixed(1)} s.`);
