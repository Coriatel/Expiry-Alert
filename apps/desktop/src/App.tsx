import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive as ArchiveIcon, LayoutDashboard, Globe } from 'lucide-react';
import { Dashboard } from '@/pages/Dashboard';
import { Archive } from '@/pages/Archive';
import { Button } from '@/components/ui/Button';
import { ToastProvider } from '@/components/ui/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';

type Page = 'dashboard' | 'archive';

function App() {
  const { t, i18n } = useTranslation();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  // Set RTL direction
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
  };

  return (
    <ErrorBoundary>
    <ToastProvider>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{t('app.title')}</h1>

            <div className="flex items-center gap-4">
              {/* Navigation */}
              <nav className="flex gap-2">
                <Button
                  variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
                  onClick={() => setCurrentPage('dashboard')}
                  className="flex items-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t('nav.dashboard')}
                </Button>
                <Button
                  variant={currentPage === 'archive' ? 'default' : 'ghost'}
                  onClick={() => setCurrentPage('archive')}
                  className="flex items-center gap-2"
                >
                  <ArchiveIcon className="h-4 w-4" />
                  {t('nav.archive')}
                </Button>
              </nav>

              {/* Language Toggle */}
              <Button variant="outline" size="sm" onClick={toggleLanguage}>
                <Globe className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {i18n.language === 'he' ? 'English' : 'עברית'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{currentPage === 'dashboard' ? <Dashboard /> : <Archive />}</main>
    </div>
    </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
