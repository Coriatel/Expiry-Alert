import test from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";

// index.ts starts listening on import, so exercise it as a real child process.
async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function startApi(port: number): Promise<ChildProcess> {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "src/index.ts"],
    {
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: "test",
        GOOGLE_CLIENT_ID: "test-client",
        GOOGLE_CLIENT_SECRET: "test-secret",
        // This boots the whole app, cron included. Values set here win over any local
        // .env, so the child can never reach a real database, push service or mailbox.
        SESSION_DB_URL: "",
        DIRECTUS_URL: "http://127.0.0.1:9",
        DIRECTUS_STATIC_TOKEN: "",
        VAPID_PUBLIC_KEY: "",
        VAPID_PRIVATE_KEY: "",
        SMTP_HOST: "",
        WA_BRIDGE_URL: "",
      },
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("api did not start")), 20000);
    child.once("exit", () => reject(new Error("api exited early")));
    child.stdout!.on("data", (chunk) => {
      if (String(chunk).includes("listening")) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  return child;
}

test("unknown /api paths answer 404 JSON for any method; known routes are unaffected", async () => {
  const port = await freePort();
  const child = await startApi(port);
  try {
    const base = `http://127.0.0.1:${port}`;

    for (const method of ["GET", "POST", "DELETE"]) {
      const res = await fetch(`${base}/api/no-such-route`, { method });
      assert.equal(res.status, 404, method);
      assert.match(res.headers.get("content-type") ?? "", /application\/json/, method);
      assert.deepEqual(await res.json(), { error: "Not Found" }, method);
    }

    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
  } finally {
    child.kill();
  }
});
