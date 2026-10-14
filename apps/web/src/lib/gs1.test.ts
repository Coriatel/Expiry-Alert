import { describe, expect, it } from "vitest";
import { parseGs1Label, parseImmucorVial } from "./gs1";

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

// Plain 18-digit Code 128 on Immucor vials, decoded from photos of five vials (four lots)
// in the blood bank (2026-10-11 and 2026-10-14), checked against the printed LOT and date.
describe("parseImmucorVial", () => {
  it.each([
    ["954132272850142314", "954285", "2027-05-12"],
    ["954132272850273020", "954285", "2027-05-12"],
    ["964140272250682531", "964225", "2027-05-20"],
    ["619294271050329048", "619105", "2027-10-21"],
    ["344206270260149606", "344026", "2027-07-25"],
  ])("reads lot and expiry from %s", (raw, lot, expiryDate) => {
    expect(parseImmucorVial(raw)).toEqual({ lot, expiryDate });
  });

  it("counts day 60 as 29 February in a leap year", () => {
    expect(parseImmucorVial("123060284560000000")).toEqual({
      lot: "123456",
      expiryDate: "2028-02-29",
    });
    expect(parseImmucorVial("123060274560000000")?.expiryDate).toBe(
      "2027-03-01",
    );
  });

  it.each([
    ["3009-2", "a catalog number"],
    ["95413227285014231", "17 digits"],
    ["9541322728501423145", "19 digits"],
    ["954000272850142314", "day 0"],
    ["954366272850142314", "day 366 in a common year"],
    ["95413227285014231X", "a non-digit"],
  ])("ignores %s (%s)", (raw) => {
    expect(parseImmucorVial(raw)).toBeNull();
  });
});
