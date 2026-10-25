import { describe, expect, it } from "vitest";
import {
  parseGs1Label,
  parseImmucorVial,
  parseTypedBarcode,
  pickLabel,
} from "./gs1";

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

// Immucor bags and boxes (photos 2026-10-15): a plain Code 128 of REF + 5 digits + LOT with no
// expiry, next to a GS1 UDI whose (10)(17) part is sometimes a barcode of its own. The reader
// returned that one as plain text with the brackets: "(10)112062(17)261120".
describe("Immucor outer labels", () => {
  it("reads lot and expiry from the separate (10)(17) barcode", () => {
    expect(parseGs1Label("10345138\u001d17270108")).toEqual({
      lot: "345138",
      expiryDate: "2027-01-08",
    });
    expect(parseGs1Label("(10)112062(17)261120")).toEqual({
      lot: "112062",
      expiryDate: "2026-11-20",
    });
  });

  it("reads the single UDI barcode on the corQC box", () => {
    expect(parseGs1Label("0110888234002123\u001d1036595RL\u001d17261113")).toEqual({
      gtin: "10888234002123",
      lot: "36595RL",
      expiryDate: "2026-11-13",
    });
  });

  it.each(["000234200243112062", "000705600121345138"])(
    "does not read the REF + LOT code %s as a vial",
    (raw) => {
      expect(parseImmucorVial(raw)).toBeNull();
    },
  );

  it("prefers the GS1 barcode when one frame holds both", () => {
    expect(
      pickLabel([
        { text: "000234200243112062", contentType: "Text" },
        { text: "0110888234000266", contentType: "GS1" },
        { text: "10112062\u001d17261120", contentType: "GS1" },
      ]),
    ).toEqual({ lot: "112062", expiryDate: "2026-11-20" });
  });

  it("reads the bracketed (10)(17) text the reader returns for these labels", () => {
    expect(
      pickLabel([
        { text: "000234200243112062", contentType: "Text" },
        { text: "(10)112062(17)261120", contentType: "Text" },
      ]),
    ).toEqual({ lot: "112062", expiryDate: "2026-11-20" });
    expect(pickLabel([{ text: "(10)345138(17)270108", contentType: "Text" }])).toEqual({
      lot: "345138",
      expiryDate: "2027-01-08",
    });
  });

  it("finds nothing in the REF + LOT code alone", () => {
    expect(pickLabel([{ text: "00024100012836595RL", contentType: "Text" }])).toBeNull();
  });

  it("still reads a vial when it is the only barcode", () => {
    expect(pickLabel([{ text: "954132272850142314", contentType: "Text" }])).toEqual({
      lot: "954285",
      expiryDate: "2027-05-12",
    });
  });
});


describe("parseTypedBarcode", () => {
  it("reads a typed Immucor vial code", () => {
    expect(parseTypedBarcode(" 112306260621234567 ")).toEqual(
      parseImmucorVial("112306260621234567"),
    );
  });

  it("reads typed GS1 digits with spaces between the fields", () => {
    expect(parseTypedBarcode("01 07611969000838 17 261012 10 137061321")).toEqual({
      gtin: "07611969000838",
      expiryDate: "2026-10-12",
      lot: "137061321",
    });
  });

  it("reads the bracketed form", () => {
    expect(parseTypedBarcode("(10)112062(17)261120")).toEqual({
      lot: "112062",
      expiryDate: "2026-11-20",
    });
  });

  it("never reads an Immucor REF code as a vial", () => {
    expect(parseTypedBarcode("000234200243112062")).toBeNull();
  });

  it("returns null for text with no lot or expiry", () => {
    expect(parseTypedBarcode("hello")).toBeNull();
    expect(parseTypedBarcode("")).toBeNull();
  });
});
