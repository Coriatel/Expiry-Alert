import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PullImportPage } from "./PullImportPage";
import type { Reagent } from "@/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: Record<string, unknown>) => {
      const def = options && typeof options.defaultValue === "string"
        ? (options.defaultValue as string)
        : _key;
      return def
        .replace("{{imported}}", String((options as any)?.imported ?? ""))
        .replace("{{skipped}}", String((options as any)?.skipped ?? ""))
        .replace("{{count}}", String((options as any)?.count ?? ""));
    },
  }),
}));

const getAllReagents = vi.fn();
const getSourceReagents = vi.fn();
const pullReagents = vi.fn();

vi.mock("@/lib/tauri", () => ({
  getAllReagents: (...a: unknown[]) => getAllReagents(...a),
  getSourceReagents: (...a: unknown[]) => getSourceReagents(...a),
  pullReagents: (...a: unknown[]) => pullReagents(...a),
}));

function makeReagent(over: Partial<Reagent> & { id: number; name: string }): Reagent {
  return {
    category: "reagents",
    expiry_date: "2026-12-01",
    is_archived: false,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
    ...over,
  } as Reagent;
}

function apiError(message: string, code: string, status = 403): Error {
  const e = new Error(message) as Error & { code: string; status: number };
  e.code = code;
  e.status = status;
  return e;
}

describe("PullImportPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("after a successful import does not re-fetch source-reagents nor show 'Request not approved'", async () => {
    const sourceList = [
      makeReagent({ id: 1, name: "Anti-Fyb", lot_number: "AAA1" }),
      makeReagent({ id: 2, name: "Anti-Lua", lot_number: "BBB2" }),
    ];

    getSourceReagents
      .mockResolvedValueOnce(sourceList)
      .mockRejectedValueOnce(apiError("Request not approved", "request_not_approved"));
    getAllReagents.mockResolvedValue([]);
    pullReagents.mockResolvedValueOnce({
      imported: [
        { old_id: 1, new_id: 101 },
        { old_id: 2, new_id: 102 },
      ],
      skipped: [],
    });

    render(<PullImportPage requestId={42} />);

    await waitFor(() => expect(screen.getByText("Anti-Fyb")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("select-1"));
    await user.click(screen.getByLabelText("select-2"));

    const importBtn = screen.getByRole("button", { name: /ייבא נבחרים/ });
    await user.click(importBtn);

    await waitFor(() =>
      expect(screen.getByText(/2 יובאו, 0 דולגו/)).toBeInTheDocument(),
    );

    expect(getSourceReagents).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Request not approved/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/שגיאה/)).not.toBeInTheDocument();
  });

  it("when all selected items are skipped duplicates, refetches to refresh dup highlights", async () => {
    const sourceList = [makeReagent({ id: 1, name: "Anti-Fyb", lot_number: "AAA1" })];

    getSourceReagents
      .mockResolvedValueOnce(sourceList)
      .mockResolvedValueOnce(sourceList);
    getAllReagents
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        makeReagent({ id: 999, name: "local", lot_number: "AAA1" }),
      ]);
    pullReagents.mockResolvedValueOnce({
      imported: [],
      skipped: [{ old_id: 1, reason: "duplicate_lot" }],
    });

    render(<PullImportPage requestId={42} />);

    await waitFor(() => expect(screen.getByText("Anti-Fyb")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("select-1"));
    await user.click(screen.getByRole("button", { name: /ייבא נבחרים/ }));

    await waitFor(() =>
      expect(screen.getByText(/0 יובאו, 1 דולגו/)).toBeInTheDocument(),
    );

    expect(getSourceReagents).toHaveBeenCalledTimes(2);
  });

  it("on initial load with 'Request not approved' shows friendly completed-state, not red error", async () => {
    getSourceReagents.mockRejectedValueOnce(apiError("Request not approved", "request_not_approved"));
    getAllReagents.mockResolvedValueOnce([]);

    render(<PullImportPage requestId={42} />);

    await waitFor(() =>
      expect(
        screen.getByText(/בקשת ההעברה כבר טופלה|הושלמה|לא זמינה/),
      ).toBeInTheDocument(),
    );

    expect(screen.queryByText(/Request not approved/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^שגיאה/)).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /חזרה ללוח הבקרה/ }).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
