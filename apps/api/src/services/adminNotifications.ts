import { config } from "../config.js";
import { sendEmail } from "./email.js";
import { getTeamById, listMembershipsByTeam } from "./teams.js";
import { getUserById } from "./users.js";

export async function safeSendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
) {
  try {
    await sendEmail(to, subject, text, html);
    return true;
  } catch (error) {
    console.error("Email delivery failed", error);
    return false;
  }
}

export async function notifySystemAdmin(
  subject: string,
  text: string,
  html?: string,
) {
  if (!config.adminEmail) return false;
  return safeSendEmail(config.adminEmail, subject, text, html);
}

export async function listTeamAdminEmails(teamId: number) {
  const team = await getTeamById(teamId);
  const memberships = await listMembershipsByTeam(teamId);
  const ids = new Set<number>();

  if (team?.owner) ids.add(team.owner);
  for (const membership of memberships) {
    if (membership.status === "suspended") continue;
    if (membership.role === "owner" || membership.role === "admin") {
      ids.add(membership.user);
    }
  }

  const users = await Promise.all([...ids].map((id) => getUserById(id)));
  return users
    .map((user) => user?.email?.trim())
    .filter((email): email is string => Boolean(email));
}

export async function notifyTeamAdmins(
  teamId: number,
  subject: string,
  text: string,
  html?: string,
) {
  const recipients = [...new Set(await listTeamAdminEmails(teamId))];
  if (recipients.length === 0) return false;
  return safeSendEmail(recipients.join(", "), subject, text, html);
}
