import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Globe,
  LogOut,
  Menu,
} from "lucide-react";
import { Dashboard } from "@/pages/Dashboard";
import { BatchHistory } from "@/pages/BatchHistory";
import { Messages } from "@/pages/Messages";
import { Settings } from "@/pages/Settings";
import { LegalPage } from "@/pages/LegalPage";
import { Button } from "@/components/ui/Button";
import { ToastProvider } from "@/components/ui/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Sidebar } from "@/components/Sidebar";
import type { SidebarPage } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";
import { TeamSelection } from "@/components/TeamSelection";
import { PendingApproval } from "@/components/PendingApproval";
import { getTeams, switchTeam } from "@/lib/tauri";
import type { TeamSummary } from "@/lib/tauri";
import type { AuthUser } from "@/lib/auth";

import { InstallPrompt } from "@/components/InstallPrompt";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";

type Page = "dashboard" | "batch-history" | "duplication-history" | "messages" | "settings";
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
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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

  const currentTeamName = teams.find((t) => t.id === user?.team_id)?.name ?? "";

  const toggleLanguage = () => {
    const newLang = i18n.language === "he" ? "en" : "he";
    i18n.changeLanguage(newLang);
  };

  // Load teams when user is authenticated
  useEffect(() => {
    if (!user?.team_id) return;
    getTeams().then((data) => setTeams(data.teams)).catch(console.error);
  }, [user?.team_id]);

  const handleSwitchTeam = async (teamId: number) => {
    await switchTeam(teamId);
    window.localStorage.setItem("expiry-alert.preferredTeamId", String(teamId));
    await refresh();
    setMobileSidebarOpen(false);
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <img
          src="/logo-icon-v2.png"
          alt="Expiry Alert"
          className="h-20 w-20 object-contain logo-entrance"
        />
        <div className="text-muted-foreground splash-text">
          {t("auth.loading")}
        </div>
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
  if (
    hasPendingJoinRequest ||
    (!teamApproved && authScreen === "pending-approval")
  ) {
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
        <div className="min-h-screen bg-background flex">
          {/* Sidebar */}
          <Sidebar
            currentPage={currentPage as SidebarPage}
            onNavigate={(page) => {
              setCurrentPage(page);
              setMobileSidebarOpen(false);
            }}
            teams={teams}
            currentTeamId={user?.team_id ?? null}
            currentTeamName={currentTeamName}
            onSwitchTeam={handleSwitchTeam}
            unreadMessageCount={unreadMessageCount}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />

          {/* Main content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile header */}
            <header className="md:hidden border-b bg-card sticky top-0 z-40">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => setMobileSidebarOpen(true)}>
                    <Menu className="h-5 w-5" />
                  </button>
                  <img
                    src="/logo-icon-v2.png"
                    alt="Expiry Alert"
                    className="h-7 w-7 object-contain"
                  />
                  <span className="font-semibold text-sm truncate">
                    {currentTeamName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleLanguage}
                  >
                    <Globe className="h-5 w-5" />
                  </Button>
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
            </header>

            {/* Desktop header (minimal - user info + language) */}
            <header className="hidden md:block border-b bg-card sticky top-0 z-40">
              <div className="flex items-center justify-end px-6 py-2 gap-3">
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
            </header>

            {/* Page content */}
            <main className="flex-1">
              {currentPage === "dashboard" ? (
                <Dashboard />
              ) : currentPage === "batch-history" ? (
                <BatchHistory
                  teamName={currentTeamName}
                  userName={userLabel}
                />
              ) : currentPage === "duplication-history" ? (
                <div className="container mx-auto p-6">
                  <h1 className="text-2xl font-bold">
                    {t("duplicationHistory.title")}
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    {t("duplicationHistory.noRecords")}
                  </p>
                </div>
              ) : currentPage === "messages" ? (
                <Messages
                  currentUserId={user.id}
                  isSystemAdmin={user.is_system_admin === true}
                />
              ) : (
                <Settings />
              )}
            </main>
          </div>
        </div>
        <InstallPrompt />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
