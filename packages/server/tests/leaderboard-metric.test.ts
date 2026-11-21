import assert from "node:assert/strict";
import { test } from "node:test";
import {
  leaderboardMetricCountsSelfHosted,
  leaderboardQueryString,
  parseLeaderboardMetric,
  parseLeaderboardPeriod,
} from "@magic-vault/shared";

test("unknown or missing metrics and periods fall back to all-time total scans for store app versions", () => {
  assert.equal(parseLeaderboardMetric(undefined), "totalScans");
  assert.equal(parseLeaderboardMetric("fastest"), "totalScans");
  assert.equal(parseLeaderboardMetric("cardsPerHour"), "cardsPerHour");
  assert.equal(parseLeaderboardPeriod(undefined), "allTime");
  assert.equal(parseLeaderboardPeriod("decade"), "allTime");
  assert.equal(parseLeaderboardPeriod("week"), "week");
});

test("only the total scans ranking counts self-hosted scans", () => {
  assert.equal(leaderboardMetricCountsSelfHosted("totalScans"), true);
  assert.equal(leaderboardMetricCountsSelfHosted("cardsPerHour"), false);
});

test("leaderboard query string sends only non-default values and drops self-hosted for cards per hour", () => {
  assert.equal(
    leaderboardQueryString({ metric: "totalScans", period: "allTime", includeSelfHosted: false }),
    "",
  );
  assert.equal(
    leaderboardQueryString({ metric: "totalScans", period: "month", includeSelfHosted: true }),
    "?period=month&includeSelfHosted=true",
  );
  assert.equal(
    leaderboardQueryString({ metric: "cardsPerHour", period: "allTime", includeSelfHosted: true }),
    "?metric=cardsPerHour",
  );
});
