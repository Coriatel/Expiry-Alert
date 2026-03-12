import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGroupedNotificationPayload,
  classifyReagentForRun,
  createCalendarDay,
  getCalendarDayInTimeZone,
  isReagentNotificationSuppressed,
} from '../src/services/cron.ts';

function makeReagent(overrides: Partial<any> = {}) {
  return {
    id: 1,
    team: 10,
    name: 'Buffer A',
    category: 'reagents',
    expiry_date: '2026-03-15',
    is_archived: false,
    lot_number: null,
    received_date: null,
    notes: null,
    snoozed_until: null,
    dismissed_until: null,
    date_created: '2026-03-01T00:00:00.000Z',
    date_updated: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

test('getCalendarDayInTimeZone resolves the local day in Israel', () => {
  const day = getCalendarDayInTimeZone(new Date('2026-03-15T08:00:00.000Z'));

  assert.equal(day.isoDate, '2026-03-15');
  assert.equal(day.weekday, 0);
});

test('classifyReagentForRun emits a same-day alert for non-Saturday expiry', () => {
  const runDay = createCalendarDay(2026, 3, 15);
  assert.ok(runDay);

  const alerts = classifyReagentForRun(
    makeReagent({ expiry_date: '2026-03-15' }),
    runDay,
  );

  assert.deepEqual(
    alerts.map((alert) => ({
      alertType: alert.alertType,
      reason: alert.reason,
    })),
    [{ alertType: '0day', reason: 'expires_today' }],
  );
});

test('classifyReagentForRun advances Saturday expiry to Friday only', () => {
  const friday = createCalendarDay(2026, 3, 13);
  const saturday = createCalendarDay(2026, 3, 14);
  assert.ok(friday);
  assert.ok(saturday);

  const reagent = makeReagent({ expiry_date: '2026-03-14' });

  assert.deepEqual(
    classifyReagentForRun(reagent, friday).map((alert) => alert.reason),
    ['saturday_advanced'],
  );
  assert.deepEqual(classifyReagentForRun(reagent, saturday), []);
});

test('classifyReagentForRun includes only 1-5 days in Sunday/Wednesday summaries', () => {
  const sunday = createCalendarDay(2026, 3, 15);
  assert.ok(sunday);

  assert.deepEqual(
    classifyReagentForRun(
      makeReagent({ expiry_date: '2026-03-20' }),
      sunday,
    ).map((alert) => alert.alertType),
    ['5day_summary'],
  );

  assert.deepEqual(
    classifyReagentForRun(
      makeReagent({ expiry_date: '2026-03-15' }),
      sunday,
    ).map((alert) => alert.alertType),
    ['0day'],
  );

  assert.deepEqual(
    classifyReagentForRun(
      makeReagent({ expiry_date: '2026-03-21' }),
      sunday,
    ),
    [],
  );
});

test('isReagentNotificationSuppressed respects snooze and dismiss timestamps', () => {
  const now = new Date('2026-03-12T08:00:00.000Z');

  assert.equal(
    isReagentNotificationSuppressed(
      makeReagent({ snoozed_until: '2026-03-13T00:00:00.000Z' }),
      now,
    ),
    true,
  );
  assert.equal(
    isReagentNotificationSuppressed(
      makeReagent({ dismissed_until: '2026-03-13T00:00:00.000Z' }),
      now,
    ),
    true,
  );
  assert.equal(
    isReagentNotificationSuppressed(
      makeReagent({ dismissed_until: '2026-03-11T00:00:00.000Z' }),
      now,
    ),
    false,
  );
});

test('buildGroupedNotificationPayload uses v2 assets and mixed Friday wording', () => {
  const friday = createCalendarDay(2026, 3, 13);
  assert.ok(friday);

  const todayAlert = classifyReagentForRun(
    makeReagent({ id: 1, name: 'Friday Item', expiry_date: '2026-03-13' }),
    friday,
  )[0];
  const saturdayAlert = classifyReagentForRun(
    makeReagent({ id: 2, name: 'Saturday Item', expiry_date: '2026-03-14' }),
    friday,
  )[0];

  assert.ok(todayAlert);
  assert.ok(saturdayAlert);

  const payload = buildGroupedNotificationPayload(
    10,
    'QA Lab',
    '0day',
    [todayAlert, saturdayAlert],
  );

  assert.equal(payload.icon, '/icon-192-v2.png');
  assert.equal(payload.badge, '/icon-badge-72-v2.png');
  assert.match(payload.title, /QA Lab/);
  assert.match(payload.body, /expires today and 1 reagent expires on Saturday/i);
});
