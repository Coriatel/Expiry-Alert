import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "./store";

describe("display preferences", () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      viewMode: null,
      batchHistoryViewMode: null,
      duplicationHistoryViewMode: null,
    });
  });

  it("persists per-page view choices without record data", () => {
    useStore.getState().setBatchHistoryViewMode("cards");
    useStore.getState().setDuplicationHistoryViewMode("table");

    const persisted = localStorage.getItem("expiry-alert-preferences") ?? "";
    expect(persisted).toContain('"batchHistoryViewMode":"cards"');
    expect(persisted).toContain('"duplicationHistoryViewMode":"table"');
    expect(persisted).not.toContain("reagents");
    expect(persisted).not.toContain("entries");
  });
});
