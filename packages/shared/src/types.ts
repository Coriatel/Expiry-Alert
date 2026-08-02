export interface Reagent {
  id: number;
  team_id?: number;
  name: string;
  category: "reagents" | "beads";
  expiry_date: string;
  lot_number?: string;
  received_date?: string;
  notes?: string;
  is_archived: boolean;
  snoozed_until?: string | null;
  dismissed_until?: string | null;
  replaced_by?: number | null;
  supplier_id?: number | null;
  supplier_name?: string | null;
  quantity?: number | null;
  catalog_reagent_id?: number | null;
  manufacturer?: string | null;
  description?: string | null;
  in_treatment?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface GeneralNote {
  id: number;
  content: string;
  created_at: string;
}

export interface NotificationSettings {
  id: number;
  team_id?: number;
  enabled: boolean;
  remind_in_days: number;
  last_sent_at?: string | null;
}

export interface ReagentFormData {
  name: string;
  category: "reagents" | "beads";
  expiryDate: string;
  lotNumber?: string;
  receivedDate?: string;
  notes?: string;
  supplier_id?: number | null;
  supplier_name?: string | null;
  quantity?: number | null;
  manufacturer?: string | null;
  description?: string | null;
}

export type ExpiryStatus = "expired" | "expiring-soon" | "expiring-week" | "ok";
