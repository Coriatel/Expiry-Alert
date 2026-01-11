import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <div className="flex flex-col items-center text-center">
        {variant === 'danger' && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        )}
        {variant === 'warning' && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
        )}

        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>

        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText || t('actions.cancel')}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'default'}
            className="flex-1"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? t('actions.processing') : confirmText || t('actions.confirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
