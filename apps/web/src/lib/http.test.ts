import { describe, expect, it } from "vitest";
import { parseApiResponse } from "./http";

describe("parseApiResponse", () => {
  it("returns parsed JSON for successful responses", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    await expect(parseApiResponse<{ ok: boolean }>(response)).resolves.toEqual({
      ok: true,
    });
  });

  it("throws the API error message when JSON is returned", async () => {
    const response = new Response(JSON.stringify({ error: "Login failed" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

    await expect(parseApiResponse(response)).rejects.toThrow("Login failed");
  });

  it("falls back to the status when the body is empty", async () => {
    const response = new Response("", { status: 502 });

    await expect(parseApiResponse(response)).rejects.toThrow(
      "Request failed (502)",
    );
  });

  it("does not leak raw HTML bodies to the UI", async () => {
    const response = new Response("<html><body>Bad gateway</body></html>", {
      status: 502,
      headers: { "Content-Type": "text/html" },
    });

    await expect(parseApiResponse(response)).rejects.toThrow(
      "Request failed (502)",
    );
  });
});
