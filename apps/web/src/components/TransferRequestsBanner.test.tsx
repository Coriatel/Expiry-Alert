import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransferRequestsBanner } from "./TransferRequestsBanner";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: Record<string, unknown>) =>
      options && typeof options.defaultValue === "string"
        ? (options.defaultValue as string)
        : _key,
  }),
}));

const showToast = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ showToast }),
}));

const listIncomingTransferRequests = vi.fn();
const listOutgoingTransferRequests = vi.fn();
const decideTransferRequest = vi.fn();

vi.mock("@/lib/tauri", () => ({
  listIncomingTransferRequests: (...a: unknown[]) =>
    listIncomingTransferRequests(...a),
  listOutgoingTransferRequests: (...a: unknown[]) =>
    listOutgoingTransferRequests(...a),
  decideTransferRequest: (...a: unknown[]) => decideTransferRequest(...a),
}));

const teams = [{ id: 7, name: "Lab A" }];

describe("TransferRequestsBanner", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("removes the item from the list on successful approve", async () => {
    listIncomingTransferRequests.mockResolvedValueOnce([
      { id: 11, from_team: 7, to_team: 1, status: "pending", message_text: null },
    ]);
    listOutgoingTransferRequests.mockResolvedValueOnce([]);
    decideTransferRequest.mockResolvedValueOnce({});

    render(<TransferRequestsBanner teams={teams} pollMs={1_000_000} />);
    await waitFor(() => expect(screen.getByText("Lab A")).toBeInTheDocument());

    await userEvent.setup().click(screen.getByRole("button", { name: /אישור/ }));

    await waitFor(() =>
      expect(screen.queryByText("Lab A")).not.toBeInTheDocument(),
    );
    expect(showToast).not.toHaveBeenCalledWith(
      expect.any(String),
      "error",
    );
  });

  it("when decide fails, keeps the item in the list and surfaces an error toast", async () => {
    listIncomingTransferRequests.mockResolvedValueOnce([
      { id: 11, from_team: 7, to_team: 1, status: "pending", message_text: null },
    ]);
    listOutgoingTransferRequests.mockResolvedValueOnce([]);
    const err = new Error("Already decided") as Error & { code?: string };
    err.code = "already_decided";
    decideTransferRequest.mockRejectedValueOnce(err);

    render(<TransferRequestsBanner teams={teams} pollMs={1_000_000} />);
    await waitFor(() => expect(screen.getByText("Lab A")).toBeInTheDocument());

    await userEvent.setup().click(screen.getByRole("button", { name: /אישור/ }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.stringMatching(/Already decided|נכשלה|שגיאה/i),
        "error",
      ),
    );

    // Item must still be visible — silent removal is the bug.
    expect(screen.getByText("Lab A")).toBeInTheDocument();
  });
});
