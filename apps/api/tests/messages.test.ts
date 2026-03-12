import test from "node:test";
import assert from "node:assert/strict";
import {
  canSendPrivateToUser,
  getTeamRecipientUserIds,
  isMessageVisibleToViewer,
} from "../src/services/messages.ts";
import { isSystemAdminEmail } from "../src/utils/systemAdmin.ts";

test("getTeamRecipientUserIds excludes suspended members and the sender", () => {
  const recipients = getTeamRecipientUserIds(
    [
      { id: 1, team: 10, user: 1, role: "owner", status: "active" },
      { id: 2, team: 10, user: 2, role: "member", status: "active" },
      { id: 3, team: 10, user: 3, role: "member", status: "suspended" },
      { id: 4, team: 10, user: 2, role: "admin", status: "active" },
    ],
    1,
  );

  assert.deepEqual(recipients, [2]);
});

test("canSendPrivateToUser only allows active teammates other than the sender", () => {
  const memberships = [
    { id: 1, team: 10, user: 1, role: "owner", status: "active" },
    { id: 2, team: 10, user: 2, role: "member", status: "active" },
    { id: 3, team: 10, user: 3, role: "member", status: "suspended" },
  ];

  assert.equal(canSendPrivateToUser(memberships, 1, 2), true);
  assert.equal(canSendPrivateToUser(memberships, 1, 3), false);
  assert.equal(canSendPrivateToUser(memberships, 1, 1), false);
});

test("isMessageVisibleToViewer keeps team messages team-scoped and system messages global", () => {
  assert.equal(
    isMessageVisibleToViewer({ scope: "system", team: null }, null),
    true,
  );
  assert.equal(
    isMessageVisibleToViewer({ scope: "team", team: 11 }, 11),
    true,
  );
  assert.equal(
    isMessageVisibleToViewer({ scope: "private", team: 11 }, 12),
    false,
  );
});

test("isSystemAdminEmail matches the configured admin email case-insensitively", () => {
  assert.equal(isSystemAdminEmail("coriatel@gmail.com"), true);
  assert.equal(isSystemAdminEmail("CORIATEL@gmail.com"), true);
  assert.equal(isSystemAdminEmail("other@example.com"), false);
});
