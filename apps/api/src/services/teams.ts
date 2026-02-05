import { config } from '../config.js';
import { createRecord, listRecords, updateSingleRecord, updateRecords, deleteRecord } from './directus.js';
import { whereEq } from '../utils/directus.js';
import { hashSecret, randomToken, verifySecret } from './security.js';

export type TeamRecord = {
  id: number;
  name: string;
  owner: number; // FK
  access_password_hash?: string | null;
  password_reset_token?: string | null;
  password_reset_expires_at?: string | null;
  date_created?: string;
};

export type MembershipRecord = {
  id: number;
  team: number; // FK
  user: number; // FK
  role: 'owner' | 'admin' | 'member';
  email_alerts_enabled?: boolean;
  date_created?: string;
};

export type InviteRecord = {
  id: number;
  team: number; // FK
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'accepted' | 'expired';
  code: string;
  expires_at?: string;
  date_created?: string;
};

const teamTable = config.directus.collections.teams as any;
const membershipTable = config.directus.collections.memberships as any;
const inviteTable = config.directus.collections.invites as any;

export async function listTeams() {
  return listRecords<TeamRecord>(teamTable, { limit: 1000 });
}

export async function getTeamById(teamId: number) {
  const teams = await listRecords<TeamRecord>(teamTable, {
    filter: whereEq('id', teamId),
    limit: 1,
  });
  return teams[0] ?? null;
}

export async function getTeamByName(name: string) {
  const teams = await listRecords<TeamRecord>(teamTable, {
    filter: whereEq('name', name),
    limit: 1,
  });
  return teams[0] ?? null;
}

export async function listMembershipsByUser(userId: number) {
  return listRecords<MembershipRecord>(membershipTable, {
    filter: whereEq('user', userId),
    limit: 1000,
  });
}

export async function listMembershipsByTeam(teamId: number) {
  return listRecords<MembershipRecord>(membershipTable, {
    filter: whereEq('team', teamId),
    limit: 1000,
  });
}

export async function createTeam(name: string, ownerId: number) {
  const result = await createRecord(teamTable, { name, owner: ownerId });
  const record = Array.isArray(result) ? result[0] : result;
  return record;
}

export async function updateTeam(teamId: number, data: Partial<TeamRecord>) {
  return updateSingleRecord<TeamRecord>(teamTable, teamId, data);
}

export async function createMembership(data: Partial<MembershipRecord>) {
  await createRecord(membershipTable, data);
  return null;
}

export async function ensureMembership(
  userId: number,
  teamId: number,
  role: MembershipRecord['role']
) {
  const memberships = await listMembershipsByUser(userId);
  const exists = memberships.find((m) => m.team === teamId);
  if (exists) return exists;

  await createMembership({
    team: teamId,
    user: userId,
    role,
    email_alerts_enabled: true,
  });
  return null;
}

export async function ensureDefaultTeamForUser(userId: number, displayName: string) {
  const memberships = await listMembershipsByUser(userId);
  if (memberships.length > 0) {
    return memberships[0].team;
  }

  const teamName = `${displayName}'s Team`;
  const team = await createTeam(teamName, userId);
  if (!team || !team.id) return null;

  await ensureMembership(userId, team.id, 'owner');
  return team.id;
}

export async function setTeamPassword(teamId: number, password: string) {
  const accessPasswordHash = hashSecret(password);
  await updateTeam(teamId, {
    access_password_hash: accessPasswordHash,
    password_reset_token: null,
    password_reset_expires_at: null,
  });
}

export function verifyTeamPassword(team: TeamRecord, password: string) {
  return verifySecret(password, team.access_password_hash);
}

export async function createTeamPasswordResetToken(teamId: number) {
  const token = randomToken(20);
  const expiresAt = new Date(Date.now() + config.teamAccess.resetTtlMinutes * 60 * 1000).toISOString();
  await updateTeam(teamId, {
    password_reset_token: token,
    password_reset_expires_at: expiresAt,
  });
  return { token, expiresAt };
}

export async function getTeamByPasswordResetToken(token: string) {
  const teams = await listRecords<TeamRecord>(teamTable, {
    filter: whereEq('password_reset_token', token),
    limit: 1,
  });
  return teams[0] ?? null;
}

export function isResetTokenExpired(team: TeamRecord) {
  if (!team.password_reset_expires_at) return true;
  return new Date(team.password_reset_expires_at).getTime() < Date.now();
}

export async function updateMembership(id: string, data: Partial<MembershipRecord>) {
  await updateSingleRecord(membershipTable, id, data);
}

export async function createInvite(teamId: number, email: string, role: InviteRecord['role']) {
    const code = Math.random().toString(36).substring(2, 15);
    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await createRecord(inviteTable, { 
        team: teamId, 
        email, 
        role, 
        status: 'pending', 
        code,
        expires_at: expiresAt.toISOString()
    });
}

export async function listInvitesByEmail(email: string) {
  return listRecords<InviteRecord>(inviteTable, {
    filter: whereEq('email', email),
    limit: 1000,
  });
}

export async function acceptInvite(invite: InviteRecord, userId: number) {
  await updateSingleRecord(inviteTable, invite.id, {
      status: 'accepted',
  });
  await ensureMembership(userId, invite.team, invite.role);
}
