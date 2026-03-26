import { Router } from "express";
import passport from "passport";
import { z } from "zod";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createTeamAutoApproved,
  ensureMembership,
  getTeamById,
  getTeamByName,
  listMembershipsByUser,
  verifyTeamPassword,
} from "../services/teams.js";
import {
  buildPasswordUpgradePatch,
  createUserWithPassword,
  getUserByEmail,
  getUserById,
  toAuthUser,
  updateUser,
  verifyUserPassword,
} from "../services/users.js";
import { listReagents } from "../services/reagents.js";
import {
  createJoinRequest,
  getPendingJoinRequestByUserAndTeam,
  listPendingJoinRequestsByUser,
} from "../services/joinRequests.js";
import { logAdminEvent } from "../services/adminEvents.js";
import {
  notifySystemAdmin,
  notifyTeamAdmins,
} from "../services/adminNotifications.js";
import { isSystemAdminEmail } from "../utils/systemAdmin.js";

export const authRouter = Router();

const googleBaseScopes = ["profile", "email"];
const googleCalendarScope =
  "https://www.googleapis.com/auth/calendar.events";

type SessionAuthUser = ReturnType<typeof toAuthUser> & {
  team_id: number | null;
  team_approved: boolean;
  membership_status?: string;
  needsTeam: boolean;
  is_system_admin: boolean;
  pending_join_request: {
    id: number;
    team_id: number;
    team_name: string;
    created_at?: string;
    requester_message?: string | null;
  } | null;
};

async function pickPreferredTeamId(
  activeMemberships: Awaited<ReturnType<typeof listMembershipsByUser>>,
  requestedTeamId: number | null,
) {
  const teamIds = activeMemberships
    .map((membership) => membership.team)
    .filter((teamId): teamId is number => Number.isFinite(teamId));

  if (teamIds.length === 0) {
    return null;
  }

  const activeReagentCount = async (teamId: number) => {
    const reagents = await listReagents(teamId);
    return reagents.filter((reagent) => !reagent.is_archived).length;
  };

  if (requestedTeamId && teamIds.includes(requestedTeamId)) {
    if ((await activeReagentCount(requestedTeamId)) > 0) {
      return requestedTeamId;
    }
  }

  for (const teamId of teamIds) {
    if (teamId === requestedTeamId) continue;
    if ((await activeReagentCount(teamId)) > 0) {
      return teamId;
    }
  }

  return requestedTeamId && teamIds.includes(requestedTeamId)
    ? requestedTeamId
    : teamIds[0];
}

async function buildSessionAuthUser(
  req: Parameters<typeof requireAuth>[0],
  userId: number,
): Promise<SessionAuthUser> {
  const record = await getUserById(userId);
  if (!record) {
    throw new Error(`User ${userId} not found`);
  }

  const authUser = toAuthUser(record);
  const memberships = await listMembershipsByUser(userId);
  const activeMemberships = memberships.filter((m) => m.status !== "suspended");

  let teamId = req.session.teamId ?? null;
  if (teamId && !activeMemberships.some((membership) => membership.team === teamId)) {
    req.session.teamId = undefined;
    teamId = null;
  }

  const preferredTeamId = await pickPreferredTeamId(activeMemberships, teamId);
  if (preferredTeamId && preferredTeamId !== teamId) {
    teamId = preferredTeamId;
    req.session.teamId = teamId;
  }

  let teamApproved = true;
  let membershipStatus: string | undefined = "active";

  if (teamId) {
    const team = await getTeamById(teamId);
    teamApproved = team?.approved !== false;
    const membership = memberships.find((item) => item.team === teamId);
    membershipStatus = membership?.status ?? "active";
  }

  let pendingJoinRequest: SessionAuthUser["pending_join_request"] = null;
  if (!teamId) {
    const pendingRequests = await listPendingJoinRequestsByUser(userId);
    const current = pendingRequests[0];
    if (current) {
      const team = await getTeamById(current.team);
      pendingJoinRequest = {
        id: current.id,
        team_id: current.team,
        team_name: team?.name ?? `Team ${current.team}`,
        created_at: current.created_at,
        requester_message: current.requester_message ?? null,
      };
    }
  }

  return {
    ...authUser,
    team_id: teamId,
    team_approved: teamApproved,
    membership_status: membershipStatus,
    needsTeam: !teamId,
    is_system_admin: isSystemAdminEmail(authUser.email),
    pending_join_request: pendingJoinRequest,
  };
}

async function logAndNotifyRegistration(input: {
  userId: number;
  email: string;
  name: string;
  provider: "password" | "google";
}) {
  const eventType =
    input.provider === "google"
      ? "google_user_registered"
      : "user_registered";
  const providerLabel =
    input.provider === "google" ? "Google sign-up" : "Email registration";

  await Promise.allSettled([
    logAdminEvent({
      eventType,
      message: `${providerLabel} completed for ${input.email}`,
      userId: input.userId,
      metadata: { provider: input.provider },
    }),
    notifySystemAdmin(
      `Expiry Alert: ${providerLabel} for ${input.email}`,
      `${providerLabel} completed.\n\nName: ${input.name}\nEmail: ${input.email}`,
      `<p>${providerLabel} completed.</p><p><strong>${input.name}</strong><br />${input.email}</p>`,
    ),
  ]);
}

authRouter.get(
  "/google",
  passport.authenticate("google", { scope: googleBaseScopes }),
);

authRouter.get("/google/callback", (req, res, next) => {
  passport.authenticate(
    "google",
    { failureRedirect: `${config.appBaseUrl}/?auth=failed` },
    async (err, user) => {
      const isCalendarConnect = req.query.state === "calendar";
      if (err) {
        console.error("Google OAuth error", err);
        return res.redirect(
          isCalendarConnect
            ? `${config.appBaseUrl}?calendar=failed`
            : `${config.appBaseUrl}/?auth=error`,
        );
      }

      if (!user) {
        return res.redirect(
          isCalendarConnect
            ? `${config.appBaseUrl}?calendar=failed`
            : `${config.appBaseUrl}/?auth=failed`,
        );
      }

      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          console.error("Google OAuth login error", loginErr);
          return res.redirect(
            isCalendarConnect
              ? `${config.appBaseUrl}?calendar=failed`
              : `${config.appBaseUrl}/?auth=error`,
          );
        }

        if (isCalendarConnect) {
          const current = req.session.googleCalendar;
          const accessToken = user.google_access_token;
          const refreshToken =
            user.google_refresh_token ?? current?.refreshToken ?? null;

          if (!accessToken) {
            return res.redirect(`${config.appBaseUrl}?calendar=failed`);
          }

          req.session.googleCalendar = {
            accessToken,
            refreshToken,
            scope: user.google_scope ?? current?.scope ?? null,
            expiresAt: Date.now() + 55 * 60 * 1000,
          };
          return res.redirect(`${config.appBaseUrl}?calendar=connected`);
        }

        return res.redirect(config.appBaseUrl);
      });
    },
  )(req, res, next);
});

authRouter.get(
  "/google/calendar",
  requireAuth,
  passport.authenticate("google", {
    scope: [...googleBaseScopes, googleCalendarScope],
    accessType: "offline",
    prompt: "consent",
    includeGrantedScopes: true,
    state: "calendar",
  } as any),
);

const registerSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().max(20).optional(),
  password: z.string().min(6).max(128),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      });
    }

    const { first_name, last_name, email, phone, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await createUserWithPassword({
      email: normalizedEmail,
      password,
      first_name,
      last_name,
      phone,
    });
    if (!user) {
      return res.status(500).json({ error: "Failed to create user" });
    }

    const authUser = toAuthUser(user);
    await new Promise<void>((resolve, reject) => {
      req.logIn(authUser, (error) => (error ? reject(error) : resolve()));
    });

    void logAndNotifyRegistration({
      userId: authUser.id,
      email: authUser.email,
      name: authUser.name,
      provider: "password",
    });

    return res.status(201).json(await buildSessionAuthUser(req, authUser.id));
  }),
);

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.password_hash && !user.password) {
      return res
        .status(401)
        .json({ error: "This account uses Google sign-in" });
    }

    const verification = verifyUserPassword(user, password);
    if (!verification.valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const now = new Date().toISOString();
    if (verification.needsUpgrade) {
      await updateUser(user.id, buildPasswordUpgradePatch(password));
    } else {
      await updateUser(user.id, { last_login: now, updatedAt: now });
    }

    const authUser = toAuthUser(user);
    await new Promise<void>((resolve, reject) => {
      req.logIn(authUser, (error) => (error ? reject(error) : resolve()));
    });

    return res.json(await buildSessionAuthUser(req, authUser.id));
  }),
);

const selectTeamSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("join"),
    teamName: z.string().trim().min(1),
    password: z.string().min(1),
  }),
  z.object({
    action: z.literal("create"),
    teamName: z.string().trim().min(1),
    joinPassword: z.string().min(6),
  }),
  z.object({
    action: z.literal("request"),
    teamName: z.string().trim().min(1),
    message: z.string().trim().max(500).optional(),
  }),
]);

authRouter.post(
  "/select-team",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const parsed = selectTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      });
    }

    const data = parsed.data;
    const team = await getTeamByName(data.teamName);

    if (data.action === "join") {
      if (!team?.id) {
        return res.status(404).json({ error: "Team not found" });
      }
      if (!verifyTeamPassword(team, data.password)) {
        return res.status(403).json({ error: "Wrong password" });
      }

      await ensureMembership(user.id, team.id, "member");
      req.session.teamId = team.id;
      return res.json({
        teamId: team.id,
        teamName: team.name,
        approved: true,
      });
    }

    if (data.action === "create") {
      if (team) {
        return res.status(409).json({ error: "Team name already exists" });
      }

      const createdTeam = await createTeamAutoApproved(
        data.teamName,
        user.id,
        data.joinPassword,
      );
      if (!createdTeam?.id) {
        return res.status(500).json({ error: "Failed to create team" });
      }

      req.session.teamId = createdTeam.id;

      void Promise.allSettled([
        logAdminEvent({
          eventType: "team_created",
          message: `Team "${createdTeam.name}" created by ${user.email}`,
          userId: user.id,
          teamId: createdTeam.id,
        }),
        notifySystemAdmin(
          `Expiry Alert: team created - ${createdTeam.name}`,
          `A new Expiry Alert team was created.\n\nTeam: ${createdTeam.name}\nOwner: ${user.name} <${user.email}>`,
          `<p>A new Expiry Alert team was created.</p><p><strong>${createdTeam.name}</strong><br />Owner: ${user.name} (${user.email})</p>`,
        ),
      ]);

      return res.status(201).json({
        teamId: createdTeam.id,
        teamName: createdTeam.name,
        approved: true,
      });
    }

    if (!team?.id) {
      return res.status(404).json({ error: "Team not found" });
    }

    const memberships = await listMembershipsByUser(user.id);
    const existingMembership = memberships.find(
      (membership) => membership.team === team.id && membership.status !== "suspended",
    );
    if (existingMembership) {
      req.session.teamId = team.id;
      return res.json({
        teamId: team.id,
        teamName: team.name,
        approved: true,
      });
    }

    const existingRequest = await getPendingJoinRequestByUserAndTeam(
      user.id,
      team.id,
    );
    if (!existingRequest) {
      await createJoinRequest(team.id, user.id, data.message);

      void Promise.allSettled([
        logAdminEvent({
          eventType: "join_request_submitted",
          message: `${user.email} requested access to team "${team.name}"`,
          userId: user.id,
          teamId: team.id,
          metadata: {
            message: data.message?.trim() || null,
          },
        }),
        notifyTeamAdmins(
          team.id,
          `Expiry Alert: join request for ${team.name}`,
          `${user.name} (${user.email}) requested access to "${team.name}".\n\nMessage: ${data.message?.trim() || "(none)"}`,
          `<p><strong>${user.name}</strong> (${user.email}) requested access to <strong>${team.name}</strong>.</p><p>Message: ${data.message?.trim() || "(none)"}</p>`,
        ),
        notifySystemAdmin(
          `Expiry Alert: join request for ${team.name}`,
          `${user.name} (${user.email}) requested access to "${team.name}".`,
        ),
      ]);
    }

    return res.status(existingRequest ? 200 : 201).json({
      teamId: team.id,
      teamName: team.name,
      approved: false,
      pendingRequest: true,
    });
  }),
);

authRouter.get("/approve-team", (_req, res) => {
  return res.type("html").send(`
    <html>
      <body style="font-family:Arial;text-align:center;padding:60px">
        <h1>Teams are approved automatically</h1>
        <p>The old manual approval flow is no longer used.</p>
      </body>
    </html>
  `);
});

authRouter.post("/logout", requireAuth, (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.status(204).send();
    });
  });
});

authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    delete req.headers["if-none-match"];
    delete req.headers["if-modified-since"];
    res.set({
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    });

    if (!(req.isAuthenticated && req.isAuthenticated()) || !req.user) {
      return res.json(null);
    }

    const user = req.user as { id: number };
    return res.json(await buildSessionAuthUser(req, user.id));
  }),
);
