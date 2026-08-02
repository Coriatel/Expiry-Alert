import { describe, expect, it } from "vitest";
import en from "./locales/en.json";
import he from "./locales/he.json";

describe("managed item terminology", () => {
  it("uses item labels on the primary and editing surfaces", () => {
    expect(en.dashboard.title).toBe("Active Items");
    expect(en.dashboard.addMultiple).toBe("Add Items");
    expect(en.dashboard.noReagents).toBe("No items found");
    expect(en.dialog.editItem).toBe("Edit Item");
    expect(en.batchHistory.reagentName).toBe("Item Name");
    expect(en.duplicationHistory.reagentName).toBe("Item Name");

    expect(he.dashboard.title).toBe("פריטים פעילים");
    expect(he.dashboard.addMultiple).toBe("הוספת פריטים");
    expect(he.dashboard.noReagents).toBe("לא נמצאו פריטים");
    expect(he.dialog.editItem).toBe("עריכת פריט");
    expect(he.batchHistory.reagentName).toBe("שם פריט");
    expect(he.duplicationHistory.reagentName).toBe("שם פריט");
  });
});
