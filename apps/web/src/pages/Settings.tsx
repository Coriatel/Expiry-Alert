import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { subscribeToPush, unsubscribeFromPush, checkPushSubscription } from '@/services/push';
import { useToast } from '@/components/ui/Toast';

export function Settings() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [supportError, setSupportError] = useState('');

  useEffect(() => {
    checkPushSubscription().then(sub => {
        setIsSubscribed(!!sub);
    }).catch(() => {
        setSupportError('Push notifications not supported on this device');
    });
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    try {
        if (isSubscribed) {
            await unsubscribeFromPush();
            setIsSubscribed(false);
            showToast(t('settings.notificationsDisabled'), 'info');
        } else {
            await subscribeToPush();
            setIsSubscribed(true);
            showToast(t('settings.notificationsEnabled'), 'success');
        }
    } catch (error: any) {
        console.error(error);
        showToast(error.message || t('errors.unexpectedError'), 'error');
    } finally {
        setLoading(false);
    }
  };

  const handleCalendarExport = async () => {
    setCalendarLoading(true);
    try {
      // Trigger download by navigating to the API endpoint
      const response = await fetch('/api/calendar/export.ics', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export calendar');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reagent-expiry.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast(t('settings.calendarExported'), 'success');
    } catch (error: any) {
      console.error('Calendar export error:', error);
      showToast(error.message || t('errors.unexpectedError'), 'error');
    } finally {
      setCalendarLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('nav.settings')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {/* Push Notifications */}
      <div className="bg-card rounded-xl border p-6">
        <h2 className="text-xl font-semibold mb-4">{t('settings.notifications')}</h2>
        <div className="flex items-center justify-between">
            <div>
                <p className="font-medium">{t('settings.pushNotifications')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.pushDescription')}</p>
            </div>
            <Button
                variant={isSubscribed ? "outline" : "default"}
                onClick={handleToggle}
                disabled={loading || !!supportError}
            >
                {loading ? t('actions.processing') : isSubscribed ? (
                    <>
                        <BellOff className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                        {t('settings.disable')}
                    </>
                ) : (
                    <>
                        <Bell className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                        {t('settings.enable')}
                    </>
                )}
            </Button>
        </div>
        {supportError && <p className="text-destructive text-sm mt-2">{supportError}</p>}
      </div>

      {/* Calendar Export */}
      <div className="bg-card rounded-xl border p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('settings.calendar')}
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{t('settings.calendarExport')}</p>
            <p className="text-sm text-muted-foreground">{t('settings.calendarDescription')}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleCalendarExport}
            disabled={calendarLoading}
          >
            {calendarLoading ? (
              t('actions.processing')
            ) : (
              <>
                <Download className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {t('settings.exportAll')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
