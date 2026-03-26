import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { parseISO } from "date-fns";
import { getExpiryStatus, getDaysUntilExpiry, cn } from "@/lib/utils";
import type { Reagent } from "@/types";

interface ExpiryTimelineProps {
  reagents: Reagent[];
}

const STATUS_COLORS: Record<string, string> = {
  expired: "bg-red-500",
  "expiring-soon": "bg-orange-500",
  "expiring-week": "bg-yellow-500",
  ok: "bg-green-500",
};

type Group = {
  label: string;
  items: Reagent[];
};

export function ExpiryTimeline({ reagents }: ExpiryTimelineProps) {
  const { t } = useTranslation();

  const groups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));

    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfWeek.getDate() + 7);

    const result: Group[] = [
      { label: t("calendar.today"), items: [] },
      { label: t("calendar.thisWeek"), items: [] },
      { label: t("calendar.nextWeek"), items: [] },
      { label: t("calendar.later"), items: [] },
    ];

    const sorted = [...reagents].sort(
      (a, b) =>
        new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime(),
    );

    for (const r of sorted) {
      const expiryDate = parseISO(r.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);
      const days = getDaysUntilExpiry(r.expiry_date);

      if (days <= 0 || expiryDate <= endOfToday) {
        result[0].items.push(r);
      } else if (expiryDate <= endOfWeek) {
        result[1].items.push(r);
      } else if (expiryDate <= endOfNextWeek) {
        result[2].items.push(r);
      } else {
        result[3].items.push(r);
      }
    }

    return result.filter((g) => g.items.length > 0);
  }, [reagents, t]);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("calendar.noItems")}</p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
            {group.label}
          </h4>
          <div className="space-y-1.5">
            {group.items.map((r) => {
              const status = getExpiryStatus(r.expiry_date);
              const days = getDaysUntilExpiry(r.expiry_date);
              const dotColor = STATUS_COLORS[status] ?? STATUS_COLORS.ok;

              return (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn("h-2 w-2 rounded-full shrink-0", dotColor)}
                  />
                  <span className="truncate flex-1">{r.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {days < 0
                      ? t("status.expired")
                      : days === 0
                        ? t("status.expiresToday")
                        : days === 1
                          ? t("status.expiresInOneDay")
                          : t("status.expiresIn", { days })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
