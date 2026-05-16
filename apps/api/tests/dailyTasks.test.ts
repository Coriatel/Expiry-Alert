import test from "node:test";
import assert from "node:assert/strict";
import {
  getTodayTaskDate,
  shouldCarryForwardTask,
} from "../src/services/dailyTasks.ts";

test("shouldCarryForwardTask only carries unfinished tasks from earlier days", () => {
  assert.equal(
    shouldCarryForwardTask(
      { task_date: "2026-04-19", completed_at: null },
      "2026-04-20",
    ),
    true,
  );
  assert.equal(
    shouldCarryForwardTask(
      { task_date: "2026-04-20", completed_at: null },
      "2026-04-20",
    ),
    false,
  );
  assert.equal(
    shouldCarryForwardTask(
      { task_date: "2026-04-18", completed_at: "2026-04-18T10:00:00.000Z" },
      "2026-04-20",
    ),
    false,
  );
});

test("getTodayTaskDate uses ISO calendar date format", () => {
  assert.equal(
    getTodayTaskDate(new Date("2026-04-20T13:45:00.000Z")),
    "2026-04-20",
  );
});
