import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Archive as ArchiveIcon,
  LayoutDashboard,
  Globe,
  LogOut,
  MessageSquare,
  Settings as SettingsIcon,
  Menu,
  X,
} from "lucide-react";
import { Dashboard } from "@/pages/Dashboard";
import { Archive } from "@/pages/Archive";
import { Messages } from "@/pages/Messages";
import { Settings } from "@/pages/Settings";
import { LegalPage } from "@/pages/LegalPage";
import { Button } from "@/components/ui/Button";
import { ToastProvider } from "@/components/ui/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";
import { TeamSelection } from "@/components/TeamSelection";
import { PendingApproval } from "@/components/PendingApproval";
import { getTeams, switchTeam } from "@/lib/tauri";
import type { AuthUser } from "@/lib/auth";

import { InstallPrompt } from "@/components/InstallPrompt";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";

type Page = "dashboard" | "archive" | "messages" | "settings";
type PublicPage = "privacy" | "terms" | null;
type AuthScreen = "login" | "register" | "team-select" | "pending-approval";

function resolvePublicPage(pathname: string): PublicPage {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/privacy") return "privacy";
  if (normalized === "/terms") return "terms";
  return null;
}

function App() {
  const { t, i18n } = useTranslation();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    user,
    loading,
    error,
    signOut,
    refresh,
    setUser,
    teamApproved,
    needsTeam,
    isSuspended,
    hasPendingJoinRequest,
  } = useAuth();
  const publicPage = resolvePublicPage(window.location.pathname);
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const userLabel = user?.name?.trim() || user?.email?.trim() || "User";
  const userInitial = userLabel.charAt(0).toUpperCase() || "U";
  const { count: unreadMessageCount } = useUnreadMessageCount(
    Boolean(user?.id),
    user?.team_id ?? null,
  );

  // Set RTL direction
  useEffect(() => {
    document.documentElement.dir = i18n.language === "he" ? "rtl" : "ltr";
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const toggleLanguage = () => {
    const newLang = i18n.language === "he" ? "en" : "he";
    i18n.changeLanguage(newLang);
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!user) return;

    const preferredRaw = window.localStorage.getItem(
      "expiry-alert.preferredTeamId",
    );
    if (!preferredRaw) return;

    const preferredTeamId = Number(preferredRaw);
    if (!Number.isFinite(preferredTeamId)) {
      window.localStorage.removeItem("expiry-alert.preferredTeamId");
      return;
    }
    if (user.team_id === preferredTeamId) return;

    let cancelled = false;
    (async () => {
      try {
        const teamData = await getTeams();
        const hasAccess = teamData.teams.some(
          (team) => team.id === preferredTeamId,
        );
        if (!hasAccess) {
          window.localStorage.removeItem("expiry-alert.preferredTeamId");
          return;
        }
        await switchTeam(preferredTeamId);
        if (!cancelled) {
          await refresh();
        }
      } catch (err) {
        console.error("Failed to restore preferred team", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, refresh]);

  useEffect(() => {
    if (!user) {
      setAuthScreen("login");
      return;
    }

    if (hasPendingJoinRequest) {
      setAuthScreen("pending-approval");
      return;
    }

    if (needsTeam) {
      setAuthScreen("team-select");
      return;
    }

    setAuthScreen("login");
  }, [user, hasPendingJoinRequest, needsTeam]);

  if (publicPage) {
    return (
      <LegalPage
        kind={publicPage}
        language={i18n.language}
        onToggleLanguage={toggleLanguage}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">{t("auth.loading")}</div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        {authScreen === "login" && (
          <LoginForm
            error={error}
            onSuccess={(u) => {
              setUser(u);
            }}
            onSwitchToRegister={() => setAuthScreen("register")}
          />
        )}
        {authScreen === "register" && (
          <RegisterForm
            onSuccess={(u) => {
              setUser(u);
            }}
            onSwitchToLogin={() => setAuthScreen("login")}
          />
        )}
      </div>
    );
  }

  // Authenticated but needs team
  if (hasPendingJoinRequest || (!teamApproved && authScreen === "pending-approval")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <PendingApproval
          pendingRequest={user.pending_join_request ?? null}
          onApproved={(u) => {
            if (u.team_id != null) {
              window.localStorage.setItem(
                "expiry-alert.preferredTeamId",
                String(u.team_id),
              );
            }
            setUser(u);
            setAuthScreen("login");
          }}
          onPendingCleared={(nextUser: AuthUser | null) => {
            if (!nextUser) {
              setUser(null);
              setAuthScreen("login");
              return;
            }

            setUser(nextUser);
            setAuthScreen(nextUser.needsTeam ? "team-select" : "login");
          }}
          onSignOut={async () => {
            await signOut();
            setAuthScreen("login");
          }}
        />
      </div>
    );
  }

  if (needsTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <TeamSelection
          onTeamSelected={(result) => {
            if (result.pendingRequest || !result.approved) {
              setAuthScreen("pending-approval");
              void refresh();
              return;
            }

            window.localStorage.setItem(
              "expiry-alert.preferredTeamId",
              String(result.teamId),
            );
            setAuthScreen("login");
            void refresh();
          }}
          onSignOut={async () => {
            await signOut();
            setAuthScreen("login");
          }}
        />
      </div>
    );
  }

  if (!teamApproved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <PendingApproval
          pendingRequest={null}
          onApproved={(u) => {
            if (u.team_id != null) {
              window.localStorage.setItem(
                "expiry-alert.preferredTeamId",
                String(u.team_id),
              );
            }
            setUser(u);
            setAuthScreen("login");
          }}
          onPendingCleared={(nextUser: AuthUser | null) => {
            setUser(nextUser);
            setAuthScreen(nextUser?.needsTeam ? "team-select" : "login");
          }}
          onSignOut={async () => {
            await signOut();
            setAuthScreen("login");
          }}
        />
      </div>
    );
  }

  // Suspended
  if (isSuspended) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-sm text-center">
          <h1 className="text-xl font-bold mb-2">
            {t("teamManagement.suspended")}
          </h1>
          <p className="text-muted-foreground mb-4">
            {t("auth.accountSuspended")}
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              await signOut();
              setAuthScreen("login");
            }}
          >
            {t("auth.signOut")}
          </Button>
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
                <div className="flex items-center gap-2">
                  <img
                    src="/logo-icon-v2.png"
                    alt="Expiry Alert"
                    className="h-8 w-8 object-contain"
                  />
                  <h1 className="text-xl md:text-2xl font-bold truncate">
                    {t("app.title")}
                  </h1>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-4">
                  <nav className="flex gap-2">
                    <Button
                      variant={
                        currentPage === "dashboard" ? "default" : "ghost"
                      }
                      onClick={() => navigateTo("dashboard")}
                      className="flex items-center gap-2"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      {t("nav.dashboard")}
                    </Button>
                    <Button
                      variant={currentPage === "archive" ? "default" : "ghost"}
                      onClick={() => navigateTo("archive")}
                      className="flex items-center gap-2"
                    >
                      <ArchiveIcon className="h-4 w-4" />
                      {t("nav.archive")}
                    </Button>
                    <Button
                      variant={
                        currentPage === "messages" ? "default" : "ghost"
                      }
                      onClick={() => navigateTo("messages")}
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {t("nav.messages")}
                      {unreadMessageCount > 0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-semibold text-destructive-foreground">
                          {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                        </span>
                      ) : null}
                    </Button>
                    <Button
                      variant={currentPage === "settings" ? "default" : "ghost"}
                      onClick={() => navigateTo("settings")}
                      className="flex items-center gap-2"
                    >
                      <SettingsIcon className="h-4 w-4" />
                      {t("nav.settings")}
                    </Button>
                  </nav>

                  {/* Language Toggle & User */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleLanguage}
                    >
                      <Globe className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                      {i18n.language === "he" ? "English" : "עברית"}
                    </Button>
                    <div className="flex items-center gap-2 border rounded-full px-2 py-1">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={userLabel}
                          className="h-7 w-7 rounded-full"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {userInitial}
                        </div>
                      )}
                      <span className="text-sm font-medium">{userLabel}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await signOut();
                          setAuthScreen("login");
                        }}
                      >
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  >
                    {mobileMenuOpen ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Menu className="h-5 w-5" />
                    )}
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
                        alt={userLabel}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-medium">
                        {userInitial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{userLabel}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await signOut();
                        setAuthScreen("login");
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="min-h-[calc(100vh-8rem)]">
            {currentPage === "dashboard" ? (
              <Dashboard />
            ) : currentPage === "archive" ? (
              <Archive />
            ) : currentPage === "messages" ? (
              <Messages
                currentUserId={user.id}
                isSystemAdmin={user.is_system_admin === true}
              />
            ) : (
              <Settings />
            )}
          </main>

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t z-50 safe-area-bottom">
            <div className="flex justify-around items-center h-16">
              <button
                onClick={() => navigateTo("dashboard")}
                className={`flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors ${
                  currentPage === "dashboard"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-xs mt-1">{t("nav.dashboard")}</span>
              </button>
              <button
                onClick={() => navigateTo("archive")}
                className={`flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors ${
                  currentPage === "archive"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <ArchiveIcon className="h-5 w-5" />
                <span className="text-xs mt-1">{t("nav.archive")}</span>
              </button>
              <button
                onClick={() => navigateTo("messages")}
                className={`flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors ${
                  currentPage === "messages"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <MessageSquare className="h-5 w-5" />
                  {unreadMessageCount > 0 ? (
                    <span className="absolute -top-2 -end-3 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs mt-1">{t("nav.messages")}</span>
              </button>
              <button
                onClick={() => navigateTo("settings")}
                className={`flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors ${
                  currentPage === "settings"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <SettingsIcon className="h-5 w-5" />
                <span className="text-xs mt-1">{t("nav.settings")}</span>
              </button>
            </div>
          </nav>
          <InstallPrompt />
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
