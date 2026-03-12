import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: "en",
      changeLanguage: vi.fn(),
    },
  }),
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));
const mockUseUnreadMessageCount = vi.fn();
vi.mock("@/hooks/useUnreadMessageCount", () => ({
  useUnreadMessageCount: () => mockUseUnreadMessageCount(),
}));

vi.mock("@/pages/Dashboard", () => ({
  Dashboard: () => <div data-testid="dashboard-page">Dashboard</div>,
}));
vi.mock("@/pages/Archive", () => ({ Archive: () => <div>Archive</div> }));
vi.mock("@/pages/Messages", () => ({
  Messages: () => <div data-testid="messages-page">Messages</div>,
}));
vi.mock("@/pages/Settings", () => ({ Settings: () => <div>Settings</div> }));
vi.mock("@/pages/LegalPage", () => ({
  LegalPage: () => <div data-testid="legal-page">Legal</div>,
}));
vi.mock("@/lib/tauri", () => ({
  getTeams: vi.fn().mockResolvedValue({ teams: [], currentTeamId: null }),
  switchTeam: vi.fn(),
}));
vi.mock("@/components/InstallPrompt", () => ({
  InstallPrompt: () => <div />,
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUnreadMessageCount.mockReturnValue({ count: 0, refresh: vi.fn() });
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("renders loading state", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
      signOut: vi.fn(),
      setUser: vi.fn(),
      teamApproved: true,
      needsTeam: false,
      isSuspended: false,
      hasPendingJoinRequest: false,
    });

    render(<App />);
    expect(screen.getByText("auth.loading")).toBeInTheDocument();
  });

  it("renders sign in when no user", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
      signOut: vi.fn(),
      setUser: vi.fn(),
      teamApproved: true,
      needsTeam: false,
      isSuspended: false,
      hasPendingJoinRequest: false,
    });

    render(<App />);
    expect(screen.getByText("auth.signInTitle")).toBeInTheDocument();
    expect(screen.getByText("auth.continueWithGoogle")).toBeInTheDocument();
  });

  it("renders dashboard when user is logged in", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        avatar_url: null,
        team_id: 7,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
      signOut: vi.fn(),
      setUser: vi.fn(),
      teamApproved: true,
      needsTeam: false,
      isSuspended: false,
      hasPendingJoinRequest: false,
    });

    render(<App />);
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("renders pending approval when a join request is waiting", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        avatar_url: null,
        pending_join_request: {
          id: 8,
          team_id: 9,
          team_name: "Chem Team",
        },
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
      signOut: vi.fn(),
      setUser: vi.fn(),
      teamApproved: true,
      needsTeam: false,
      isSuspended: false,
      hasPendingJoinRequest: true,
    });

    render(<App />);
    expect(screen.getByText("teamSelect.pendingApproval")).toBeInTheDocument();
  });

  it("renders team selection for an authenticated user without a team", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 2,
        name: "",
        email: "newuser@example.com",
        avatar_url: null,
        team_id: null,
        pending_join_request: null,
        needsTeam: true,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
      signOut: vi.fn(),
      setUser: vi.fn(),
      teamApproved: true,
      needsTeam: true,
      isSuspended: false,
      hasPendingJoinRequest: false,
    });

    render(<App />);
    expect(screen.getByText("teamSelect.title")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
  });

  it("falls back to email when the user profile name is blank", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 3,
        name: "",
        email: "blankname@example.com",
        avatar_url: null,
        team_id: 7,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
      signOut: vi.fn(),
      setUser: vi.fn(),
      teamApproved: true,
      needsTeam: false,
      isSuspended: false,
      hasPendingJoinRequest: false,
    });

    render(<App />);
    expect(screen.getByText("blankname@example.com")).toBeInTheDocument();
    expect(screen.queryByText("?")).not.toBeInTheDocument();
  });
});
