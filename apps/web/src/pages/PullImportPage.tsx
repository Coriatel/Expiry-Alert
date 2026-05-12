import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getAllReagents,
  getSourceReagents,
  pullReagents,
  type PullResult,
} from "@/lib/tauri";
import type { Reagent } from "@/types";

interface PullImportPageProps {
  requestId: number;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function normalizeLot(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = value.replace(/\s+/g, "").toLowerCase();
  return s.length === 0 ? null : s;
}

export function PullImportPage({ requestId }: PullImportPageProps) {
  const { t } = useTranslation();
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [callerLots, setCallerLots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notActionable, setNotActionable] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PullResult | null>(null);

  const fetchData = (signal?: { cancelled: boolean }) => {
    setLoading(true);
    setError(null);
    setNotActionable(false);
    return Promise.all([getSourceReagents(requestId), getAllReagents()])
      .then(([sourceList, callerList]) => {
        if (signal?.cancelled) return;
        setReagents(sourceList);
        const lots = new Set<string>();
        for (const r of callerList) {
          const n = normalizeLot(r.lot_number);
          if (n) lots.add(n);
        }
        setCallerLots(lots);
      })
      .catch((e: unknown) => {
        if (signal?.cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        const code = (e as { code?: unknown })?.code;
        // authorizePullSource codes that mean "URL not actionable for this user"
        if (
          code === "request_not_approved" ||
          code === "forbidden" ||
          code === "not_creator" ||
          code === "not_found"
        ) {
          setNotActionable(true);
        } else {
          setError(msg);
        }
      })
      .finally(() => {
        if (!signal?.cancelled) setLoading(false);
      });
  };

  useEffect(() => {
    const signal = { cancelled: false };
    fetchData(signal);
    return () => {
      signal.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const dupSet = useMemo(() => {
    const s = new Set<number>();
    for (const r of reagents) {
      const n = normalizeLot(r.lot_number);
      if (n && callerLots.has(n)) s.add(r.id);
    }
    return s;
  }, [reagents, callerLots]);

  const toggle = (id: number) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((cur) => {
      if (cur.size === reagents.length) return new Set();
      return new Set(reagents.map((r) => r.id));
    });
  };

  const allSelected = reagents.length > 0 && selected.size === reagents.length;

  const handleImport = async () => {
    if (selected.size === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const ids = Array.from(selected);
      const res = await pullReagents(requestId, ids);
      setResult(res);
      setSelected(new Set());
      if (res.imported.length > 0) {
        // Request transitioned to "completed" — source-reagents will 403.
        setReagents([]);
      } else {
        await fetchData();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t("pullImport.title", { defaultValue: "ייבוא פריטים מצוות אחר" })}
        </h1>
        <a
          href="/"
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          {t("pullImport.backToDashboard", { defaultValue: "חזרה ללוח הבקרה" })}
        </a>
      </header>

      <p className="text-sm text-muted-foreground">
        {t("pullImport.hint", {
          defaultValue:
            "אלו הפריטים הזמינים מהצוות שאישר את בקשת ההעברה. סמן/י את הפריטים שברצונך לייבא. פריטים שכבר קיימים אצלך (לפי מספר אצווה) מסומנים בתג ולא נבחרים אוטומטית — ניתן לסמן ידנית אם רוצים בכל זאת.",
        })}
      </p>

      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 text-green-900 p-3 text-sm">
          {t("pullImport.resultSummary", {
            defaultValue: "{{imported}} יובאו, {{skipped}} דולגו",
            imported: result.imported.length,
            skipped: result.skipped.length,
          })}
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-muted-foreground">
          {t("actions.processing", { defaultValue: "מעבד..." })}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-900 p-3 text-sm">
          {t("pullImport.error", { defaultValue: "שגיאה" })}: {error}
        </div>
      )}

      {notActionable && !loading && !result && (
        <div className="rounded-lg border bg-muted/40 p-6 text-center space-y-3">
          <p className="text-base">
            {t("pullImport.notActionable", {
              defaultValue:
                "בקשת ההעברה כבר טופלה או שאינה זמינה לייבוא יותר.",
            })}
          </p>
          <a
            href="/"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("pullImport.backToDashboard", {
              defaultValue: "חזרה ללוח הבקרה",
            })}
          </a>
        </div>
      )}

      {!loading && !error && !notActionable && reagents.length === 0 && !result && (
        <div className="text-center py-8 text-muted-foreground">
          {t("pullImport.empty", {
            defaultValue: "אין פריטים זמינים לייבוא מהצוות הזה",
          })}
        </div>
      )}

      {!loading && reagents.length > 0 && (
        <>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-center w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label={t("pullImport.selectAll", {
                        defaultValue: "בחר/י הכל",
                      })}
                    />
                  </th>
                  <th className="px-3 py-2 text-start font-medium">
                    {t("pullImport.columns.name", { defaultValue: "שם" })}
                  </th>
                  <th className="px-3 py-2 text-start font-medium">
                    {t("pullImport.columns.supplier", {
                      defaultValue: "ספק",
                    })}
                  </th>
                  <th className="px-3 py-2 text-start font-medium">
                    {t("pullImport.columns.lot", { defaultValue: "מספר אצווה" })}
                  </th>
                  <th className="px-3 py-2 text-start font-medium">
                    {t("pullImport.columns.expiry", {
                      defaultValue: "תוקף",
                    })}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    {t("pullImport.columns.quantity", {
                      defaultValue: "כמות",
                    })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {reagents.map((r) => {
                  const isDup = dupSet.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`border-b last:border-0 hover:bg-muted/30 ${
                        isDup ? "bg-yellow-50/40" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggle(r.id)}
                          aria-label={`select-${r.id}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span>{r.name}</span>
                        {isDup && (
                          <span
                            className="ms-2 inline-block rounded-full bg-yellow-200 text-yellow-900 px-2 py-0.5 text-xs"
                            title={t("pullImport.alreadyExistsTitle", {
                              defaultValue:
                                "פריט עם אותו מספר אצווה כבר קיים אצלך",
                            })}
                          >
                            {t("pullImport.alreadyExists", {
                              defaultValue: "כבר קיים",
                            })}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{r.supplier_name ?? "—"}</td>
                      <td className="px-3 py-2">{r.lot_number ?? "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDate(r.expiry_date)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.quantity ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {t("pullImport.staged", {
                defaultValue: "{{count}} פריטים מסומנים",
                count: selected.size,
              })}
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={selected.size === 0 || submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
            >
              {submitting
                ? t("actions.processing", { defaultValue: "מעבד..." })
                : t("pullImport.importButton", {
                    defaultValue: "ייבא נבחרים ({{count}})",
                    count: selected.size,
                  })}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
