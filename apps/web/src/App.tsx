import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive as ArchiveIcon, LayoutDashboard, Globe, LogOut, Settings as SettingsIcon, Menu, X } from 'lucide-react';
import { Dashboard } from '@/pages/Dashboard';
import { Archive } from '@/pages/Archive';
import { Settings } from '@/pages/Settings';
import { Button } from '@/components/ui/Button';
import { ToastProvider } from '@/components/ui/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import { googleLoginUrl } from '@/lib/auth';

type Page = 'dashboard' | 'archive' | 'settings';

function App() {
  const { t, i18n } = useTranslation();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading, error, signOut } = useAuth();

  // Set RTL direction
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">{t('auth.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-2">{t('auth.signInTitle')}</h1>
          <p className="text-muted-foreground mb-6">{t('auth.signInSubtitle')}</p>
          {error ? (
            <div className="mb-4 text-sm text-destructive">{error}</div>
          ) : null}
          <a
            href={googleLoginUrl}
            className="w-full inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground h-11 px-4 font-medium"
          >
            {t('auth.continueWithGoogle')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <ToastProvider>
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold truncate">{t('app.title')}</h1>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <nav className="flex gap-2">
                <Button
                  variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
                  onClick={() => navigateTo('dashboard')}
                  className="flex items-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t('nav.dashboard')}
                </Button>
                <Button
                  variant={currentPage === 'archive' ? 'default' : 'ghost'}
                  onClick={() => navigateTo('archive')}
                  className="flex items-center gap-2"
                >
                  <ArchiveIcon className="h-4 w-4" />
                  {t('nav.archive')}
                </Button>
                <Button
                  variant={currentPage === 'settings' ? 'default' : 'ghost'}
                  onClick={() => navigateTo('settings')}
                  className="flex items-center gap-2"
                >
                  <SettingsIcon className="h-4 w-4" />
                  {t('nav.settings')}
                </Button>
              </nav>

              {/* Language Toggle & User */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleLanguage}>
                  <Globe className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {i18n.language === 'he' ? 'English' : 'עברית'}
                </Button>
                <div className="flex items-center gap-2 border rounded-full px-2 py-1">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="h-7 w-7 rounded-full"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-muted" />
                  )}
                  <span className="text-sm font-medium">{user.name}</span>
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleLanguage}>
                <Globe className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t mt-3 pt-3 space-y-2 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3 pb-3 border-b">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-8rem)]">
        {currentPage === 'dashboard' ? (
          <Dashboard />
        ) : currentPage === 'archive' ? (
          <Archive />
        ) : (
          <Settings />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => navigateTo('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors ${
              currentPage === 'dashboard' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs mt-1">{t('nav.dashboard')}</span>
          </button>
          <button
            onClick={() => navigateTo('archive')}
            className={`flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors ${
              currentPage === 'archive' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <ArchiveIcon className="h-5 w-5" />
            <span className="text-xs mt-1">{t('nav.archive')}</span>
          </button>
          <button
            onClick={() => navigateTo('settings')}
            className={`flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors ${
              currentPage === 'settings' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span className="text-xs mt-1">{t('nav.settings')}</span>
          </button>
        </div>
      </nav>
    </div>
    </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
