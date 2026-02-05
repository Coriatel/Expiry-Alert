import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type LegalPageKind = 'privacy' | 'terms';

type LegalPageProps = {
  kind: LegalPageKind;
  language: string;
  onToggleLanguage: () => void;
};

export function LegalPage({ kind, language, onToggleLanguage }: LegalPageProps) {
  const { t } = useTranslation();
  const isPrivacy = kind === 'privacy';

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <a href="/" className="text-sm text-primary underline-offset-2 hover:underline">
            {t('legal.backToApp')}
          </a>
          <Button variant="outline" size="sm" onClick={onToggleLanguage}>
            <Globe className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {language === 'he' ? 'English' : 'עברית'}
          </Button>
        </div>

        <h1 className="mb-2 text-2xl font-bold">
          {isPrivacy ? t('legal.privacyTitle') : t('legal.termsTitle')}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {t('legal.effectiveDateLabel')}: {t('legal.effectiveDateValue')}
        </p>

        {isPrivacy ? (
          <div className="space-y-5 text-sm leading-6 text-foreground">
            <p>{t('legal.privacyIntro')}</p>

            <section>
              <h2 className="font-semibold">{t('legal.privacyDataCollectedTitle')}</h2>
              <p>{t('legal.privacyDataCollectedBody')}</p>
            </section>

            <section>
              <h2 className="font-semibold">{t('legal.privacyCalendarTitle')}</h2>
              <p>{t('legal.privacyCalendarBody')}</p>
            </section>

            <section>
              <h2 className="font-semibold">{t('legal.privacyStorageTitle')}</h2>
              <p>{t('legal.privacyStorageBody')}</p>
            </section>

            <section>
              <h2 className="font-semibold">{t('legal.privacySharingTitle')}</h2>
              <p>{t('legal.privacySharingBody')}</p>
            </section>

            <section>
              <h2 className="font-semibold">{t('legal.privacyUserControlsTitle')}</h2>
              <p>{t('legal.privacyUserControlsBody')}</p>
            </section>
          </div>
        ) : (
          <div className="space-y-5 text-sm leading-6 text-foreground">
            <p>{t('legal.termsIntro')}</p>

            <section>
              <h2 className="font-semibold">{t('legal.termsUseTitle')}</h2>
              <p>{t('legal.termsUseBody')}</p>
            </section>

            <section>
              <h2 className="font-semibold">{t('legal.termsAccountsTitle')}</h2>
              <p>{t('legal.termsAccountsBody')}</p>
            </section>

            <section>
              <h2 className="font-semibold">{t('legal.termsAvailabilityTitle')}</h2>
              <p>{t('legal.termsAvailabilityBody')}</p>
            </section>

            <section>
              <h2 className="font-semibold">{t('legal.termsLiabilityTitle')}</h2>
              <p>{t('legal.termsLiabilityBody')}</p>
            </section>
          </div>
        )}

        <div className="mt-8 border-t pt-4 text-sm text-muted-foreground">
          {t('legal.contactLabel')}{' '}
          <a href={`mailto:${t('legal.contactEmail')}`} className="text-primary underline-offset-2 hover:underline">
            {t('legal.contactEmail')}
          </a>
        </div>
      </div>
    </div>
  );
}
