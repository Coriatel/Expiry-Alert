import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  ScrollText,
  PackageCheck,
  MessageSquare,
  Settings,
  ChevronDown,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import type { TeamSummary } from "@/lib/tauri";

export type SidebarPage =
  | "dashboard"
  | "batch-history"
  | "duplication-history"
  | "messages"
  | "settings";

interface SidebarProps {
  currentPage: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
  teams: TeamSummary[];
  currentTeamId: number | null;
  currentTeamName: string;
  onSwitchTeam: (teamId: number) => void;
  unreadMessageCount: number;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const NAV_ITEMS: {
  page: SidebarPage;
  icon: typeof LayoutDashboard;
  labelKey: string;
}[] = [
  { page: "dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { page: "batch-history", icon: ScrollText, labelKey: "nav.batchHistory" },
  {
    page: "duplication-history",
    icon: PackageCheck,
    labelKey: "nav.duplicationHistory",
  },
  { page: "messages", icon: MessageSquare, labelKey: "nav.messages" },
  { page: "settings", icon: Settings, labelKey: "nav.settings" },
];

function TeamInitial({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase() || "T";
  return (
    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
      {initial}
    </div>
  );
}

export function Sidebar({
  currentPage,
  onNavigate,
  teams,
  currentTeamId,
  currentTeamName,
  onSwitchTeam,
  unreadMessageCount,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(true);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);

  const renderNavItems = (isExpanded: boolean) =>
    NAV_ITEMS.map(({ page, icon: Icon, labelKey }) => {
      const isActive = currentPage === page;
      const isMessages = page === "messages";

      return (
        <button
          key={page}
          onClick={() => {
            onNavigate(page);
            setTeamDropdownOpen(false);
          }}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full ${
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          } ${isExpanded ? "" : "justify-center"}`}
          title={!isExpanded ? t(labelKey) : undefined}
        >
          <div className="relative shrink-0">
            <Icon className="h-5 w-5" />
            {isMessages && unreadMessageCount > 0 && !isExpanded && (
              <span className="absolute -top-1.5 -end-1.5 h-2.5 w-2.5 rounded-full bg-destructive" />
            )}
          </div>
          {isExpanded && (
            <>
              <span className="truncate">{t(labelKey)}</span>
              {isMessages && unreadMessageCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-semibold text-destructive-foreground ms-auto">
                  {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                </span>
              )}
            </>
          )}
        </button>
      );
    });

  const renderTeamSelector = (isExpanded: boolean) => {
    if (!isExpanded) {
      return (
        <button
          onClick={() => {
            setCollapsed(false);
            setTeamDropdownOpen(true);
          }}
          className="flex items-center justify-center w-full px-3 py-2"
          title={currentTeamName || t("settings.currentTeam")}
        >
          <TeamInitial name={currentTeamName} />
        </button>
      );
    }

    return (
      <div className="relative px-3 py-2">
        <button
          onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
          className="flex items-center gap-2 w-full rounded-lg px-2 py-2 hover:bg-muted transition-colors"
        >
          <TeamInitial name={currentTeamName} />
          <span className="text-sm font-medium truncate flex-1 text-start">
            {currentTeamName}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${teamDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        {teamDropdownOpen && teams.length > 1 && (
          <div className="absolute start-3 end-3 top-full mt-1 bg-popover border rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => {
                  if (team.id !== currentTeamId) {
                    onSwitchTeam(team.id);
                  }
                  setTeamDropdownOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-start transition-colors ${
                  team.id === currentTeamId
                    ? "bg-muted font-medium"
                    : "hover:bg-muted"
                }`}
              >
                <TeamInitial name={team.name} />
                <span className="truncate">{team.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Desktop sidebar
  const desktopSidebar = (
    <aside
      className={`hidden md:flex flex-col border-e bg-card h-screen sticky top-0 z-30 transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Team selector */}
      <div className="border-b">{renderTeamSelector(!collapsed)}</div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto">
        {renderNavItems(!collapsed)}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <button
          onClick={() => {
            setCollapsed(!collapsed);
            setTeamDropdownOpen(false);
          }}
          className="flex items-center justify-center w-full rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <PanelRightClose className="h-5 w-5 rtl:rotate-180" />
          ) : (
            <PanelLeftClose className="h-5 w-5 rtl:rotate-180" />
          )}
        </button>
      </div>
    </aside>
  );

  // Mobile drawer
  const mobileDrawer = mobileOpen ? (
    <div className="md:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onMobileClose}
      />

      {/* Drawer panel - slides from end (right in RTL, left in LTR) */}
      <aside className="absolute top-0 bottom-0 end-0 w-72 bg-card shadow-xl flex flex-col animate-in slide-in-from-right rtl:slide-in-from-left duration-200">
        {/* Team selector */}
        <div className="border-b">{renderTeamSelector(true)}</div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto">
          {renderNavItems(true)}
        </nav>
      </aside>
    </div>
  ) : null;

  return (
    <>
      {desktopSidebar}
      {mobileDrawer}
    </>
  );
}
