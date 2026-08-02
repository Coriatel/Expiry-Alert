import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpiryAlertSection } from "./ExpiryAlertSection";
import { useStore } from "@/store/store";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ExpiryAlertSection", () => {
  beforeEach(() => useStore.setState({ alertExpanded: true }));

  it("uses compact safe actions and confirms dismissals", () => {
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
        onSnooze={vi.fn()}
        onDismiss={onDismiss}
        teamName="Test Team"
      />,
    );

    expect(screen.getByText("Long English Item Name")).toHaveAttribute("dir", "auto");
    expect(screen.getByRole("button", { name: "notifications.dismiss" })).toHaveClass("h-11");
    expect(screen.getByRole("button", { name: "notifications.remindTomorrow" })).toHaveClass("min-h-11");

    fireEvent.click(screen.getByRole("button", { name: "notifications.dismiss" }));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "actions.confirm" }));
    expect(onDismiss).toHaveBeenCalledWith(1, expect.any(String));
  });
});
