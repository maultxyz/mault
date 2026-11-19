const BETTER_STACK_UPTIME_API_URL = "https://incidents.betterstack.com/api/v2";
const MONITOR_CHECK_FREQUENCY_SECONDS = 180;
const ONE_DAY_SECONDS = 24 * 60 * 60;
const ONE_HOUR_SECONDS = 60 * 60;

function readEnvironmentName() {
  const argument = process.argv.find((value) => value.startsWith("--environment="));
  return argument ? argument.slice("--environment=".length) : "production";
}

function requirePublicHttpsUrl(variableName, value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be an absolute URL, got "${value}".`);
  }
  if (url.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error(
      `${variableName} must be a public https URL that Better Stack can reach, got "${value}".`,
    );
  }
  return value.replace(/\/+$/, "");
}

function optionalPublicHttpsUrl(variableName) {
  const value = process.env[variableName]?.trim();
  return value ? requirePublicHttpsUrl(variableName, value) : null;
}

function buildMonitorDefinitions(environmentName) {
  const webUrl = requirePublicHttpsUrl("WEB_URL", process.env.WEB_URL?.trim() ?? "");
  const configuredApiUrl = process.env.VITE_API_URL?.trim();
  const apiOrigin = /^https?:\/\//.test(configuredApiUrl ?? "")
    ? requirePublicHttpsUrl("VITE_API_URL", configuredApiUrl)
    : webUrl;
  const shortLinkBaseUrl = optionalPublicHttpsUrl("SHORT_LINK_BASE_URL");
  const apiDocsUrl = optionalPublicHttpsUrl("VITE_API_DOCS_URL");

  const monitors = [
    {
      pronounceable_name: `Mault ${environmentName} web app`,
      monitor_type: "status",
      url: `${webUrl}/`,
    },
    {
      pronounceable_name: `Mault ${environmentName} API`,
      monitor_type: "status",
      url: `${apiOrigin}/api/public/version`,
    },
  ];
  if (shortLinkBaseUrl) {
    monitors.push({
      pronounceable_name: `Mault ${environmentName} link shortener`,
      monitor_type: "status",
      url: `${shortLinkBaseUrl}/health`,
    });
  }
  if (apiDocsUrl) {
    monitors.push({
      pronounceable_name: `Mault ${environmentName} API docs`,
      monitor_type: "status",
      url: `${apiDocsUrl}/`,
    });
  }
  return monitors.map((monitor) => ({
    ...monitor,
    check_frequency: MONITOR_CHECK_FREQUENCY_SECONDS,
  }));
}

function buildHeartbeatDefinitions(environmentName) {
  const heartbeats = [
    {
      name: `Mault ${environmentName} Discord bot`,
      period: 180,
      grace: 120,
      configuredThrough: "BETTER_STACK_BOT_HEARTBEAT_URL on the bot container",
    },
  ];
  if (environmentName === "production") {
    heartbeats.push(
      {
        name: "Mault price sync",
        period: ONE_DAY_SECONDS,
        grace: 4 * ONE_HOUR_SECONDS,
        configuredThrough:
          "the BETTER_STACK_PRICE_SYNC_HEARTBEAT_URL secret in the GitHub production environment",
      },
      {
        name: "Mault card catalog sync",
        period: ONE_DAY_SECONDS,
        grace: 8 * ONE_HOUR_SECONDS,
        configuredThrough:
          "the BETTER_STACK_CATALOG_SYNC_HEARTBEAT_URL secret in the GitHub production environment",
      },
    );
  }
  return heartbeats;
}

async function callBetterStack(apiToken, method, pathOrUrl, body) {
  const url = pathOrUrl.startsWith("https://")
    ? pathOrUrl
    : `${BETTER_STACK_UPTIME_API_URL}${pathOrUrl}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(
      `Better Stack ${method} ${url} failed with ${response.status}: ${await response.text()}`,
    );
  }
  return response.json();
}

async function listAllPages(apiToken, path) {
  const records = [];
  let nextUrl = path;
  while (nextUrl) {
    const page = await callBetterStack(apiToken, "GET", nextUrl);
    records.push(...page.data);
    nextUrl = page.pagination?.next ?? null;
  }
  return records;
}

async function upsertMonitor(apiToken, monitor) {
  const existingMonitors = await listAllPages(
    apiToken,
    `/monitors?pronounceable_name=${encodeURIComponent(monitor.pronounceable_name)}`,
  );
  const existingMonitor = existingMonitors.find(
    (record) => record.attributes.pronounceable_name === monitor.pronounceable_name,
  );
  if (existingMonitor) {
    await callBetterStack(apiToken, "PATCH", `/monitors/${existingMonitor.id}`, monitor);
    console.log(`Updated monitor "${monitor.pronounceable_name}" -> ${monitor.url}`);
  } else {
    await callBetterStack(apiToken, "POST", "/monitors", monitor);
    console.log(`Created monitor "${monitor.pronounceable_name}" -> ${monitor.url}`);
  }
}

async function upsertHeartbeat(apiToken, existingHeartbeats, heartbeat) {
  const { configuredThrough, ...heartbeatAttributes } = heartbeat;
  const existingHeartbeat = existingHeartbeats.find(
    (record) => record.attributes.name === heartbeat.name,
  );
  const response = existingHeartbeat
    ? await callBetterStack(
        apiToken,
        "PATCH",
        `/heartbeats/${existingHeartbeat.id}`,
        heartbeatAttributes,
      )
    : await callBetterStack(apiToken, "POST", "/heartbeats", heartbeatAttributes);
  console.log(
    `${existingHeartbeat ? "Updated" : "Created"} heartbeat "${heartbeat.name}"\n  URL: ${response.data.attributes.url}\n  Set it as ${configuredThrough}.`,
  );
}

async function main() {
  const apiToken = process.env.BETTER_STACK_UPTIME_API_TOKEN?.trim();
  if (!apiToken) {
    throw new Error("Set BETTER_STACK_UPTIME_API_TOKEN to a Better Stack Uptime API token.");
  }
  const environmentName = readEnvironmentName();
  const monitors = buildMonitorDefinitions(environmentName);
  const heartbeats = buildHeartbeatDefinitions(environmentName);

  for (const monitor of monitors) {
    await upsertMonitor(apiToken, monitor);
  }
  const existingHeartbeats = await listAllPages(apiToken, "/heartbeats");
  for (const heartbeat of heartbeats) {
    await upsertHeartbeat(apiToken, existingHeartbeats, heartbeat);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
