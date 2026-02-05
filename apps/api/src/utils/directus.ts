export function whereEq(field: string, value: string | number | boolean) {
  return { [field]: { _eq: value } };
}
