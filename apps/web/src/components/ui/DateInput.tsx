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
          className={cn('date-input', className)}
          {...props}
        />
        {!hasValue && (
          <span className="pointer-events-none absolute inset-y-0 flex items-center text-xs text-muted-foreground ltr:left-3 rtl:right-3">
            {placeholderText}
          </span>
        )}
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';

export { DateInput };
