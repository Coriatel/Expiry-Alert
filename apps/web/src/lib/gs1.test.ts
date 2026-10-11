import { describe, expect, it } from "vitest";
import { parseGs1Label } from "./gs1";

// Raw contents decoded from photos of labels in the blood bank (2026-10-11).
describe("parseGs1Label", () => {
  it("reads lot and expiry from a Bio-Rad DataMatrix", () => {
    expect(parseGs1Label("01076119690008381726101210137061321")).toEqual({
      gtin: "07611969000838",
      expiryDate: "2026-10-12",
      lot: "137061321",
    });
  });

  it("reads the bracketed form scanners print for the same label", () => {
    expect(
      parseGs1Label("(01)07611969000968(17)261012(10)137810981"),
    ).toEqual({
      gtin: "07611969000968",
      expiryDate: "2026-10-12",
      lot: "137810981",
    });
  });

  it("stops the lot at the group separator before the serial number", () => {
    expect(
      parseGs1Label("]d201236615627471191727033110872000\u001d21000128\u001d"),
    ).toEqual({
      gtin: "23661562747119",
      expiryDate: "2027-03-31",
      lot: "872000",
    });
  });

  it("treats day 00 as the last day of the month", () => {
    expect(parseGs1Label("(17)270200(10)A1")?.expiryDate).toBe("2027-02-28");
  });

  it("rejects a barcode that is not GS1", () => {
    expect(parseGs1Label("954132272850142314")).toBeNull();
  });

  it("rejects an impossible expiry date instead of guessing", () => {
    expect(parseGs1Label("(17)271345(10)A1")).toBeNull();
  });
});
