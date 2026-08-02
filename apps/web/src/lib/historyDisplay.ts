type SortDirection = "asc" | "desc";

function sortEntries<T extends object>(
  entries: readonly T[],
  sortField: keyof T,
  sortDirection: SortDirection,
): T[] {
  return [...entries].sort((first, second) => {
    const firstValue = first[sortField];
    const secondValue = second[sortField];

    if (firstValue == null && secondValue == null) return 0;
    if (firstValue == null) return 1;
    if (secondValue == null) return -1;

    const comparison =
      typeof firstValue === "number" && typeof secondValue === "number"
        ? firstValue - secondValue
        : String(firstValue).localeCompare(String(secondValue));

    return sortDirection === "desc" ? -comparison : comparison;
  });
}

export function getDestructionDisplayEntries<
  T extends { quantity_destroyed: number },
>(
  entries: readonly T[],
  destroyedOnly: boolean,
  sortField: keyof T,
  sortDirection: SortDirection,
): T[] {
  const filteredEntries = destroyedOnly
    ? entries.filter((entry) => entry.quantity_destroyed > 0)
    : entries;

  return sortEntries(filteredEntries, sortField, sortDirection);
}

export function getDuplicationDisplayEntries<T extends object>(
  entries: readonly T[],
  sortField: keyof T,
  sortDirection: SortDirection,
): T[] {
  return sortEntries(entries, sortField, sortDirection);
}
