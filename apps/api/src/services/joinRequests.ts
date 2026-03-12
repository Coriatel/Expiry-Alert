import { config } from "../config.js";
import { createRecord, listRecords, updateSingleRecord } from "./directus.js";

export type JoinRequestStatus = "pending" | "approved" | "rejected";

export type JoinRequestRecord = {
  id: number;
  team: number;
  requester: number;
  reviewer?: number | null;
  requester_message?: string | null;
  status: JoinRequestStatus;
  reviewed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

const collection = config.directus.collections.joinRequests as any;

export async function listJoinRequestsByTeam(
  teamId: number,
  status?: JoinRequestStatus,
) {
  const filter =
    status == null
      ? { team: { _eq: teamId } }
      : {
          _and: [{ team: { _eq: teamId } }, { status: { _eq: status } }],
        };
  return listRecords<JoinRequestRecord>(collection, {
    filter,
    sort: ["-created_at"],
    limit: 100,
  });
}

export async function listPendingJoinRequestsByUser(userId: number) {
  return listRecords<JoinRequestRecord>(collection, {
    filter: {
      _and: [{ requester: { _eq: userId } }, { status: { _eq: "pending" } }],
    },
    sort: ["-created_at"],
    limit: 100,
  });
}

export async function getPendingJoinRequestByUserAndTeam(
  userId: number,
  teamId: number,
) {
  const requests = await listRecords<JoinRequestRecord>(collection, {
    filter: {
      _and: [
        { requester: { _eq: userId } },
        { team: { _eq: teamId } },
        { status: { _eq: "pending" } },
      ],
    },
    limit: 1,
  });
  return requests[0] ?? null;
}

export async function getJoinRequestById(joinRequestId: number) {
  const requests = await listRecords<JoinRequestRecord>(collection, {
    filter: { id: { _eq: joinRequestId } },
    limit: 1,
  });
  return requests[0] ?? null;
}

export async function createJoinRequest(
  teamId: number,
  requesterId: number,
  message?: string,
) {
  const now = new Date().toISOString();
  return createRecord<JoinRequestRecord>(collection, {
    team: teamId,
    requester: requesterId,
    requester_message: message?.trim() || null,
    status: "pending",
    reviewed_at: null,
    created_at: now,
    updated_at: now,
  });
}

export async function updateJoinRequestStatus(
  joinRequestId: number,
  status: Exclude<JoinRequestStatus, "pending">,
  reviewerId: number,
) {
  return updateSingleRecord<JoinRequestRecord>(collection, joinRequestId, {
    status,
    reviewer: reviewerId,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}
