import { useTranslation } from "react-i18next";

interface PrintHeaderProps {
  teamName: string;
  userName: string;
  filterLabel?: string;
}

export function PrintHeader({ teamName, userName, filterLabel }: PrintHeaderProps) {
  const { t } = useTranslation();
  const now = new Date().toLocaleString("he-IL");

  return (
    <div className="hidden print:block border-b pb-3 mb-4">
      <div className="flex items-center gap-3">
        <img src="/logo-icon-v2.png" alt="" className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">{t("app.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {teamName} &bull; {t("dashboard.printedAt", { at: now })} &bull;{" "}
            {userName}
          </p>
          {filterLabel && (
            <p className="text-xs text-muted-foreground">{filterLabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
