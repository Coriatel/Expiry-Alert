export function whereEq(field: string, value: string | number) {
  const safe = String(value).replace(/'/g, "''");
  return `(${field},eq,'${safe}')`;
}
