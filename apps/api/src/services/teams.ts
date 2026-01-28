import { config } from '../config.js';
import { createRecords, listRecords, updateRecords } from './nocodb.js';
import { normalizeId, recordId } from '../utils/records.js';
import { whereEq } from '../utils/nocodb.js';

export type TeamRecord = {
  Id?: number;
  id?: number;
  name: string;
  owner_id: number;
  created_at?: string;
};

export type MembershipRecord = {
  Id?: number;
  id?: number;
  team_id: number;
  user_id: number;
  role: 'owner' | 'admin' | 'member';
  email_alerts_enabled?: boolean;
  created_at?: string;
};

export type InviteRecord = {
  Id?: number;
  id?: number;
  team_id: number;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'accepted' | 'expired';
  created_at?: string;
  accepted_at?: string | null;
};

const teamTable = config.nocodb.tables.teams;
const membershipTable = config.nocodb.tables.memberships;
const inviteTable = config.nocodb.tables.invites;

export async function listTeams() {
  const teams = await listRecords<TeamRecord>(teamTable, { limit: 1000 });
  return teams.map(normalizeId);
}

export async function listMembershipsByUser(userId: number) {
  const memberships = await listRecords<MembershipRecord>(membershipTable, {
    where: whereEq('user_id', userId),
    limit: 1000,
  });
  return memberships.map(normalizeId);
}

export async function listMembershipsByTeam(teamId: number) {
  const memberships = await listRecords<MembershipRecord>(membershipTable, {
    where: whereEq('team_id', teamId),
    limit: 1000,
  });
  return memberships.map(normalizeId);
}

export async function createTeam(name: string, ownerId: number) {
  const now = new Date().toISOString();
  await createRecords(teamTable, [{ name, owner_id: ownerId, created_at: now }]);
  const teams = await listRecords<TeamRecord>(teamTable, { limit: 1, where: whereEq('name', name) });
  const record = teams[0];
  return record ? normalizeId(record) : null;
}

export async function createMembership(data: MembershipRecord) {
  await createRecords(membershipTable, [data]);
  return null;
}

export async function ensureMembership(userId: number, teamId: number, role: MembershipRecord['role']) {
  const memberships = await listMembershipsByUser(userId);
  const exists = memberships.find((m) => m.team_id === teamId);
  if (exists) return exists;

  const now = new Date().toISOString();
  await createMembership({
    team_id: teamId,
    user_id: userId,
    role,
    email_alerts_enabled: true,
    created_at: now,
  });
  return null;
}

export async function ensureDefaultTeamForUser(userId: number, displayName: string) {
  const memberships = await listMembershipsByUser(userId);
  if (memberships.length > 0) {
    return memberships[0].team_id;
  }

  const teamName = `${displayName}'s Team`;
  const team = await createTeam(teamName, userId);
  if (!team || !team.id) return null;

  await ensureMembership(userId, team.id, 'owner');
  return team.id;
}

export async function updateMembership(id: number, data: Partial<MembershipRecord>) {
  await updateRecords(membershipTable, [{ Id: id, ...data }]);
}

export async function createInvite(teamId: number, email: string, role: InviteRecord['role']) {
  const now = new Date().toISOString();
  await createRecords(inviteTable, [
    { team_id: teamId, email, role, status: 'pending', created_at: now },
  ]);
}

export async function listInvitesByEmail(email: string) {
  const invites = await listRecords<InviteRecord>(inviteTable, {
    where: whereEq('email', email),
    limit: 1000,
  });
  return invites.map(normalizeId);
}

export async function acceptInvite(invite: InviteRecord, userId: number) {
  const id = recordId(invite);
  if (!id) return;
  await updateRecords(inviteTable, [
    {
      Id: id,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    },
  ]);
  await ensureMembership(userId, invite.team_id, invite.role);
}
