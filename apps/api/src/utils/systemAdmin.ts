import { config } from "../config.js";

export function isSystemAdminEmail(email?: string | null) {
  const candidate = email?.trim().toLowerCase();
  const adminEmail = config.adminEmail?.trim().toLowerCase();

  return Boolean(candidate && adminEmail && candidate === adminEmail);
}
