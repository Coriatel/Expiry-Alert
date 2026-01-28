import { config } from '../config.js';
import { createRecords, listRecords, updateRecords } from './nocodb.js';
import { normalizeId } from '../utils/records.js';
import { whereEq } from '../utils/nocodb.js';

export type NotificationSettingsRecord = {
  Id?: number;
  id?: number;
  team_id: number;
  enabled: boolean;
  remind_in_days: number;
  last_sent_at?: string | null;
};

const settingsTable = config.nocodb.tables.settings;

export async function getNotificationSettings(teamId: number) {
  const records = await listRecords<NotificationSettingsRecord>(settingsTable, {
    where: whereEq('team_id', teamId),
    limit: 1,
  });
  if (records.length > 0) return normalizeId(records[0]);

  const defaultSettings = {
    team_id: teamId,
    enabled: true,
    remind_in_days: 30,
  };

  await createRecords(settingsTable, [defaultSettings]);
  const created = await listRecords<NotificationSettingsRecord>(settingsTable, {
    where: whereEq('team_id', teamId),
    limit: 1,
  });
  return created.length > 0 ? normalizeId(created[0]) : null;
}

export async function updateNotificationSettings(teamId: number, data: Partial<NotificationSettingsRecord>) {
  const settings = await getNotificationSettings(teamId);
  if (!settings || !settings.id) return null;

  await updateRecords(settingsTable, [{ Id: settings.id, ...data }]);
  return getNotificationSettings(teamId);
}
