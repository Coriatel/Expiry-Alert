import { useTranslation } from "react-i18next";

export function NewInStockDot() {
  const { t } = useTranslation();

  return (
    <span className="group relative inline-flex items-center">
      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        {t("indicator.newInStock")}
      </span>
    </span>
  );
}
