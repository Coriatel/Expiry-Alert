import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpiryAlertSection } from "./ExpiryAlertSection";
import { useStore } from "@/store/store";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ExpiryAlertSection", () => {
  beforeEach(() => useStore.setState({ alertExpanded: true }));

  it("summarises the alerts without repeating the items listed below", () => {
    const onDismiss = vi.fn();
    render(
      <ExpiryAlertSection
        reagents={[
          {
            id: 1,
            name: "Long English Item Name",
            category: "reagents",
            expiry_date: "2026-08-02",
            is_archived: false,
          },
        ]}
        onSnoozeAll={vi.fn()}
        onDismiss={onDismiss}
        teamName="Test Team"
      />,
    );

    expect(screen.getByText("notifications.alertSummary")).toBeInTheDocument();
    expect(screen.queryByText("Long English Item Name")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "notifications.dismiss" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "notifications.remindTomorrow" })).toHaveClass("min-h-11");

    fireEvent.click(screen.getByRole("button", { name: "notifications.dismissAll" }));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "actions.confirm" }));
    expect(onDismiss).toHaveBeenCalledWith(1, expect.any(String));
  });

  it("stays a single line until it is opened, even for expired items", () => {
    useStore.setState({ alertExpanded: null });
    render(
      <ExpiryAlertSection
        reagents={[
          { id: 1, name: "A", category: "reagents", expiry_date: "2020-01-01", is_archived: false },
        ]}
        onSnoozeAll={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText("notifications.alertSummary")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "notifications.remindTomorrow" }),
    ).not.toBeInTheDocument();
  });

  it("snoozes every alert through a single call", () => {
    const onSnoozeAll = vi.fn();
    render(
      <ExpiryAlertSection
        reagents={[
          { id: 1, name: "A", category: "reagents", expiry_date: "2026-08-02", is_archived: false },
          { id: 2, name: "B", category: "reagents", expiry_date: "2026-08-03", is_archived: false },
        ]}
        onSnoozeAll={onSnoozeAll}
        onDismiss={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "notifications.remindTomorrow" }),
    );
    expect(onSnoozeAll).toHaveBeenCalledTimes(1);
    expect(onSnoozeAll).toHaveBeenCalledWith([1, 2], 1);
  });
});
