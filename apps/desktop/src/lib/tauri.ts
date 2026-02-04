import { invoke } from '@tauri-apps/api/tauri';
import type { Reagent, GeneralNote, NotificationSettings, ReagentFormData } from '@/types';

const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// Mock data for browser development
const MOCK_REAGENTS: Reagent[] = [
  {
    id: 1,
    name: 'Mock Reagent A',
    category: 'Antibodies',
    expiryDate: new Date(Date.now() + 86400000 * 10).toISOString(), // +10 days
    lotNumber: 'LOT-123',
    receivedDate: new Date().toISOString(),
    notes: 'Development mock data',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Mock Reagent B (Expired)',
    category: 'Buffers',
    expiryDate: new Date(Date.now() - 86400000).toISOString(), // -1 day
    lotNumber: 'LOT-456',
    receivedDate: new Date().toISOString(),
    notes: null,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_NOTES: GeneralNote[] = [
  {
    id: 1,
    content: 'This is a mock note for development.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_SETTINGS: NotificationSettings = {
  id: 1,
  enabled: true,
  remindInDays: 30,
};

// Helper to simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function mockInvoke<T>(cmd: string, args?: any): Promise<T> {
  console.log(`[Mock Tauri] Invoking ${cmd}`, args);
  await delay(300); // Simulate latency

  switch (cmd) {
    case 'get_active_reagents':
    case 'get_all_reagents':
      return MOCK_REAGENTS.filter((r) => !r.isArchived) as unknown as T;
    case 'get_expiring_reagents':
      return MOCK_REAGENTS.filter((r) => {
        const expiry = new Date(r.expiryDate).getTime();
        const now = Date.now();
        // Return expiring within 30 days or expired
        return expiry < now + 86400000 * 30 && !r.isArchived;
      }) as unknown as T;
    case 'get_archived_reagents':
      return MOCK_REAGENTS.filter((r) => r.isArchived) as unknown as T;
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
  if (!isTauri)
    return mockInvoke('add_reagent', {
      name: data.name,
      category: data.category,
      expiryDate: data.expiryDate,
      lotNumber: data.lotNumber || null,
      receivedDate: data.receivedDate || null,
      notes: data.notes || null,
    });

  return await invoke('add_reagent', {
    name: data.name,
    category: data.category,
    expiryDate: data.expiryDate,
    lotNumber: data.lotNumber || null,
    receivedDate: data.receivedDate || null,
    notes: data.notes || null,
  });
}

export async function addReagentsBulk(reagents: ReagentFormData[]): Promise<number[]> {
  if (!isTauri) return mockInvoke('add_reagents_bulk', { reagents });
  return await invoke('add_reagents_bulk', { reagents });
}

export async function updateReagent(id: number, data: ReagentFormData): Promise<void> {
  if (!isTauri)
    return mockInvoke('update_reagent', {
      id,
      name: data.name,
      category: data.category,
      expiryDate: data.expiryDate,
      lotNumber: data.lotNumber || null,
      receivedDate: data.receivedDate || null,
      notes: data.notes || null,
    });

  return await invoke('update_reagent', {
    id,
    name: data.name,
    category: data.category,
    expiryDate: data.expiryDate,
    lotNumber: data.lotNumber || null,
    receivedDate: data.receivedDate || null,
    notes: data.notes || null,
  });
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
  if (!isTauri)
    return mockInvoke('update_notification_settings', { enabled, remindInDays });
  return await invoke('update_notification_settings', { enabled, remindInDays });
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
