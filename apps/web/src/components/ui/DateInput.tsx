import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

// Callers only ever read target.value (an ISO yyyy-mm-dd date, or "" while empty or incomplete).
export type DateInputChange = { target: { value: string } };

interface DateInputProps {
  id?: string;
  value?: string;
  onChange: (event: DateInputChange) => void;
  placeholderText: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}

// Digits only, dots added as the user types, so the numeric keyboard is enough.
export function formatDigits(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

export function displayToIso(text: string): string {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  if (!m) return '';
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * A typed date (numeric keyboard, dd.mm.yyyy) plus a calendar button.
 * Android's own date field neither opened the keyboard nor reliably opened its picker.
 */
export function DateInput({ id, value = '', onChange, placeholderText, required, disabled, className }: DateInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(() => isoToDisplay(value));
  const pickerRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);

  // Follow outside changes (a scan, a form reset) without undoing a half-typed date.
  useEffect(() => {
    setText((current) => (displayToIso(current) === value ? current : isoToDisplay(value)));
  }, [value]);

  const complete = text.length === 10;
  const invalid = complete && !displayToIso(text);

  useEffect(() => {
    textRef.current?.setCustomValidity(invalid ? t('form.invalidDate') : '');
  }, [invalid, t]);

  const handleType = (raw: string) => {
    const next = formatDigits(raw);
    setText(next);
    const iso = displayToIso(next);
    if (iso !== value) onChange({ target: { value: iso } });
  };

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      picker.focus();
      picker.click();
    }
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={textRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        maxLength={10}
        pattern="\d{2}\.\d{2}\.\d{4}"
        title="dd.mm.yyyy"
        placeholder={placeholderText}
        value={text}
        required={required}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => handleType(e.target.value)}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          // Physical sides: the field is dir=ltr but the calendar button follows the page direction.
          'pl-3 pr-11 rtl:pl-11 rtl:pr-3 rtl:text-right',
          invalid && 'border-destructive',
        )}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-label={t('form.openCalendar')}
        className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <CalendarDays className="h-5 w-5" />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(e) => {
          setText(isoToDisplay(e.target.value));
          onChange({ target: { value: e.target.value } });
        }}
        className="pointer-events-none absolute bottom-0 end-0 h-px w-px opacity-0"
      />
    </div>
  );
}
