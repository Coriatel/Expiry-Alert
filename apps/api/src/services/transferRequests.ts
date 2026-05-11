import { config } from "../config.js";
import {
  createRecord,
  findOne,
  listRecords,
  updateSingleRecord,
} from "./directus.js";

export type TransferRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type TransferRequestRecord = {
  id: number;
  from_team: number;
  to_team: number;
  message_text: string | null;
  status: TransferRequestStatus;
  created_by: number | null;
  created_at: string;
  decided_by: number | null;
  decided_at: string | null;
};

const collection = config.directus.collections.transferRequests as any;

export async function createTransferRequest(data: {
  from_team: number;
  to_team: number;
  message_text?: string | null;
  created_by?: number | null;
}) {
  return createRecord<TransferRequestRecord>(collection, {
    from_team: data.from_team,
    to_team: data.to_team,
    message_text: data.message_text ?? null,
    status: "pending",
    created_by: data.created_by ?? null,
  });
}

export async function listIncomingPending(teamId: number) {
  return listRecords<TransferRequestRecord>(collection, {
    filter: {
      to_team: { _eq: teamId },
      status: { _eq: "pending" },
    },
    sort: ["-created_at"],
    limit: 100,
  });
}

export async function listOutgoing(teamId: number) {
  return listRecords<TransferRequestRecord>(collection, {
    filter: { from_team: { _eq: teamId } },
    sort: ["-created_at"],
    limit: 100,
  });
}

export async function getTransferRequest(id: number) {
  return findOne<TransferRequestRecord>(collection, { id: { _eq: id } });
}

export async function decideTransferRequest(
  id: number,
  decision: "approved" | "rejected",
  decidedBy: number,
) {
  return updateSingleRecord<TransferRequestRecord>(collection, id, {
    status: decision,
    decided_by: decidedBy,
    decided_at: new Date().toISOString(),
  });
}

export async function cancelTransferRequest(id: number, userId: number) {
  return updateSingleRecord<TransferRequestRecord>(collection, id, {
    status: "cancelled",
    decided_by: userId,
    decided_at: new Date().toISOString(),
  });
}
