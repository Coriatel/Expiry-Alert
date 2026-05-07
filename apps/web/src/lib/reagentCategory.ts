import type { Reagent, ReagentFormData } from "@/types";

type ReagentLike = Reagent & {
  category?: string | null;
};

export function normalizeReagentCategory(
  category: string | null | undefined,
): ReagentFormData["category"] {
  return category === "beads" ? "beads" : "reagents";
}

export function normalizeReagent(reagent: ReagentLike): Reagent {
  return {
    ...reagent,
    category: normalizeReagentCategory(reagent.category),
  };
}
