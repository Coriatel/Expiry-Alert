import cron from 'node-cron';
import { config } from '../config.js';
import { listRecords } from './directus.js';
import { ReagentRecord } from './reagents.js';
import { MembershipRecord, getTeamById } from './teams.js';
import { sendNotificationToUser } from './push.js';
import { notifySystemAdmin } from './adminNotifications.js';
import {
  AlertType,
  findExistingLog,
  isDismissedAndNotEligible,
  logNotificationSent,
} from './notificationLog.js';

const tableMemberships = config.directus.collections.memberships as any;
const tableReagents = config.directus.collections.reagents as any;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_MAP = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
} as const;

export const EXPIRY_NOTIFICATION_TIMEZONE = 'Asia/Jerusalem';
export const EXPIRY_CRON_EXPRESSION = '0 10 * * *';

type LocalWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type AlertReason = 'expires_today' | 'saturday_advanced' | 'five_day_summary';
type GroupedAlertType = Extract<AlertType, '0day' | '5day_summary'>;

export interface CalendarDay {
  year: number;
  month: number;
  day: number;
  weekday: LocalWeekday;
  serial: number;
  isoDate: string;
}

export interface PendingAlert {
  reagent: ReagentRecord;
  diffDays: number;
  alertType: GroupedAlertType;
  reason: AlertReason;
  expiryDay: CalendarDay;
}

export interface TeamDeliveryResult {
  teamId: number;
  teamName: string | null;
  usersWithPendingAlerts: number;
  usersReached: number;
}

type SendOutcome = 'nothing_pending' | 'sent' | 'unreached';

interface TeamAlertBuckets {
  sameDay: PendingAlert[];
  fiveDaySummary: PendingAlert[];
}

export function initCron() {
  cron.schedule(
    EXPIRY_CRON_EXPRESSION,
    async () => {
      console.log('Running expiry push check...');
      try {
        await checkAndNotify();
      } catch (error) {
        console.error('Error in expiry push check:', error);
      }
    },
    { timezone: EXPIRY_NOTIFICATION_TIMEZONE },
  );

  if (config.nodeEnv === 'development') {
    setTimeout(() => {
      console.log('Running dev startup expiry push check...');
      checkAndNotify().catch(console.error);
    }, 5000);
  }
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function weekdayFromShortName(value: string): LocalWeekday {
  const weekday = WEEKDAY_MAP[value as keyof typeof WEEKDAY_MAP];
  if (weekday == null) {
    throw new Error(`Unsupported weekday value: ${value}`);
  }
  return weekday;
}

export function createCalendarDay(
  year: number,
  month: number,
  day: number,
): CalendarDay | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
    weekday: date.getUTCDay() as LocalWeekday,
    serial: Math.trunc(date.getTime() / DAY_MS),
    isoDate: `${year}-${pad(month)}-${pad(day)}`,
  };
}

export function parseStoredCalendarDay(value: string | null | undefined): CalendarDay | null {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return createCalendarDay(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
    );
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return createCalendarDay(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth() + 1,
    parsed.getUTCDate(),
  );
}

export function getCalendarDayInTimeZone(
  date: Date,
  timeZone: string = EXPIRY_NOTIFICATION_TIMEZONE,
): CalendarDay {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const weekdayValue = parts.find((part) => part.type === 'weekday')?.value ?? 'Sun';
  const calendarDay = createCalendarDay(year, month, day);

  if (!calendarDay) {
    throw new Error(`Failed to derive calendar day for ${date.toISOString()} in ${timeZone}`);
  }

  return {
    ...calendarDay,
    weekday: weekdayFromShortName(weekdayValue),
  };
}

export function isSundayOrWednesday(weekday: LocalWeekday): boolean {
  return weekday === 0 || weekday === 3;
}

export function isReagentNotificationSuppressed(
  reagent: Pick<ReagentRecord, 'is_archived' | 'snoozed_until' | 'dismissed_until'>,
  now: Date,
): boolean {
  if (reagent.is_archived) return true;

  const isFuture = (value: string | null | undefined) => {
    if (!value) return false;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) && parsed > now;
  };

  return isFuture(reagent.snoozed_until) || isFuture(reagent.dismissed_until);
}

export function classifyReagentForRun(
  reagent: ReagentRecord,
  runDay: CalendarDay,
): PendingAlert[] {
  const expiryDay = parseStoredCalendarDay(reagent.expiry_date);
  if (!expiryDay) return [];

  const diffDays = expiryDay.serial - runDay.serial;
  const alerts: PendingAlert[] = [];

  if (expiryDay.weekday === 6) {
    if (runDay.weekday === 5 && diffDays === 1) {
      alerts.push({
        reagent,
        diffDays,
        alertType: '0day',
        reason: 'saturday_advanced',
        expiryDay,
      });
    }
  } else if (diffDays === 0) {
    alerts.push({
      reagent,
      diffDays,
      alertType: '0day',
      reason: 'expires_today',
      expiryDay,
    });
  }

  if (isSundayOrWednesday(runDay.weekday) && diffDays >= 1 && diffDays <= 5) {
    alerts.push({
      reagent,
      diffDays,
      alertType: '5day_summary',
      reason: 'five_day_summary',
      expiryDay,
    });
  }

  return alerts;
}

function formatCountLabel(count: number): string {
  return count === 1 ? 'פריט אחד' : `${count} פריטים`;
}

function formatExpiryClause(count: number, suffix: string): string {
  return `${formatCountLabel(count)} ${count === 1 ? 'פג' : 'פגי'} תוקף ${suffix}`;
}

function joinWithVav(clause: string): string {
  return /^\d/.test(clause) ? `ו-${clause}` : `ו${clause}`;
}

function buildNamePreview(alerts: PendingAlert[], limit: number = 3): string {
  const names = [...new Set(alerts.map((alert) => alert.reagent.name.trim()).filter(Boolean))];
  if (names.length === 0) return '';

  const preview = names.slice(0, limit).join(', ');
  const remaining = names.length - limit;
  return remaining > 0 ? `${preview} ועוד ${remaining}` : preview;
}

export function buildGroupedNotificationPayload(
  teamId: number,
  teamName: string | null,
  alertType: GroupedAlertType,
  alerts: PendingAlert[],
) {
  const title = teamName ? `Expiry Alert • ${teamName}` : 'Expiry Alert';
  const preview = buildNamePreview(alerts);

  let body = '';
  if (alertType === '5day_summary') {
    body = alerts.length === 1
      ? `${alerts[0]!.reagent.name} פג תוקף תוך 5 ימים`
      : `${formatExpiryClause(alerts.length, 'תוך 5 ימים')}${preview ? `: ${preview}` : ''}`;
  } else {
    const todayCount = alerts.filter((alert) => alert.reason === 'expires_today').length;
    const saturdayCount = alerts.filter((alert) => alert.reason === 'saturday_advanced').length;

    if (todayCount > 0 && saturdayCount > 0) {
      body = `${formatExpiryClause(todayCount, 'היום')} ${joinWithVav(formatExpiryClause(saturdayCount, 'בשבת'))}${preview ? `: ${preview}` : ''}`;
    } else if (saturdayCount > 0) {
      body = alerts.length === 1
        ? `${alerts[0]!.reagent.name} פג תוקף בשבת`
        : `${formatExpiryClause(alerts.length, 'בשבת')}${preview ? `: ${preview}` : ''}`;
    } else {
      body = alerts.length === 1
        ? `${alerts[0]!.reagent.name} פג תוקף היום`
        : `${formatExpiryClause(alerts.length, 'היום')}${preview ? `: ${preview}` : ''}`;
    }
  }

  return {
    title,
    body,
    icon: '/icon-192-v2.png',
    badge: '/icon-badge-72-v2.png',
    tag: `expiry-${teamId}-${alertType}`,
    data: {
      url: '/',
      teamId,
      alertType,
      reagentIds: alerts.map((alert) => alert.reagent.id),
    },
  };
}

function getOrCreateTeamBuckets(
  teamAlerts: Map<number, TeamAlertBuckets>,
  teamId: number,
): TeamAlertBuckets {
  const existing = teamAlerts.get(teamId);
  if (existing) return existing;

  const created: TeamAlertBuckets = {
    sameDay: [],
    fiveDaySummary: [],
  };
  teamAlerts.set(teamId, created);
  return created;
}

export function findUnreachedTeams(results: TeamDeliveryResult[]): TeamDeliveryResult[] {
  return results.filter(
    (result) => result.usersWithPendingAlerts > 0 && result.usersReached === 0,
  );
}

export function buildUnreachedAlertReport(teams: TeamDeliveryResult[]) {
  const lines = teams.map(
    (team) =>
      `- ${team.teamName ?? `צוות ${team.teamId}`}: ${team.usersWithPendingAlerts} חברי צוות היו אמורים לקבל התראה, אף אחד לא קיבל`,
  );

  return {
    subject: 'Expiry Alert: התראות פג תוקף לא הגיעו לאף אחד היום',
    text: [
      'הבדיקה היומית מצאה פריטים שתוקפם פג או עומד לפוג, אבל ההתראה לא נמסרה לאף מכשיר:',
      '',
      ...lines,
      '',
      'הסיבה הרגילה: לאף אחד מחברי הצוות אין מנוי התראות פעיל.',
      'מה לעשות: לפתוח את האפליקציה במכשיר וללחוץ "הפעל התראות".',
    ].join('\n'),
  };
}

function getEligibleUserIds(memberships: MembershipRecord[]): number[] {
  return [...new Set(
    memberships
      .filter((membership) => membership.status !== 'suspended')
      .filter((membership) => membership.email_alerts_enabled !== false)
      .map((membership) => membership.user),
  )];
}

export async function checkAndNotify(now: Date = new Date()) {
  const runDay = getCalendarDayInTimeZone(now);

  const reagents = await listRecords<ReagentRecord>(tableReagents, {
    filter: { is_archived: { _eq: false } },
    limit: 5000,
  });

  const teamAlerts = new Map<number, TeamAlertBuckets>();

  for (const reagent of reagents) {
    if (isReagentNotificationSuppressed(reagent, now)) continue;

    const pendingAlerts = classifyReagentForRun(reagent, runDay);
    if (pendingAlerts.length === 0) continue;

    const buckets = getOrCreateTeamBuckets(teamAlerts, reagent.team);
    for (const alert of pendingAlerts) {
      if (alert.alertType === '0day') {
        buckets.sameDay.push(alert);
      } else {
        buckets.fiveDaySummary.push(alert);
      }
    }
  }

  const deliveryResults: TeamDeliveryResult[] = [];
  if (teamAlerts.size === 0) return deliveryResults;

  for (const [teamId, buckets] of teamAlerts.entries()) {
    if (buckets.sameDay.length === 0 && buckets.fiveDaySummary.length === 0) continue;

    const [team, memberships] = await Promise.all([
      getTeamById(teamId),
      listRecords<MembershipRecord>(tableMemberships, {
        filter: { team: { _eq: teamId } },
        limit: 1000,
      }),
    ]);

    const userIds = getEligibleUserIds(memberships);
    if (userIds.length === 0) continue;

    const result: TeamDeliveryResult = {
      teamId,
      teamName: team?.name ?? null,
      usersWithPendingAlerts: 0,
      usersReached: 0,
    };

    for (const userId of userIds) {
      const outcomes = [
        await sendGroupedAlert(userId, teamId, result.teamName, buckets.sameDay, '0day'),
        await sendGroupedAlert(
          userId,
          teamId,
          result.teamName,
          buckets.fiveDaySummary,
          '5day_summary',
        ),
      ];
      if (outcomes.some((outcome) => outcome !== 'nothing_pending')) {
        result.usersWithPendingAlerts += 1;
      }
      if (outcomes.includes('sent')) result.usersReached += 1;
    }

    deliveryResults.push(result);
  }

  // A run that had something to say and reached nobody used to end silently.
  const unreached = findUnreachedTeams(deliveryResults);
  if (unreached.length > 0) {
    const report = buildUnreachedAlertReport(unreached);
    console.warn(`Expiry alerts reached nobody: ${JSON.stringify(unreached)}`);
    await notifySystemAdmin(report.subject, report.text);
  }

  return deliveryResults;
}

async function sendGroupedAlert(
  userId: number,
  teamId: number,
  teamName: string | null,
  alerts: PendingAlert[],
  alertType: GroupedAlertType,
): Promise<SendOutcome> {
  if (alerts.length === 0) return 'nothing_pending';

  const eligible: PendingAlert[] = [];

  for (const alert of alerts) {
    const existing = await findExistingLog(alert.reagent.id, userId, alert.alertType);
    if (existing) continue;

    const dismissed = await isDismissedAndNotEligible(
      alert.reagent.id,
      userId,
      alert.alertType,
    );
    if (dismissed) continue;

    eligible.push(alert);
  }

  if (eligible.length === 0) return 'nothing_pending';

  const payload = buildGroupedNotificationPayload(teamId, teamName, alertType, eligible);

  try {
    const result = await sendNotificationToUser(userId, payload);
    if (result.sent > 0) {
      for (const alert of eligible) {
        await logNotificationSent(alert.reagent.id, userId, teamId, alert.alertType);
      }
      return 'sent';
    }
  } catch (error) {
    console.error(`Failed to send ${alertType} alert to user ${userId}:`, error);
  }
  return 'unreached';
}
