import test from "node:test";
import assert from "node:assert/strict";
import { isMissingCollectionPermission } from "../src/services/transferRequests.ts";

test("isMissingCollectionPermission: 403 from Directus → true", () => {
  // Shape of @directus/sdk error when the collection permission is missing
  // for the API role. Captured live from the production logs on 2026-05-11.
  const err = Object.assign(
    new Error(
      'You don\'t have permission to access collection "ea_transfer_requests" or it does not exist. Queried in root.',
    ),
    {
      response: { status: 403, statusText: "Forbidden" },
    },
  );
  assert.equal(isMissingCollectionPermission(err), true);
});

test("isMissingCollectionPermission: other statuses → false", () => {
  assert.equal(
    isMissingCollectionPermission(
      Object.assign(new Error("oops"), { response: { status: 500 } }),
    ),
    false,
  );
  assert.equal(
    isMissingCollectionPermission(
      Object.assign(new Error("not found"), { response: { status: 404 } }),
    ),
    false,
  );
  assert.equal(
    isMissingCollectionPermission(
      Object.assign(new Error("unauth"), { response: { status: 401 } }),
    ),
    false,
  );
});

test("isMissingCollectionPermission: non-axios shapes → false", () => {
  assert.equal(isMissingCollectionPermission(null), false);
  assert.equal(isMissingCollectionPermission(undefined), false);
  assert.equal(isMissingCollectionPermission(new Error("plain")), false);
  assert.equal(isMissingCollectionPermission({ response: null }), false);
  assert.equal(isMissingCollectionPermission("string error"), false);
});
