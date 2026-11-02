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

// The two layouts cannot be told apart from the digits, so the layout comes from product evidence
// (owner's rule, 2026-11-01). Immucor REFs seen on real labels, plus the blood bank reagent REFs
// in FDA GUDID (accessgudid.nlm.nih.gov, Immucor GTIN prefix 10888234). 5350022 is from a box.
// The second group: further Immucor blood bank REFs from GUDID and the EU
// IVDR certificates (transfusionandtransplant.werfen.com/en-ca/about/certifications). 0002410 is
// the EU corQC Test System REF (seen on a real label; the US REF is 0002400).
const KNOWN_IMMUCOR_REFS = new Set([
  "0002342", "0007056", "5350022",
  "0410203", "0410210", "0413203", "0413210", "0414210", "0420503", "0420403", "0420410",
  "0409203", "0409210", "0401510", "0409703", "0409710", "0401010",
  "0002345", "0002224", "0002225", "0002377", "0002381", "0003032", "0002400", "0002410",
  "0006406", "0006407", "0004816", "0066430", "0007591", "0004818", "0007594",
]);
// Reagent IDs (first 3 digits) read from real Immucor vials. 345 (GammaZyme-F ficin) and 112
// (Referencells A2) are single-vial products whose printed 6-digit lots all start with them.
const KNOWN_VIAL_REAGENT_IDS = new Set(["954", "936", "964", "619", "344", "345", "112"]);

// A bare 18-digit REF/LOT reading: on every real REF/LOT code the 5-digit middle starts "0".
const bareRefLot = (raw: string) => /^\d{7}0\d{4}(\d{6})$/.exec(raw)?.[1] ?? null;

// A vial with these digits that has not expired yet: a known REF code that reads as one is not
// a sure REF ("042050301234567890" is REF 0420503 or a 2030 vial). An expired one cannot be on the
// shelf, so the REF 5350022 box ("5350022005...", as a vial 2020) still gives its lot.
function couldBeLiveVial(raw: string): boolean {
  const day = Number(raw.slice(3, 6));
  const year = 2000 + Number(raw.slice(6, 8));
  if (day < 1 || new Date(Date.UTC(year, 0, day)).getUTCFullYear() !== year) return false;
  return year >= new Date().getUTCFullYear() - 1;
}

// The team's Immucor lots, each with the expiry dates it was saved with.
export type KnownLots = ReadonlyMap<string, readonly string[]>;

// A known REF allows only the REF/LOT reading; a known reagent ID only the vial reading; if the
// allowed reading fails, nothing. With neither, a code that reads both ways is decided by the
// team's own lots ("products repeat, lots repeat", owner 2026-11-01): if exactly one of the two
// lots is already on the team's list (a vial lot with the same expiry), that reading; else nothing.
export function parseImmucorPlain(
  raw: string,
  knownLots?: KnownLots,
): Gs1Label | null {
  if (KNOWN_IMMUCOR_REFS.has(raw.slice(0, 7))) {
    const lot = bareRefLot(raw);
    return parseImmucorRefLot(raw) ?? (lot && !couldBeLiveVial(raw) ? { lot } : null);
  }
  if (KNOWN_VIAL_REAGENT_IDS.has(raw.slice(0, 3))) return parseImmucorVial(raw);
  const vial = parseImmucorVial(raw);
  const refLot = bareRefLot(raw);
  if (vial && refLot) {
    // The vial reading also fills an expiry, so its lot must be known with that same expiry.
    const vialSeen = knownLots?.get(vial.lot ?? "");
    const refSeen = !!knownLots?.has(refLot);
    if (refSeen && !vialSeen) return { lot: refLot };
    if (!refSeen && vialSeen?.includes(vial.expiryDate ?? "")) return vial;
    return null;
  }
  return vial ?? parseImmucorRefLot(raw);
}

// An unknown code that reads both as a vial and as REF/LOT, with nothing to decide between them:
// both readings, for the person holding the label to choose (owner, 2026-11-02). The choice is
// remembered by saving the reagent: its lot then decides the next scan (knownLots).
export function immucorAlternatives(
  raw: string,
  knownLots?: KnownLots,
): Gs1Label[] | null {
  if (!/^\d{18}$/.test(raw)) return null;
  if (KNOWN_IMMUCOR_REFS.has(raw.slice(0, 7))) return null;
  if (KNOWN_VIAL_REAGENT_IDS.has(raw.slice(0, 3))) return null;
  if (parseImmucorPlain(raw, knownLots)) return null;
  const vial = parseImmucorVial(raw);
  const refLot = bareRefLot(raw);
  return vial && refLot ? [vial, { lot: refLot }] : null;
}

// Offered only when the frame holds nothing else that reads: a GS1 label or a decided code wins.
export function pickAlternatives(
  results: { text: string; contentType: string }[],
  knownLots?: KnownLots,
): Gs1Label[] | null {
  if (parseAll(results, knownLots).length > 0) return null;
  const sets = results
    .filter((r) => !isGs1(r))
    .map((r) => immucorAlternatives(r.text, knownLots))
    .filter((a) => a !== null);
  const distinct = new Set(sets.map((a) => a.map((l) => l.lot).join("|")));
  return distinct.size === 1 ? sets[0] : null;
}

export function typedAlternatives(
  typed: string,
  knownLots?: KnownLots,
): Gs1Label[] | null {
  return immucorAlternatives(typed.replace(/\s+/g, ""), knownLots);
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
// A label with both lot and expiry beats one with only a lot. Labels that disagree on any field
// both state (two products in the frame) give nothing: guessing between them could fill the wrong one.
const isGs1 = (r: { text: string; contentType: string }) =>
  r.contentType === "GS1" || /^\(\d{2,4}\)/.test(r.text) || isUnmarkedGs1(r.text);

function parseAll(
  results: { text: string; contentType: string }[],
  knownLots?: KnownLots,
): Gs1Label[] {
  return [
    ...results.filter(isGs1).map((r) => parseGs1Label(r.text)),
    ...results.filter((r) => !isGs1(r)).map((r) => parseImmucorPlain(r.text, knownLots)),
  ].filter((label) => label !== null);
}

function hasConflict(labels: Gs1Label[]): boolean {
  return (["gtin", "lot", "expiryDate"] as const).some(
    (field) => new Set(labels.map((l) => l[field]).filter(Boolean)).size > 1,
  );
}

export function pickLabel(
  results: { text: string; contentType: string }[],
  knownLots?: KnownLots,
): Gs1Label | null {
  const parsed = parseAll(results, knownLots);
  if (hasConflict(parsed)) return null;
  return (
    parsed.find((label) => label.lot && label.expiryDate) ??
    parsed.find((label) => label.lot) ??
    parsed[0] ??
    null
  );
}

export function hasConflictingLabels(
  results: { text: string; contentType: string }[],
  knownLots?: KnownLots,
): boolean {
  return hasConflict(parseAll(results, knownLots));
}

// Typed by hand or by a keyboard scanner: spaces between fields are dropped and there is no
// reader to say which symbology it was, so a plain 18-digit Immucor code is tried first.
// 18 bare digits are taken as Immucor only: a rejected vial read as GS1 would give a wrong lot
// ("102132222850535334" -> lot 2132222850535334).
export function parseTypedBarcode(
  typed: string,
  knownLots?: KnownLots,
): Gs1Label | null {
  const text = typed.replace(/\s+/g, "");
  if (!text) return null;
  if (/^\d{18}$/.test(text))
    return parseImmucorPlain(text, knownLots);
  return (
    parseImmucorVial(text) ?? parseGs1Label(text) ?? parseImmucorRefLot(text)
  );
}
