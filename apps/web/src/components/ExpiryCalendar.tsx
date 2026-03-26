import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getExpiryStatus, cn } from "@/lib/utils";
import type { Reagent } from "@/types";

interface ExpiryCalendarProps {
  reagents: Reagent[];
}

const STATUS_COLORS: Record<string, string> = {
  expired: "bg-red-500",
  "expiring-soon": "bg-orange-500",
  "expiring-week": "bg-yellow-500",
  ok: "bg-green-500",
};

export function ExpiryCalendar({ reagents }: ExpiryCalendarProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "he";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Build reagent map by date string (YYYY-MM-DD)
  const reagentsByDate = useMemo(() => {
    const map = new Map<string, Reagent[]>();
    for (const r of reagents) {
      const date = r.expiry_date;
      if (!date) continue;
      const existing = map.get(date) ?? [];
      existing.push(r);
      map.set(date, existing);
    }
    return map;
  }, [reagents]);

  // Calendar grid
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay(); // 0=Sun
  const daysInMonth = lastDayOfMonth.getDate();

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) currentWeek.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const dayNames = isRTL
    ? ["א", "ב", "ג", "ד", "ה", "ו", "ש"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthName = new Intl.DateTimeFormat(isRTL ? "he-IL" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(currentDate);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getDotsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const items = reagentsByDate.get(dateStr);
    if (!items || items.length === 0) return null;

    // Get unique statuses
    const statuses = new Set(items.map((r) => getExpiryStatus(r.expiry_date)));
    return Array.from(statuses).map(
      (s) => STATUS_COLORS[s] ?? STATUS_COLORS.ok,
    );
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDay(selectedDay === dateStr ? null : dateStr);
  };

  const selectedReagents = selectedDay
    ? (reagentsByDate.get(selectedDay) ?? [])
    : [];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="space-y-3">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={isRTL ? nextMonth : prevMonth}
        >
          {isRTL ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
        <span className="font-medium">{monthName}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={isRTL ? prevMonth : nextMonth}
        >
          {isRTL ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0 text-center text-xs">
        {dayNames.map((d) => (
          <div key={d} className="py-1 font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {weeks.flat().map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="py-2" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dots = getDotsForDay(day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDay;

          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(day)}
              className={cn(
                "py-2 rounded-lg transition-colors relative",
                isToday &&
                  "font-extrabold text-primary ring-2 ring-primary/30 rounded-lg",
                isSelected && "bg-primary text-primary-foreground",
                !isSelected && "hover:bg-muted",
              )}
            >
              {day}
              {dots && (
                <div className="flex gap-0.5 justify-center mt-0.5">
                  {dots.slice(0, 3).map((color, j) => (
                    <span
                      key={j}
                      className={cn("h-1.5 w-1.5 rounded-full", color)}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day details */}
      {selectedDay && selectedReagents.length > 0 && (
        <div className="border rounded-lg p-3 space-y-2 mt-2">
          <div className="text-sm font-semibold border-b pb-2 mb-2">
            {t("calendar.selectedCount", { count: selectedReagents.length, defaultValue: `${selectedReagents.length} reagents` })}
          </div>
          {selectedReagents.map((r) => {
            const status = getExpiryStatus(r.expiry_date);
            const dotColor = STATUS_COLORS[status] ?? STATUS_COLORS.ok;
            return (
              <div key={r.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={cn("h-2 w-2 rounded-full shrink-0", dotColor)}
                  />
                  <span className="font-medium truncate">{r.name}</span>
                </div>
                {r.notes && (
                  <div className="text-xs text-muted-foreground ltr:ml-4 rtl:mr-4 break-words whitespace-pre-wrap">
                    {r.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          {t("filters.expired")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          {t("filters.expiringSoon")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          {t("filters.expiringWeek")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {t("filters.ok")}
        </span>
      </div>
    </div>
  );
}
