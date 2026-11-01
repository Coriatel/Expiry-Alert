export interface Gs1Label {
  gtin?: string;
  expiryDate?: string;
  lot?: string;
}

const GROUP_SEPARATOR = "\u001d";

// Data length of the fixed-length application identifiers we may have to skip.
const FIXED_LENGTH: Record<string, number> = {
  "00": 18,
  "01": 14,
  "02": 14,
  "11": 6,
  "12": 6,
  "13": 6,
  "15": 6,
  "16": 6,
  "17": 6,
  "20": 2,
};
const VARIABLE_LENGTH = new Set(["10", "21", "22"]);

function readFields(raw: string): Map<string, string> {
  const fields = new Map<string, string>();
  // The reader prints a group separator inside non-GS1 Code 128 as the text "<GS>".
  const text = raw.replace(/^\][A-Za-z]\d/, "").split("<GS>").join(GROUP_SEPARATOR);

  if (text.includes("(")) {
    for (const match of text.matchAll(/\((\d{2,4})\)([^(]*)/g)) {
      fields.set(match[1], match[2].split(GROUP_SEPARATOR).join(""));
    }
    return fields;
  }

  let position = 0;
  while (position < text.length) {
    if (text[position] === GROUP_SEPARATOR) {
      position += 1;
      continue;
    }
    const identifier = text.slice(position, position + 2);
    position += 2;
    if (identifier in FIXED_LENGTH) {
      fields.set(
        identifier,
        text.slice(position, position + FIXED_LENGTH[identifier]),
      );
      position += FIXED_LENGTH[identifier];
    } else if (VARIABLE_LENGTH.has(identifier)) {
      const end = text.indexOf(GROUP_SEPARATOR, position);
      fields.set(identifier, text.slice(position, end === -1 ? undefined : end));
      position = end === -1 ? text.length : end;
    } else {
      break;
    }
  }
  return fields;
}

// GS1 writes expiry as YYMMDD; day 00 means "end of that month".
function toIsoDate(yymmdd: string): string | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const year = 2000 + Number(yymmdd.slice(0, 2));
  const month = Number(yymmdd.slice(2, 4));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Number(yymmdd.slice(4, 6)) || lastDay;
  if (month < 1 || month > 12 || day > lastDay) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseGs1Label(raw: string): Gs1Label | null {
  const fields = readFields(raw);
  const expiry = fields.get("17");
  const expiryDate = expiry === undefined ? undefined : toIsoDate(expiry);
  if (expiryDate === null) return null;

  const lot = fields.get("10") || undefined;
  if (!expiryDate && !lot) return null;

  const label: Gs1Label = {};
  if (fields.get("01")) label.gtin = fields.get("01");
  if (expiryDate) label.expiryDate = expiryDate;
  if (lot) label.lot = lot;
  return label;
}

// Immucor vials carry a plain 18-digit Code 128, not GS1. Read from five vials:
// lot digits 1-3, expiry day of year (3 digits), expiry year (2), lot digits 4-6,
// then 7 digits that differ per vial. The "L" printed after some lots is not encoded.
// Immucor bags and boxes carry another plain 18-digit code - REF (000xxxx), 5 digits, LOT -
// with no expiry in it; "000234200243112062" would otherwise read as lot 000024, expiry 2020.
// A misread code can still form a valid day of year; expiry dates outside this window are not
// trusted ("535002200516517309", an Immucor REF/LOT code, would read as expiry 2020-01-02).
// Reagents are shipped with at most about three years of shelf life. The vial layout and the
// REF/LOT layout are both 18 digits and cannot be told apart in every case; the year window and
// the "04" check below remove every confusion seen on real labels so far.
function plausibleExpiryYear(year: number): boolean {
  const now = new Date().getUTCFullYear();
  return year >= now - 1 && year <= now + 3;
}

export function parseImmucorVial(raw: string): Gs1Label | null {
  if (raw.startsWith("000")) return null;
  // Immucor reagent REFs start "04" and the 5-digit middle starts "0", so a REF/LOT code read as a
  // vial has a year ending in 0: "041021300398104036" would read as lot 041003, expiry 2030.
  if (raw.startsWith("04") && raw[7] === "0") return null;
  const match = /^(\d{3})(\d{3})(\d{2})(\d{3})\d{7}$/.exec(raw);
  if (!match) return null;
  const [, lotStart, dayOfYear, year, lotEnd] = match;
  const day = Number(dayOfYear);
  const date = new Date(Date.UTC(2000 + Number(year), 0, day));
  if (day < 1 || date.getUTCFullYear() !== 2000 + Number(year)) return null;
  if (!plausibleExpiryYear(date.getUTCFullYear())) return null;
  // A REF/LOT code read as a vial has a year ending in 0 (the 5-digit middle starts "0"), so such a
  // year is trusted only when it is this year or next: "535002300516517309" is not a 2030 vial.
  if (year[1] === "0" && date.getUTCFullYear() > new Date().getUTCFullYear() + 1) return null;
  return {
    lot: lotStart + lotEnd,
    expiryDate: date.toISOString().slice(0, 10),
  };
}

// Immucor boxes, blisters and bags also print REF (7 digits) + 5 digits + LOT as plain Code 128:
// "041021000398104036-2" is REF 0410210, LOT 104036-2. It has no expiry, so it only gives the lot.
// Only forms a vial can never take are accepted: the "-2" lot suffix, or the "000" REF of bags.
// A bare 18 digits may be a vial, whose last six digits are not its lot.
export function parseImmucorRefLot(raw: string): Gs1Label | null {
  const match =
    /^\d{7}\d{5}(\d{6}-\d)$/.exec(raw) ?? /^000\d{4}0\d{4}(\d{6})$/.exec(raw);
  return match ? { lot: match[1] } : null;
}

// Immucor also prints the UDI as plain Code 128 without the GS1 start marker:
// "011088823400166910704078-1<GS>17270722". It is GS1 in all but name.
// Only with a group separator or an expiry straight after the GTIN, so a 20-character REF/LOT
// code that happens to start "01" is not taken for one.
const isUnmarkedGs1 = (text: string) =>
  /^01\d{14}(10|17|21)/.test(text) &&
  (text.includes("<GS>") || text.includes(GROUP_SEPARATOR) || /^01\d{14}17\d{6}/.test(text));

// A frame can hold several codes; a GS1 one states lot and expiry outright, so it wins.
// Immucor prints "(10)112062(17)261120" as plain Code 128 text, brackets included, so the
// reader does not mark it GS1; the bracketed form is read as GS1 all the same.
// A label with both lot and expiry beats one with only a lot. Two complete labels that disagree
// (two products in the frame) give nothing: guessing between them could fill the wrong one.
export function pickLabel(
  results: { text: string; contentType: string }[],
): Gs1Label | null {
  const isGs1 = (r: { text: string; contentType: string }) =>
    r.contentType === "GS1" ||
    /^\(\d{2,4}\)/.test(r.text) ||
    isUnmarkedGs1(r.text);
  const parsed = [
    ...results.filter(isGs1).map((r) => parseGs1Label(r.text)),
    ...results.filter((r) => !isGs1(r)).map((r) => parseImmucorVial(r.text)),
    ...results.filter((r) => !isGs1(r)).map((r) => parseImmucorRefLot(r.text)),
  ].filter((label) => label !== null);
  const complete = parsed.filter((label) => label.lot && label.expiryDate);
  if (hasConflict(complete)) return null;
  const lots = new Set(parsed.filter((l) => l.lot).map((l) => l.lot));
  if (complete.length === 0 && lots.size > 1) return null;
  return complete[0] ?? parsed.find((label) => label.lot) ?? parsed[0] ?? null;
}

function hasConflict(labels: Gs1Label[]): boolean {
  return new Set(labels.map((l) => `${l.lot}|${l.expiryDate}`)).size > 1;
}

export function hasConflictingLabels(
  results: { text: string; contentType: string }[],
): boolean {
  return (
    pickLabel(results) === null &&
    hasConflict(
      results
        .map((r) => pickLabel([r]))
        .filter((l): l is Gs1Label => !!l?.lot && !!l.expiryDate),
    )
  );
}

// Typed by hand or by a keyboard scanner: spaces between fields are dropped and there is no
// reader to say which symbology it was, so a plain 18-digit Immucor code is tried first.
export function parseTypedBarcode(typed: string): Gs1Label | null {
  const text = typed.replace(/\s+/g, "");
  if (!text) return null;
  return (
    parseImmucorVial(text) ?? parseGs1Label(text) ?? parseImmucorRefLot(text)
  );
}
