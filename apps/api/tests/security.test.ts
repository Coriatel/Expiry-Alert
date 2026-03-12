import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import {
  hashSecret,
  verifySecret,
  verifyStoredSecret,
} from "../src/services/security.ts";

test("verifyStoredSecret accepts the current PBKDF2 format", () => {
  const encoded = hashSecret("secret123");

  assert.equal(verifySecret("secret123", encoded), true);
  assert.deepEqual(verifyStoredSecret("secret123", encoded), {
    valid: true,
    needsUpgrade: false,
  });
});

test("verifyStoredSecret accepts legacy bcrypt hashes and flags them for upgrade", async () => {
  const bcryptHash = await bcrypt.hash("secret123", 10);

  assert.deepEqual(verifyStoredSecret("secret123", bcryptHash), {
    valid: true,
    needsUpgrade: true,
  });
});

test("verifyStoredSecret rejects unknown or invalid secrets", () => {
  assert.deepEqual(verifyStoredSecret("secret123", null), {
    valid: false,
    needsUpgrade: false,
  });
  assert.deepEqual(verifyStoredSecret("secret123", "not-a-real-hash"), {
    valid: false,
    needsUpgrade: false,
  });
});
