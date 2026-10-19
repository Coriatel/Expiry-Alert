import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { DateInput, displayToIso, formatDigits, isoToDisplay } from "./DateInput";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe("date text helpers", () => {
  it("adds the dots while digits are typed", () => {
    expect(formatDigits("3")).toBe("3");
    expect(formatDigits("3112")).toBe("31.12");
    expect(formatDigits("311220261")).toBe("31.12.2026");
    expect(formatDigits("31/12/2026")).toBe("31.12.2026");
  });

  it("converts only real, complete dates", () => {
    expect(displayToIso("31.12.2026")).toBe("2026-12-31");
    expect(displayToIso("29.02.2028")).toBe("2028-02-29");
    expect(displayToIso("31.02.2026")).toBe("");
    expect(displayToIso("31.12")).toBe("");
    expect(isoToDisplay("2026-10-26")).toBe("26.10.2026");
    expect(isoToDisplay("")).toBe("");
  });
});

function Harness({ initial = "", onValue }: { initial?: string; onValue: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <DateInput
      placeholderText="dd.mm.yyyy"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onValue(e.target.value);
      }}
    />
  );
}

describe("DateInput", () => {
  it("opens the numeric keyboard and reports the ISO date once complete", () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByPlaceholderText("dd.mm.yyyy") as HTMLInputElement;
    expect(input.getAttribute("inputmode")).toBe("numeric");

    fireEvent.change(input, { target: { value: "3112" } });
    expect(input.value).toBe("31.12");
    expect(onValue).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "31.12.2026" } });
    expect(onValue).toHaveBeenLastCalledWith("2026-12-31");
  });

  it("marks an impossible date invalid instead of saving it", () => {
    const onValue = vi.fn();
    render(<Harness initial="2026-10-26" onValue={onValue} />);
    const input = screen.getByPlaceholderText("dd.mm.yyyy") as HTMLInputElement;
    expect(input.value).toBe("26.10.2026");

    fireEvent.change(input, { target: { value: "31.02.2026" } });
    expect(onValue).toHaveBeenLastCalledWith("");
    expect(input.value).toBe("31.02.2026");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.validity.valid).toBe(false);
  });

  it("fills the text when a day is picked from the calendar", () => {
    const onValue = vi.fn();
    const { container } = render(<Harness onValue={onValue} />);
    const picker = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(picker, { target: { value: "2027-03-31" } });
    expect(onValue).toHaveBeenLastCalledWith("2027-03-31");
    expect((screen.getByPlaceholderText("dd.mm.yyyy") as HTMLInputElement).value).toBe("31.03.2027");
    expect(screen.getByRole("button", { name: "form.openCalendar" })).toBeTruthy();
  });
});
