export type DailyTaskLike = {
  task_date: string;
  completed_at?: string | null;
};

export function getTodayTaskDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function shouldCarryForwardTask(
  task: DailyTaskLike,
  todayTaskDate = getTodayTaskDate(),
): boolean {
  return task.completed_at == null && task.task_date < todayTaskDate;
}
