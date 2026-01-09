import { useTranslation } from 'react-i18next';
import { AlertCircle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Reagent } from '@/types';
import { getDaysUntilExpiry } from '@/lib/utils';

interface NotificationBannerProps {
  reagents: Reagent[];
  onSnooze: (reagentId: number, days: number) => void;
  onDismiss: (reagentId: number) => void;
}

export function NotificationBanner({ reagents, onSnooze, onDismiss }: NotificationBannerProps) {
  const { t } = useTranslation();

  if (reagents.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="bg-orange-100 border-2 border-orange-400 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-bold text-orange-900 mb-2">{t('notifications.title')}</h3>
            <p className="text-sm text-orange-800 mb-3">
              {t('notifications.message', { count: reagents.length })}
            </p>

            {/* List of expiring reagents */}
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {reagents.map((reagent) => {
                const days = getDaysUntilExpiry(reagent.expiry_date);
                return (
                  <div
                    key={reagent.id}
                    className="flex items-center justify-between bg-white/50 rounded p-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{reagent.name}</span>
                      <span className="text-muted-foreground text-xs mx-2">
                        {days < 0
                          ? t('status.expired')
                          : days === 0
                          ? t('status.expiresToday')
                          : days === 1
                          ? t('status.expiresInOneDay')
                          : t('status.expiresIn', { days })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => reagents.forEach((r) => onSnooze(r.id, 1))}
                className="bg-white"
              >
                <Clock className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t('notifications.remindTomorrow')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reagents.forEach((r) => onSnooze(r.id, 3))}
                className="bg-white"
              >
                <Clock className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t('notifications.remindIn3Days')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reagents.forEach((r) => onDismiss(r.id))}
                className="bg-white"
              >
                <X className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t('notifications.dismiss')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
