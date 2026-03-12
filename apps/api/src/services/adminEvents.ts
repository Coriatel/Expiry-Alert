import { config } from "../config.js";
import { createRecord } from "./directus.js";

export type AdminEventType =
  | "user_registered"
  | "google_user_registered"
  | "team_created"
  | "join_request_submitted"
  | "join_request_approved"
  | "join_request_rejected";

export type AdminEventRecord = {
  id: number;
  event_type: AdminEventType;
  message: string;
  user?: number | null;
  team?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
};

const collection = config.directus.collections.adminEvents as any;

export async function logAdminEvent(input: {
  eventType: AdminEventType;
  message: string;
  userId?: number | null;
  teamId?: number | null;
  metadata?: Record<string, unknown> | null;
}) {
  return createRecord<AdminEventRecord>(collection, {
    event_type: input.eventType,
    message: input.message,
    user: input.userId ?? null,
    team: input.teamId ?? null,
    metadata: input.metadata ?? null,
    created_at: new Date().toISOString(),
  });
}
