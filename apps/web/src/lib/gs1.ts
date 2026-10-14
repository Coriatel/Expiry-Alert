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
  const text = raw.replace(/^\][A-Za-z]\d/, "");

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
export function parseImmucorVial(raw: string): Gs1Label | null {
  const match = /^(\d{3})(\d{3})(\d{2})(\d{3})\d{7}$/.exec(raw);
  if (!match) return null;
  const [, lotStart, dayOfYear, year, lotEnd] = match;
  const day = Number(dayOfYear);
  const date = new Date(Date.UTC(2000 + Number(year), 0, day));
  if (day < 1 || date.getUTCFullYear() !== 2000 + Number(year)) return null;
  return {
    lot: lotStart + lotEnd,
    expiryDate: date.toISOString().slice(0, 10),
  };
}
