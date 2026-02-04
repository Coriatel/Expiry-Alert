import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Calendar, CalendarPlus, Download, Link2, Unlink, Users, UserPlus, Plus, LockKeyhole, KeyRound, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { subscribeToPush, unsubscribeFromPush, checkPushSubscription } from '@/services/push';
import { useToast } from '@/components/ui/Toast';
import {
  createTeam,
  createGoogleCalendarEvents,
  disconnectGoogleCalendar,
  getActiveReagents,
  getGoogleCalendarStatus,
  getTeams,
  inviteTeamMember,
  joinTeamWithPassword,
  requestTeamPasswordReset,
  setTeamPassword,
  switchTeam,
  type TeamSummary,
  type GoogleCalendarMode,
} from '@/lib/tauri';
import { googleCalendarConnectUrl } from '@/lib/auth';
import type { Reagent } from '@/types';

function getDefaultAlertAt() {
  const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
  const local = new Date(inOneHour.getTime() - inOneHour.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function Settings() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarStatusLoading, setCalendarStatusLoading] = useState(true);
  const [reagentsLoading, setReagentsLoading] = useState(true);
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [selectedReagentIds, setSelectedReagentIds] = useState<number[]>([]);
  const [calendarMode, setCalendarMode] = useState<GoogleCalendarMode>('single');
  const [alertAt, setAlertAt] = useState(getDefaultAlertAt());
  const [createLoading, setCreateLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [teamPassword, setTeamPasswordValue] = useState('');
  const [joinTeamName, setJoinTeamName] = useState('');
  const [joinTeamPassword, setJoinTeamPassword] = useState('');
  const [forgotTeamName, setForgotTeamName] = useState('');
  const [teamBusy, setTeamBusy] = useState(false);

  useEffect(() => {
    checkPushSubscription().then(sub => {
        setIsSubscribed(!!sub);
    }).catch(() => {
        setSupportError('Push notifications not supported on this device');
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calendarResult = params.get('calendar');
    if (!calendarResult) return;

    if (calendarResult === 'connected') {
      showToast(t('settings.googleCalendarConnected'), 'success');
    } else if (calendarResult === 'failed') {
      showToast(t('settings.googleCalendarConnectFailed'), 'error');
    }

    const cleanUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }, [showToast, t]);

  const loadSettingsData = useCallback(async () => {
    setCalendarStatusLoading(true);
    setReagentsLoading(true);
    setTeamsLoading(true);
    try {
      const [status, activeReagents, teamData] = await Promise.all([
        getGoogleCalendarStatus(),
        getActiveReagents(),
        getTeams(),
      ]);
      setCalendarConnected(status.connected);
      setReagents(activeReagents);
      setSelectedReagentIds(activeReagents.map((r) => r.id));
      setTeams(teamData.teams);
      setCurrentTeamId(teamData.currentTeamId);
      if (teamData.currentTeamId) {
        const current = teamData.teams.find((team) => team.id === teamData.currentTeamId);
        if (current?.name) {
          setForgotTeamName(current.name);
        }
      }
      if (teamData.currentTeamId && !window.localStorage.getItem('expiry-alert.preferredTeamId')) {
        window.localStorage.setItem('expiry-alert.preferredTeamId', String(teamData.currentTeamId));
      }
    } catch (error) {
      console.error(error);
      showToast(t('errors.unexpectedError'), 'error');
    } finally {
      setCalendarStatusLoading(false);
      setReagentsLoading(false);
      setTeamsLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    void loadSettingsData();
  }, [loadSettingsData]);

  const handleSwitchTeam = async (nextTeamId: number) => {
    if (!Number.isFinite(nextTeamId) || nextTeamId === currentTeamId) return;

    setTeamBusy(true);
    try {
      await switchTeam(nextTeamId);
      setCurrentTeamId(nextTeamId);
      window.localStorage.setItem('expiry-alert.preferredTeamId', String(nextTeamId));
      const activeReagents = await getActiveReagents();
      setReagents(activeReagents);
      setSelectedReagentIds(activeReagents.map((r) => r.id));
      const switchedTeam = teams.find((team) => team.id === nextTeamId);
      if (switchedTeam?.name) {
        setForgotTeamName(switchedTeam.name);
      }
      showToast(t('settings.teamSwitched'), 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t('settings.teamSwitchFailed'), 'error');
    } finally {
      setTeamBusy(false);
    }
  };

  const handleCreateTeam = async () => {
    const name = newTeamName.trim();
    if (!name) return;

    setTeamBusy(true);
    try {
      const team = await createTeam(name);
      setNewTeamName('');
      if (team.id) {
        window.localStorage.setItem('expiry-alert.preferredTeamId', String(team.id));
      }
      showToast(t('settings.teamCreated'), 'success');
      await loadSettingsData();
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t('settings.teamCreateFailed'), 'error');
    } finally {
      setTeamBusy(false);
    }
  };

  const handleInviteMember = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !currentTeamId) return;

    setTeamBusy(true);
    try {
      const result = await inviteTeamMember(currentTeamId, email);
      setInviteEmail('');
      showToast(
        result.status === 'added' ? t('settings.memberAdded') : t('settings.memberInvited'),
        'success'
      );
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t('settings.memberInviteFailed'), 'error');
    } finally {
      setTeamBusy(false);
    }
  };

  const handleSetTeamPassword = async () => {
    if (!currentTeamId || teamPassword.trim().length < 6) return;

    setTeamBusy(true);
    try {
      await setTeamPassword(currentTeamId, teamPassword.trim());
      setTeamPasswordValue('');
      showToast(t('settings.teamPasswordSaved'), 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t('settings.teamPasswordSaveFailed'), 'error');
    } finally {
      setTeamBusy(false);
    }
  };

  const handleJoinTeamWithPassword = async () => {
    const name = joinTeamName.trim();
    const password = joinTeamPassword.trim();
    if (!name || password.length < 6) return;

    setTeamBusy(true);
    try {
      const result = await joinTeamWithPassword(name, password);
      window.localStorage.setItem('expiry-alert.preferredTeamId', String(result.teamId));
      setJoinTeamName('');
      setJoinTeamPassword('');
      showToast(t('settings.teamJoined', { team: result.teamName }), 'success');
      await loadSettingsData();
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t('settings.teamJoinFailed'), 'error');
    } finally {
      setTeamBusy(false);
    }
  };

  const handleForgotTeamPassword = async () => {
    const name = forgotTeamName.trim();
    if (!name) return;

    setTeamBusy(true);
    try {
      await requestTeamPasswordReset(name);
      showToast(t('settings.teamPasswordResetRequested'), 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t('settings.teamPasswordResetRequestFailed'), 'error');
    } finally {
      setTeamBusy(false);
    }
  };

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

  const toggleReagent = (id: number) => {
    setSelectedReagentIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleCreateGoogleCalendarEvents = async () => {
    if (!calendarConnected) {
      showToast(t('settings.googleCalendarNotConnected'), 'error');
      return;
    }
    if (!alertAt) {
      showToast(t('settings.selectAlertDateTime'), 'error');
      return;
    }
    if (selectedReagentIds.length === 0) {
      showToast(t('settings.selectAtLeastOneReagent'), 'error');
      return;
    }

    const alertDate = new Date(alertAt);
    if (!Number.isFinite(alertDate.getTime())) {
      showToast(t('settings.invalidAlertDateTime'), 'error');
      return;
    }

    setCreateLoading(true);
    try {
      const result = await createGoogleCalendarEvents(
        selectedReagentIds,
        alertDate.toISOString(),
        calendarMode
      );
      showToast(t('settings.googleCalendarEventsCreated', { count: result.created }), 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t('errors.unexpectedError'), 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    setCreateLoading(true);
    try {
      await disconnectGoogleCalendar();
      setCalendarConnected(false);
      showToast(t('settings.googleCalendarDisconnected'), 'info');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t('errors.unexpectedError'), 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleConnectGoogleCalendar = () => {
    window.location.href = googleCalendarConnectUrl;
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

  const currentTeam = teams.find((team) => team.id === currentTeamId);
  const canManageTeamPassword = currentTeam?.role === 'owner' || currentTeam?.role === 'admin';

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('nav.settings')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {/* Team Workspace */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('settings.teamWorkspace')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('settings.teamWorkspaceDescription')}</p>
        <p className="text-xs text-muted-foreground">{t('settings.teamAutoAssignHelp')}</p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('settings.currentTeam')}</label>
            <Select
              value={currentTeamId?.toString() ?? ''}
              disabled={teamsLoading || teamBusy || teams.length === 0}
              onChange={(e) => {
                const nextId = Number(e.target.value);
                if (Number.isFinite(nextId)) {
                  void handleSwitchTeam(nextId);
                }
              }}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('settings.createTeam')}</label>
            <div className="flex gap-2">
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder={t('settings.teamNamePlaceholder')}
                disabled={teamBusy}
              />
              <Button
                variant="outline"
                onClick={handleCreateTeam}
                disabled={teamBusy || newTeamName.trim().length === 0}
              >
                <Plus className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {t('actions.save')}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('settings.inviteMember')}</label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t('settings.inviteEmailPlaceholder')}
              disabled={teamBusy || !currentTeamId}
            />
            <Button
              onClick={handleInviteMember}
              disabled={teamBusy || !currentTeamId || inviteEmail.trim().length === 0}
            >
              <UserPlus className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              {t('settings.sendInvite')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('settings.inviteHelp')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <LockKeyhole className="h-4 w-4" />
              {t('settings.teamPasswordTitle')}
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={teamPassword}
                onChange={(e) => setTeamPasswordValue(e.target.value)}
                placeholder={t('settings.teamPasswordPlaceholder')}
                disabled={teamBusy || !currentTeamId || !canManageTeamPassword}
              />
              <Button
                variant="outline"
                onClick={handleSetTeamPassword}
                disabled={teamBusy || !currentTeamId || !canManageTeamPassword || teamPassword.trim().length < 6}
              >
                {t('settings.saveTeamPassword')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {canManageTeamPassword
                ? t('settings.teamPasswordHelpAdmin')
                : t('settings.teamPasswordHelpMember')}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {t('settings.joinByPasswordTitle')}
            </label>
            <div className="space-y-2">
              <Input
                value={joinTeamName}
                onChange={(e) => setJoinTeamName(e.target.value)}
                placeholder={t('settings.joinTeamNamePlaceholder')}
                disabled={teamBusy}
              />
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={joinTeamPassword}
                  onChange={(e) => setJoinTeamPassword(e.target.value)}
                  placeholder={t('settings.joinTeamPasswordPlaceholder')}
                  disabled={teamBusy}
                />
                <Button
                  onClick={handleJoinTeamWithPassword}
                  disabled={teamBusy || joinTeamName.trim().length === 0 || joinTeamPassword.trim().length < 6}
                >
                  {t('settings.joinTeam')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t('settings.forgotTeamPasswordTitle')}
          </label>
          <div className="flex gap-2">
            <Input
              value={forgotTeamName}
              onChange={(e) => setForgotTeamName(e.target.value)}
              placeholder={t('settings.forgotTeamNamePlaceholder')}
              disabled={teamBusy}
            />
            <Button
              variant="outline"
              onClick={handleForgotTeamPassword}
              disabled={teamBusy || forgotTeamName.trim().length === 0}
            >
              {t('settings.sendResetEmail')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('settings.forgotTeamPasswordHelp')}</p>
        </div>
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

      {/* Google Calendar Integration */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <CalendarPlus className="h-5 w-5" />
          {t('settings.googleCalendar')}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={calendarConnected ? 'outline' : 'default'}
            disabled={calendarStatusLoading}
            onClick={handleConnectGoogleCalendar}
          >
            <Link2 className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            {calendarConnected
              ? t('settings.reconnectGoogleCalendar')
              : t('settings.connectGoogleCalendar')}
          </Button>
          <Button
            variant="outline"
            onClick={handleDisconnectGoogleCalendar}
            disabled={!calendarConnected || createLoading}
          >
            <Unlink className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            {t('settings.disconnectGoogleCalendar')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {calendarStatusLoading
              ? t('actions.processing')
              : calendarConnected
                ? t('settings.googleCalendarConnectedState')
                : t('settings.googleCalendarDisconnectedState')}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">{t('settings.googleCalendarDescription')}</p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('settings.alertDateTime')}</label>
            <Input
              type="datetime-local"
              value={alertAt}
              onChange={(e) => setAlertAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('settings.createMode')}</label>
            <Select
              value={calendarMode}
              onChange={(e) => setCalendarMode(e.target.value as GoogleCalendarMode)}
            >
              <option value="single">{t('settings.modeSingle')}</option>
              <option value="separate">{t('settings.modeSeparate')}</option>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium">{t('settings.activeReagents')}</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedReagentIds(reagents.map((r) => r.id))}
                disabled={reagentsLoading || reagents.length === 0}
              >
                {t('table.selectAll')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedReagentIds([])}
                disabled={reagentsLoading || reagents.length === 0}
              >
                {t('actions.cancel')}
              </Button>
            </div>
          </div>

          <div className="max-h-56 overflow-auto rounded-lg border p-3 space-y-2">
            {reagentsLoading ? (
              <p className="text-sm text-muted-foreground">{t('actions.processing')}</p>
            ) : reagents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.noReagents')}</p>
            ) : (
              reagents.map((reagent) => (
                <label key={reagent.id} className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedReagentIds.includes(reagent.id)}
                    onChange={() => toggleReagent(reagent.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{reagent.name}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      ({t('table.expiryDate')}: {reagent.expiry_date})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t('table.selected', { count: selectedReagentIds.length })}
          </p>
        </div>

        <Button
          onClick={handleCreateGoogleCalendarEvents}
          disabled={!calendarConnected || createLoading || selectedReagentIds.length === 0}
        >
          <CalendarPlus className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          {createLoading ? t('actions.processing') : t('settings.createGoogleCalendarEvents')}
        </Button>
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
