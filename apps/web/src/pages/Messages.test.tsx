import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Messages } from "./Messages";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.count != null) {
        return `${key}:${options.count}`;
      }
      return key;
    },
  }),
}));

const showToast = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ showToast }),
}));

const getTeamMembers = vi.fn();
const getAllReagents = vi.fn();
const getMessages = vi.fn();
const sendMessage = vi.fn();
const markMessageAsRead = vi.fn();

vi.mock("@/lib/tauri", () => ({
  getTeamMembers: (...args: unknown[]) => getTeamMembers(...args),
  getAllReagents: (...args: unknown[]) => getAllReagents(...args),
  getMessages: (...args: unknown[]) => getMessages(...args),
  sendMessage: (...args: unknown[]) => sendMessage(...args),
  markMessageAsRead: (...args: unknown[]) => markMessageAsRead(...args),
}));

describe("Messages page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTeamMembers.mockResolvedValue([
      {
        id: 2,
        user_id: 2,
        name: "Ronit",
        email: "ronit@example.com",
        role: "member",
        status: "active",
      },
    ]);
    getAllReagents.mockResolvedValue([
      {
        id: 99,
        name: "Bottle A",
        category: "reagents",
        expiry_date: "2026-04-01",
        is_archived: false,
        created_at: "2026-03-01T00:00:00.000Z",
        updated_at: "2026-03-01T00:00:00.000Z",
      },
    ]);
    getMessages.mockResolvedValue([]);
    sendMessage.mockResolvedValue(10);
    markMessageAsRead.mockResolvedValue(undefined);
  });

  it("sends a private message with recipient and reagent attachments", async () => {
    const user = userEvent.setup();
    render(<Messages currentUserId={1} isSystemAdmin={true} />);

    await screen.findByRole("option", { name: /Ronit/ });
    const selects = await screen.findAllByRole("combobox");
    await user.selectOptions(selects[1], "2");

    await user.type(
      screen.getByPlaceholderText("messages.titlePlaceholder"),
      "Heads up",
    );
    await user.type(
      screen.getByPlaceholderText("messages.bodyPlaceholder"),
      "Please check this bottle.",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "messages.send" }));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({
        scope: "private",
        recipientUserId: 2,
        title: "Heads up",
        body: "Please check this bottle.",
        reagentIds: [99],
      });
    });
  });

  it("marks an unread inbox message as read when opened", async () => {
    const user = userEvent.setup();
    getMessages.mockResolvedValue([
      {
        id: 5,
        scope: "team",
        team_id: 7,
        sender: {
          id: 2,
          name: "Ronit",
          email: "ronit@example.com",
        },
        title: "Bottle update",
        body: "We threw away the old bottle.",
        created_at: "2026-03-12T12:00:00.000Z",
        read_at: null,
        attachments: [],
      },
    ]);

    render(<Messages currentUserId={1} isSystemAdmin={false} />);

    const title = await screen.findByText("Bottle update");
    await user.click(title);

    await waitFor(() => {
      expect(markMessageAsRead).toHaveBeenCalledWith(5);
    });
  });
});
