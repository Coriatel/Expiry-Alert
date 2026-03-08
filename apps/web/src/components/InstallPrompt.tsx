import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

export function InstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = localStorage.getItem('expiry-alert.installDismissed');
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 86400000) {
      setDismissed(true);
      return;
    }

    // Show hint for mobile browsers (iOS or Android)
    if (isIOS() || isAndroid()) {
      setShowHint(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowHint(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowHint(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowHint(false);
    localStorage.setItem('expiry-alert.installDismissed', String(Date.now()));
  };

  if (dismissed || isStandalone()) return null;
  if (!showHint && !deferredPrompt) return null;

  const hintText = isIOS()
    ? t('install.iosInstructions')
    : deferredPrompt
    ? t('install.description')
    : t('install.androidInstructions');

  return (
    <div className="fixed bottom-20 md:bottom-4 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-md z-40 animate-in slide-in-from-bottom-4">
      <div className="bg-card border-2 border-primary/20 rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <Smartphone className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{t('install.title')}</p>
            <p className="text-xs text-muted-foreground mt-1">{hintText}</p>
            {deferredPrompt && (
              <Button size="sm" onClick={handleInstall} className="mt-2">
                <Download className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
                {t('install.installButton')}
              </Button>
            )}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
