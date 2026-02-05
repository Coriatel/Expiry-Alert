import { invoke } from '@tauri-apps/api/tauri';
import type { Reagent, GeneralNote, NotificationSettings, ReagentFormData } from '@/types';

const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// Mock data for browser development
const MOCK_REAGENTS: Reagent[] = [
  {
    id: 1,
    name: 'Mock Reagent A',
    category: 'reagents',
    expiry_date: new Date(Date.now() + 86400000 * 10).toISOString(), // +10 days
    lot_number: 'LOT-123',
    received_date: new Date().toISOString(),
    notes: 'Development mock data',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Mock Reagent B (Expired)',
    category: 'beads',
    expiry_date: new Date(Date.now() - 86400000).toISOString(), // -1 day
    lot_number: 'LOT-456',
    received_date: new Date().toISOString(),
    notes: undefined,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_NOTES: GeneralNote[] = [
  {
    id: 1,
    content: 'This is a mock note for development.',
    created_at: new Date().toISOString(),
  },
];

const MOCK_SETTINGS: NotificationSettings = {
  id: 1,
  enabled: true,
  remind_in_days: 30,
};

// Helper to simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function mockInvoke<T>(cmd: string, args?: any): Promise<T> {
  console.log(`[Mock Tauri] Invoking ${cmd}`, args);
  await delay(300); // Simulate latency

  switch (cmd) {
    case 'get_active_reagents':
    case 'get_all_reagents':
      return MOCK_REAGENTS.filter((r) => !r.is_archived) as unknown as T;
    case 'get_expiring_reagents':
      return MOCK_REAGENTS.filter((r) => {
        const expiry = new Date(r.expiry_date).getTime();
        const now = Date.now();
        // Return expiring within 30 days or expired
        return expiry < now + 86400000 * 30 && !r.is_archived;
      }) as unknown as T;
    case 'get_archived_reagents':
      return MOCK_REAGENTS.filter((r) => r.is_archived) as unknown as T;
    case 'get_general_notes':
      return MOCK_NOTES as unknown as T;
    case 'get_notification_settings':
      return MOCK_SETTINGS as unknown as T;
    case 'add_reagent':
    case 'add_general_note':
      return Math.floor(Math.random() * 1000) as unknown as T;
    case 'add_reagents_bulk':
      return [101, 102] as unknown as T;
    case 'update_reagent':
    case 'delete_reagent':
    case 'delete_reagents_bulk':
    case 'archive_reagent':
    case 'archive_reagents_bulk':
    case 'restore_reagent':
    case 'delete_general_note':
    case 'update_notification_settings':
    case 'snooze_notification':
    case 'dismiss_notification':
      return undefined as unknown as T;
    default:
      console.warn(`[Mock Tauri] Unknown command: ${cmd}`);
      return undefined as unknown as T;
  }
}

// Reagent operations
export async function getAllReagents(): Promise<Reagent[]> {
  if (!isTauri) return mockInvoke('get_all_reagents');
  return await invoke('get_all_reagents');
}

export async function getActiveReagents(): Promise<Reagent[]> {
  if (!isTauri) return mockInvoke('get_active_reagents');
  return await invoke('get_active_reagents');
}

export async function getArchivedReagents(): Promise<Reagent[]> {
  if (!isTauri) return mockInvoke('get_archived_reagents');
  return await invoke('get_archived_reagents');
}

export async function addReagent(data: ReagentFormData): Promise<number> {
  const payload = {
    name: data.name,
    category: data.category,
    expiry_date: data.expiryDate,
    lot_number: data.lotNumber || null,
    received_date: data.receivedDate || null,
    notes: data.notes || null,
  };

  if (!isTauri) return mockInvoke('add_reagent', payload);
  return await invoke('add_reagent', payload);
}

export async function addReagentsBulk(reagents: ReagentFormData[]): Promise<number[]> {
  const payload = {
    reagents: reagents.map(r => ({
      name: r.name,
      category: r.category,
      expiry_date: r.expiryDate,
      lot_number: r.lotNumber || null,
      received_date: r.receivedDate || null,
      notes: r.notes || null,
    }))
  };

  if (!isTauri) return mockInvoke('add_reagents_bulk', payload);
  return await invoke('add_reagents_bulk', payload);
}

export async function updateReagent(id: number, data: ReagentFormData): Promise<void> {
  const payload = {
    id,
    name: data.name,
    category: data.category,
    expiry_date: data.expiryDate,
    lot_number: data.lotNumber || null,
    received_date: data.receivedDate || null,
    notes: data.notes || null,
  };

  if (!isTauri) return mockInvoke('update_reagent', payload);
  return await invoke('update_reagent', payload);
}

export async function deleteReagent(id: number): Promise<void> {
  if (!isTauri) return mockInvoke('delete_reagent', { id });
  return await invoke('delete_reagent', { id });
}

export async function deleteReagentsBulk(ids: number[]): Promise<void> {
  if (!isTauri) return mockInvoke('delete_reagents_bulk', { ids });
  return await invoke('delete_reagents_bulk', { ids });
}

export async function archiveReagent(id: number): Promise<void> {
  if (!isTauri) return mockInvoke('archive_reagent', { id });
  return await invoke('archive_reagent', { id });
}

export async function archiveReagentsBulk(ids: number[]): Promise<void> {
  if (!isTauri) return mockInvoke('archive_reagents_bulk', { ids });
  return await invoke('archive_reagents_bulk', { ids });
}

export async function restoreReagent(id: number): Promise<void> {
  if (!isTauri) return mockInvoke('restore_reagent', { id });
  return await invoke('restore_reagent', { id });
}

// General notes operations
export async function getGeneralNotes(): Promise<GeneralNote[]> {
  if (!isTauri) return mockInvoke('get_general_notes');
  return await invoke('get_general_notes');
}

export async function addGeneralNote(content: string): Promise<number> {
  if (!isTauri) return mockInvoke('add_general_note', { content });
  return await invoke('add_general_note', { content });
}

export async function deleteGeneralNote(id: number): Promise<void> {
  if (!isTauri) return mockInvoke('delete_general_note', { id });
  return await invoke('delete_general_note', { id });
}

// Notification operations
export async function getNotificationSettings(): Promise<NotificationSettings> {
  if (!isTauri) return mockInvoke('get_notification_settings');
  return await invoke('get_notification_settings');
}

export async function updateNotificationSettings(
  enabled: boolean,
  remindInDays: number
): Promise<void> {
  const payload = { enabled, remind_in_days: remindInDays };
  if (!isTauri) return mockInvoke('update_notification_settings', payload);
  return await invoke('update_notification_settings', payload);
}

export async function snoozeNotification(reagentId: number, days: number): Promise<void> {
  if (!isTauri) return mockInvoke('snooze_notification', { reagentId, days });
  return await invoke('snooze_notification', { reagentId, days });
}

export async function dismissNotification(reagentId: number): Promise<void> {
  if (!isTauri) return mockInvoke('dismiss_notification', { reagentId });
  return await invoke('dismiss_notification', { reagentId });
}

export async function getExpiringReagents(): Promise<Reagent[]> {
  if (!isTauri) return mockInvoke('get_expiring_reagents');
  return await invoke('get_expiring_reagents');
}