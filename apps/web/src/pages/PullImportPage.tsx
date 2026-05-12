import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSourceReagents } from "@/lib/tauri";
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

export function PullImportPage({ requestId }: PullImportPageProps) {
  const { t } = useTranslation();
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSourceReagents(requestId)
      .then((data) => {
        if (cancelled) return;
        setReagents(data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

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
            "אלו הפריטים הזמינים מהצוות שאישר את בקשת ההעברה. סמן/י את הפריטים שברצונך לייבא. כפתור 'ייבא' יתווסף בעדכון הבא.",
        })}
      </p>

      {loading && (
        <div className="text-center py-8 text-muted-foreground">
          {t("actions.processing", { defaultValue: "מעבד..." })}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-900 p-3 text-sm">
          {t("pullImport.error", { defaultValue: "שגיאה בטעינת הפריטים" })}:{" "}
          {error}
        </div>
      )}

      {!loading && !error && reagents.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t("pullImport.empty", {
            defaultValue: "אין פריטים זמינים לייבוא מהצוות הזה",
          })}
        </div>
      )}

      {!loading && !error && reagents.length > 0 && (
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
                {reagents.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        aria-label={`select-${r.id}`}
                      />
                    </td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.supplier_name ?? "—"}</td>
                    <td className="px-3 py-2">{r.lot_number ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(r.expiry_date)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.quantity ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-sm text-muted-foreground">
            {t("pullImport.staged", {
              defaultValue: "{{count}} פריטים מסומנים",
              count: selected.size,
            })}
          </div>
        </>
      )}
    </div>
  );
}
