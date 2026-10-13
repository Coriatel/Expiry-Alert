import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BulkAddForm } from "./BulkAddForm";
import type { Gs1Label } from "@/lib/gs1";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "he" },
  }),
}));

vi.mock("@/lib/tauri", () => ({
  getSuppliers: vi.fn(() => new Promise(() => {})),
  getReagentCatalog: vi.fn(() => new Promise(() => {})),
}));

const scans: Gs1Label[] = [
  { gtin: "07611969000838", expiryDate: "2026-10-12", lot: "137061321" },
  { gtin: "23661562747119", expiryDate: "2027-03-31", lot: "872000" },
];

vi.mock("./BarcodeScanDialog", () => ({
  BarcodeScanDialog: ({
    open,
    onScanned,
  }: {
    open: boolean;
    onScanned: (label: Gs1Label) => void;
  }) =>
    open ? (
      <button onClick={() => onScanned(scans.shift()!)}>fake-scan</button>
    ) : null,
}));

describe("BulkAddForm — scanning a label", () => {
  it("puts each scanned lot and expiry into the next empty row", () => {
    const { container } = render(
      <BulkAddForm onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    const lots = () =>
      screen
        .getAllByPlaceholderText("form.lotNumber")
        .map((input) => (input as HTMLInputElement).value);
    const dates = () =>
      Array.from(
        container.querySelectorAll<HTMLInputElement>('input[type="date"]'),
      ).map((input) => input.value);

    fireEvent.click(screen.getByRole("button", { name: "scan.button" }));
    fireEvent.click(screen.getByText("fake-scan"));

    expect(lots()[0]).toBe("137061321");
    expect(dates()[0]).toBe("2026-10-12");
    expect(screen.queryByText("fake-scan")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "scan.button" }));
    fireEvent.click(screen.getByText("fake-scan"));

    expect(lots().slice(0, 2)).toEqual(["137061321", "872000"]);
    expect(dates().slice(0, 2)).toEqual(["2026-10-12", "2027-03-31"]);
  });
});

describe("BulkAddForm — number of rows", () => {
  it("opens with one row and adds one more per press", () => {
    render(<BulkAddForm onSave={vi.fn()} onCancel={vi.fn()} />);
    const lotInputs = () => screen.getAllByPlaceholderText("form.lotNumber");

    expect(lotInputs()).toHaveLength(1);

    fireEvent.change(lotInputs()[0], { target: { value: "LOT-1" } });
    fireEvent.click(
      screen.getByRole("button", { name: "dashboard.addAnotherItem" }),
    );

    expect(lotInputs()).toHaveLength(2);
    expect((lotInputs()[0] as HTMLInputElement).value).toBe("LOT-1");
    expect((lotInputs()[1] as HTMLInputElement).value).toBe("");
  });
});
