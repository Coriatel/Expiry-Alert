import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Input, InputProps } from './Input';

interface DateInputProps extends Omit<InputProps, 'type' | 'placeholder'> {
  placeholderText: string;
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ placeholderText, value, className, ...props }, ref) => {
    const hasValue = value !== undefined && value !== null && String(value).length > 0;

    return (
      <div className="relative">
        <Input
          type="date"
          ref={ref}
          value={value}
          className={cn(
            'date-input peer',
            // An empty date field also shows the browser's own format hint (dd.mm.yyyy),
            // which would sit under our placeholder. Hide it, and its width, until the field is focused.
            !hasValue && '[&:not(:focus)::-webkit-datetime-edit]:max-w-0 [&:not(:focus)::-webkit-datetime-edit]:text-transparent',
            className,
          )}
          {...props}
        />
        {!hasValue && (
          <span className="pointer-events-none absolute inset-y-0 flex items-center text-sm text-muted-foreground ltr:left-3 rtl:right-3 peer-focus:hidden">
            {placeholderText}
          </span>
        )}
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';

export { DateInput };
