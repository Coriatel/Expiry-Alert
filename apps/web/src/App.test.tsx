import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

// Mock hook
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock child pages to simplify testing App logic
vi.mock('@/pages/Dashboard', () => ({ Dashboard: () => <div data-testid="dashboard-page">Dashboard</div> }));
vi.mock('@/pages/Archive', () => ({ Archive: () => <div>Archive</div> }));
vi.mock('@/pages/Settings', () => ({ Settings: () => <div>Settings</div> }));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      error: null,
      signOut: vi.fn(),
    });

    render(<App />);
    expect(screen.getByText('auth.loading')).toBeInTheDocument();
  });

  it('renders sign in when no user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      signOut: vi.fn(),
    });

    render(<App />);
    expect(screen.getByText('auth.signInTitle')).toBeInTheDocument();
    expect(screen.getByText('auth.continueWithGoogle')).toBeInTheDocument();
  });

  it('renders dashboard when user is logged in', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@example.com', avatar_url: null },
      loading: false,
      error: null,
      signOut: vi.fn(),
    });

    render(<App />);
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});