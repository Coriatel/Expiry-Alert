import { invoke } from '@tauri-apps/api/tauri';
import type { Reagent, GeneralNote, NotificationSettings, ReagentFormData } from '@/types';

// Reagent operations
export async function getAllReagents(): Promise<Reagent[]> {
  return await invoke('get_all_reagents');
}

export async function getActiveReagents(): Promise<Reagent[]> {
  return await invoke('get_active_reagents');
}

export async function getArchivedReagents(): Promise<Reagent[]> {
  return await invoke('get_archived_reagents');
}

export async function addReagent(data: ReagentFormData): Promise<number> {
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
  return await invoke('add_reagents_bulk', { reagents });
}

export async function updateReagent(id: number, data: ReagentFormData): Promise<void> {
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
  return await invoke('delete_reagent', { id });
}

export async function deleteReagentsBulk(ids: number[]): Promise<void> {
  return await invoke('delete_reagents_bulk', { ids });
}

export async function archiveReagent(id: number): Promise<void> {
  return await invoke('archive_reagent', { id });
}

export async function archiveReagentsBulk(ids: number[]): Promise<void> {
  return await invoke('archive_reagents_bulk', { ids });
}

export async function restoreReagent(id: number): Promise<void> {
  return await invoke('restore_reagent', { id });
}

// General notes operations
export async function getGeneralNotes(): Promise<GeneralNote[]> {
  return await invoke('get_general_notes');
}

export async function addGeneralNote(content: string): Promise<number> {
  return await invoke('add_general_note', { content });
}

export async function deleteGeneralNote(id: number): Promise<void> {
  return await invoke('delete_general_note', { id });
}

// Notification operations
export async function getNotificationSettings(): Promise<NotificationSettings> {
  return await invoke('get_notification_settings');
}

export async function updateNotificationSettings(
  enabled: boolean,
  remindInDays: number
): Promise<void> {
  return await invoke('update_notification_settings', { enabled, remindInDays });
}

export async function snoozeNotification(reagentId: number, days: number): Promise<void> {
  return await invoke('snooze_notification', { reagentId, days });
}

export async function dismissNotification(reagentId: number): Promise<void> {
  return await invoke('dismiss_notification', { reagentId });
}

export async function getExpiringReagents(): Promise<Reagent[]> {
  return await invoke('get_expiring_reagents');
}
