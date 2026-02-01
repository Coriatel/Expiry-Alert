import { config } from '../config.js';
import { createRecord, listRecords, updateSingleRecord } from './directus.js';

export type NotificationSettingsRecord = {
  id: number;
  team: number; // FK
  enabled: boolean;
  remind_in_days: number;
  last_sent?: string | null;
};

const collection = config.directus.collections.settings as any;

export async function getNotificationSettings(teamId: number) {
  const records = await listRecords<NotificationSettingsRecord>(collection, {
    filter: { team: { _eq: teamId } },
    limit: 1,
  });
  if (records.length > 0) return records[0];

  const defaultSettings = {
    team: teamId,
    enabled: true,
    remind_in_days: 30,
  };

  const result = await createRecord(collection, defaultSettings);
  return Array.isArray(result) ? result[0] : result;
}

export async function updateNotificationSettings(
  teamId: number,
  data: Partial<NotificationSettingsRecord>
) {
  const settings = await getNotificationSettings(teamId);
  if (!settings || !settings.id) return null;

  await updateSingleRecord(collection, settings.id, data);
  return getNotificationSettings(teamId);
}
