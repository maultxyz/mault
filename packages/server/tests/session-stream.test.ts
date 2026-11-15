import assert from "node:assert/strict";
import { test } from "node:test";
import { emitToSession, subscribeSession } from "../src/lib/session-stream";

test("a session only accepts viewers and events from the org that owns it", () => {
  const collectionGuid = "7d3f9a52-3c0e-4c55-9d57-5e1b0f1a2b3c";
  const ownerEvents: string[] = [];
  const otherOrgEvents: string[] = [];
  const unsubscribeOwner = subscribeSession(
    collectionGuid,
    "org-owner",
    "user-owner",
    "Owner",
    (event) => ownerEvents.push(event),
  );
  const unsubscribeOtherOrg = subscribeSession(
    collectionGuid,
    "org-other",
    "user-other",
    "Other",
    (event) => otherOrgEvents.push(event),
  );

  emitToSession("org-other", collectionGuid, "phone_camera_message", {});
  emitToSession("org-owner", collectionGuid, "card_added", {});

  assert.deepEqual(otherOrgEvents, []);
  assert.deepEqual(
    ownerEvents.filter((event) => event !== "viewers_updated"),
    ["card_added"],
  );
  unsubscribeOtherOrg();
  unsubscribeOwner();
});
