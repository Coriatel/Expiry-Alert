import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { sendEmail } from "../services/email.js";
import { logAdminEvent } from "../services/adminEvents.js";
import {
  notifySystemAdmin,
  notifyTeamAdmins,
} from "../services/adminNotifications.js";
import {
  createJoinRequest,
  getJoinRequestById,
  getPendingJoinRequestByUserAndTeam,
  listJoinRequestsByTeam,
  updateJoinRequestStatus,
} from "../services/joinRequests.js";
import {
  createInvite,
  createMembership,
  createTeamAutoApproved,
  createTeamPasswordResetToken,
  ensureMembership,
  getTeamById,
  getTeamByName,
  getTeamByPasswordResetToken,
  isResetTokenExpired,
  listMembershipsByTeam,
  listMembershipsByUser,
  listTeams,
  setTeamPassword,
  updateMembershipStatus,
  verifyTeamPassword,
} from "../services/teams.js";
import {
  getUserByEmail,
  getUserById,
  getUserDisplayName,
} from "../services/users.js";
import { getTeamId } from "../utils/team.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const teamsRouter = Router();

async function requireTeamAdmin(userId: number, teamId: number) {
  const memberships = await listMembershipsByUser(userId);
  return memberships.find(
    (membership) =>
      membership.team === teamId &&
      membership.status !== "suspended" &&
      (membership.role === "owner" || membership.role === "admin"),
  );
}

teamsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const memberships = await listMembershipsByUser(user.id);
    const teams = await listTeams();
    const membershipByTeam = new Map(memberships.map((m) => [m.team, m]));
    const userTeams = teams
      .filter((team) => team.id && membershipByTeam.has(team.id))
      .map((team) => ({
        ...team,
        role: membershipByTeam.get(team.id!)?.role ?? "member",
      }));

    res.json({
      teams: userTeams,
      currentTeamId: req.session.teamId ?? null,
    });
  }),
);

teamsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const parsed = z.object({ name: z.string().trim().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const existing = await getTeamByName(parsed.data.name);
    if (existing?.id) {
      return res.status(409).json({ error: "Team name already exists" });
    }

    const team = await createTeamAutoApproved(parsed.data.name, user.id);
    if (!team?.id) {
      return res.status(500).json({ error: "Failed to create team" });
    }

    req.session.teamId = team.id;

    void Promise.allSettled([
      logAdminEvent({
        eventType: "team_created",
        message: `Team "${team.name}" created by ${user.email}`,
        userId: user.id,
        teamId: team.id,
      }),
      notifySystemAdmin(
        `Expiry Alert: team created - ${team.name}`,
        `A new Expiry Alert team was created.\n\nTeam: ${team.name}\nOwner: ${user.name} <${user.email}>`,
      ),
    ]);

    res.status(201).json(team);
  }),
);

teamsRouter.post(
  "/switch",
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const parsed = z.object({ teamId: z.coerce.number() }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const memberships = await listMembershipsByUser(user.id);
    const allowed = memberships.some(
      (membership) =>
        membership.team === parsed.data.teamId &&
        membership.status !== "suspended",
    );
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    req.session.teamId = parsed.data.teamId;
    res.status(204).send();
  }),
);

teamsRouter.post(
  "/join-with-password",
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const parsed = z
      .object({
        teamName: z.string().trim().min(1),
        password: z.string().min(6),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const team = await getTeamByName(parsed.data.teamName);
    if (!team?.id) return res.status(404).json({ error: "Team not found" });

    if (!verifyTeamPassword(team, parsed.data.password)) {
      return res.status(403).json({ error: "Invalid team password" });
    }

    await ensureMembership(user.id, team.id, "member");
    req.session.teamId = team.id;
    return res.status(200).json({ teamId: team.id, teamName: team.name });
  }),
);

teamsRouter.post(
  "/join-requests",
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const parsed = z
      .object({
        teamId: z.coerce.number().optional(),
        teamName: z.string().trim().min(1).optional(),
        message: z.string().trim().max(500).optional(),
      })
      .refine((value) => value.teamId || value.teamName, {
        message: "Team name or team ID is required",
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const resolvedTeam =
      parsed.data.teamId != null
        ? await getTeamById(parsed.data.teamId)
        : await getTeamByName(parsed.data.teamName!);
    if (!resolvedTeam?.id) {
      return res.status(404).json({ error: "Team not found" });
    }

    const memberships = await listMembershipsByUser(user.id);
    const existingMembership = memberships.find(
      (membership) =>
        membership.team === resolvedTeam.id && membership.status !== "suspended",
    );
    if (existingMembership) {
      req.session.teamId = resolvedTeam.id;
      return res.status(200).json({
        teamId: resolvedTeam.id,
        teamName: resolvedTeam.name,
        status: "already-member",
      });
    }

    const existingRequest = await getPendingJoinRequestByUserAndTeam(
      user.id,
      resolvedTeam.id,
    );
    if (!existingRequest) {
      await createJoinRequest(resolvedTeam.id, user.id, parsed.data.message);

      void Promise.allSettled([
        logAdminEvent({
          eventType: "join_request_submitted",
          message: `${user.email} requested access to team "${resolvedTeam.name}"`,
          userId: user.id,
          teamId: resolvedTeam.id,
          metadata: { message: parsed.data.message?.trim() || null },
        }),
        notifyTeamAdmins(
          resolvedTeam.id,
          `Expiry Alert: join request for ${resolvedTeam.name}`,
          `${user.name} (${user.email}) requested access to "${resolvedTeam.name}".\n\nMessage: ${parsed.data.message?.trim() || "(none)"}`,
        ),
        notifySystemAdmin(
          `Expiry Alert: join request for ${resolvedTeam.name}`,
          `${user.name} (${user.email}) requested access to "${resolvedTeam.name}".`,
        ),
      ]);
    }

    res.status(existingRequest ? 200 : 201).json({
      teamId: resolvedTeam.id,
      teamName: resolvedTeam.name,
      status: "pending",
    });
  }),
);

teamsRouter.post(
  "/:teamId/password",
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const teamId = Number(req.params.teamId);
    if (!Number.isFinite(teamId)) {
      return res.status(400).json({ error: "Invalid team" });
    }

    const parsed = z
      .object({
        password: z.string().min(6).max(128),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const membership = await requireTeamAdmin(user.id, teamId);
    if (!membership) {
      return res
        .status(403)
        .json({ error: "Only team admins can change team password" });
    }

    await setTeamPassword(teamId, parsed.data.password);
    return res.status(204).send();
  }),
);

teamsRouter.post(
  "/password/forgot",
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const parsed = z
      .object({
        teamName: z.string().trim().min(1),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const team = await getTeamByName(parsed.data.teamName);
    if (!team?.id) return res.status(404).json({ error: "Team not found" });

    const memberships = await listMembershipsByUser(user.id);
    const allowed = memberships.some((membership) => membership.team === team.id);
    if (!allowed) {
      return res
        .status(403)
        .json({ error: "Only team members can request reset email" });
    }

    const owner = await getUserById(team.owner);
    if (!owner?.email) {
      return res
        .status(500)
        .json({ error: "Team owner email is not available" });
    }

    const { token } = await createTeamPasswordResetToken(team.id);
    const resetBase = config.apiBaseUrl || config.appBaseUrl;
    const resetLink = `${resetBase.replace(/\/+$/, "")}/api/teams/password/reset?token=${encodeURIComponent(token)}`;

    try {
      await sendEmail(
        owner.email,
        `Expiry Alert: reset team password for "${team.name}"`,
        `A password reset was requested for team "${team.name}". Reset link: ${resetLink}`,
        `<p>A password reset was requested for team <strong>${team.name}</strong>.</p><p><a href="${resetLink}">Reset team password</a></p>`,
      );
    } catch (err) {
      console.error("Failed to send team reset email", err);
      return res.status(500).json({
        error: "Failed to send reset email. Please contact administrator.",
      });
    }

    return res.status(204).send();
  }),
);

teamsRouter.get("/password/reset", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) return res.status(400).send("Missing reset token");

  const escapedToken = token.replace(/"/g, "&quot;");
  return res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reset Team Password</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    main { max-width: 460px; margin: 64px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; }
    h1 { margin: 0 0 16px; font-size: 22px; }
    label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; }
    input { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 12px; }
    button { border: 0; background: #2563eb; color: #fff; border-radius: 8px; padding: 10px 14px; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .msg { margin-top: 12px; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>Reset Team Password</h1>
    <label for="password">New password</label>
    <input id="password" type="password" minlength="6" maxlength="128" required />
    <button id="submit">Save new password</button>
    <div class="msg" id="msg"></div>
  </main>
  <script>
    const token = "${escapedToken}";
    const button = document.getElementById('submit');
    const passwordInput = document.getElementById('password');
    const msg = document.getElementById('msg');
    button.addEventListener('click', async () => {
      const password = passwordInput.value.trim();
      if (password.length < 6) {
        msg.textContent = 'Password must be at least 6 characters.';
        return;
      }
      button.disabled = true;
      msg.textContent = 'Saving...';
      try {
        const response = await fetch('/api/teams/password/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to reset password');
        }
        msg.textContent = 'Team password updated. You can return to the app.';
      } catch (error) {
        msg.textContent = error.message || 'Failed to reset password';
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>`);
});

teamsRouter.post(
  "/password/reset",
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({
        token: z.string().min(8),
        password: z.string().min(6).max(128),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const team = await getTeamByPasswordResetToken(parsed.data.token);
    if (!team?.id) {
      return res.status(400).json({ error: "Invalid reset token" });
    }
    if (isResetTokenExpired(team)) {
      return res.status(400).json({ error: "Reset token expired" });
    }

    await setTeamPassword(team.id, parsed.data.password);
    return res.status(204).send();
  }),
);

teamsRouter.get(
  "/members",
  asyncHandler(async (req, res) => {
    const teamId = getTeamId(req);
    if (!teamId) return res.status(400).json({ error: "Missing team" });

    const memberships = await listMembershipsByTeam(teamId);
    const enrichedMembers = await Promise.all(
      memberships.map(async (membership) => {
        const user = await getUserById(membership.user);
        return {
          id: membership.id,
          user_id: membership.user,
          name: user ? getUserDisplayName(user) : "Unknown",
          email: user?.email ?? "",
          role: membership.role,
          status: membership.status ?? "active",
          date_created: membership.date_created,
        };
      }),
    );

    res.json({ members: enrichedMembers });
  }),
);

teamsRouter.get(
  "/:teamId/join-requests",
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const teamId = Number(req.params.teamId);
    if (!Number.isFinite(teamId)) {
      return res.status(400).json({ error: "Invalid team" });
    }

    const membership = await requireTeamAdmin(user.id, teamId);
    if (!membership) return res.status(403).json({ error: "Forbidden" });

    const requests = await listJoinRequestsByTeam(teamId, "pending");
    const enriched = await Promise.all(
      requests.map(async (request) => {
        const requester = await getUserById(request.requester);
        return {
          id: request.id,
          team_id: request.team,
          requester_id: request.requester,
          requester_name: requester
            ? getUserDisplayName(requester)
            : "Unknown",
          requester_email: requester?.email ?? "",
          message: request.requester_message ?? null,
          status: request.status,
          created_at: request.created_at,
        };
      }),
    );

    res.json({ requests: enriched });
  }),
);

teamsRouter.patch(
  "/:teamId/join-requests/:requestId",
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const teamId = Number(req.params.teamId);
    const requestId = Number(req.params.requestId);
    if (!Number.isFinite(teamId) || !Number.isFinite(requestId)) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    const parsed = z
      .object({
        action: z.enum(["approve", "reject"]),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const membership = await requireTeamAdmin(user.id, teamId);
    if (!membership) return res.status(403).json({ error: "Forbidden" });

    const joinRequest = await getJoinRequestById(requestId);
    if (!joinRequest || joinRequest.team !== teamId) {
      return res.status(404).json({ error: "Join request not found" });
    }
    if (joinRequest.status !== "pending") {
      return res.status(409).json({ error: "Join request already processed" });
    }

    const requester = await getUserById(joinRequest.requester);
    const team = await getTeamById(teamId);
    if (!requester?.email || !team?.name) {
      return res.status(500).json({ error: "Request data is incomplete" });
    }

    if (parsed.data.action === "approve") {
      const requesterMemberships = await listMembershipsByUser(joinRequest.requester);
      const existingMembership = requesterMemberships.find(
        (item) => item.team === teamId,
      );

      if (existingMembership?.status === "suspended") {
        await updateMembershipStatus(existingMembership.id, "active");
      } else {
        await ensureMembership(joinRequest.requester, teamId, "member");
      }
    }

    const nextStatus =
      parsed.data.action === "approve" ? "approved" : "rejected";
    await updateJoinRequestStatus(requestId, nextStatus, user.id);

    void Promise.allSettled([
      logAdminEvent({
        eventType:
          nextStatus === "approved"
            ? "join_request_approved"
            : "join_request_rejected",
        message: `${requester.email} join request for "${team.name}" was ${nextStatus}`,
        userId: joinRequest.requester,
        teamId,
        metadata: {
          reviewer_id: user.id,
          reviewer_email: user.email,
        },
      }),
      notifySystemAdmin(
        `Expiry Alert: join request ${nextStatus}`,
        `${requester.email} join request for "${team.name}" was ${nextStatus} by ${user.email}.`,
      ),
      sendEmail(
        requester.email,
        `Expiry Alert: your request for ${team.name} was ${nextStatus}`,
        nextStatus === "approved"
          ? `Your request to join "${team.name}" was approved. You can sign in and start working.`
          : `Your request to join "${team.name}" was declined.`,
        nextStatus === "approved"
          ? `<p>Your request to join <strong>${team.name}</strong> was approved.</p><p>You can sign in and start working.</p>`
          : `<p>Your request to join <strong>${team.name}</strong> was declined.</p>`,
      ),
    ]);

    res.json({ status: nextStatus });
  }),
);

teamsRouter.patch(
  "/:teamId/members/:membershipId",
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const teamId = Number(req.params.teamId);
    const membershipId = Number(req.params.membershipId);
    if (!Number.isFinite(teamId) || !Number.isFinite(membershipId)) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    const parsed = z
      .object({
        status: z.enum(["active", "suspended"]),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const requesterMembership = await requireTeamAdmin(user.id, teamId);
    if (!requesterMembership) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const teamMemberships = await listMembershipsByTeam(teamId);
    const target = teamMemberships.find((membership) => membership.id === membershipId);
    if (!target) {
      return res.status(404).json({ error: "Membership not found" });
    }

    if (target.role === "owner") {
      return res.status(403).json({ error: "Cannot suspend team owner" });
    }
    if (target.user === user.id) {
      return res.status(403).json({ error: "Cannot suspend yourself" });
    }

    await updateMembershipStatus(membershipId, parsed.data.status);
    return res.json({ status: parsed.data.status });
  }),
);

teamsRouter.post(
  "/:teamId/members",
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const parsed = z
      .object({
        email: z.string().trim().email(),
        role: z.enum(["owner", "admin", "member"]).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const teamId = Number(req.params.teamId);
    if (!Number.isFinite(teamId)) {
      return res.status(400).json({ error: "Invalid team" });
    }

    const current = await requireTeamAdmin(user.id, teamId);
    if (!current) return res.status(403).json({ error: "Forbidden" });

    const invitedUser = await getUserByEmail(parsed.data.email.toLowerCase());
    const role = parsed.data.role ?? "member";

    if (invitedUser?.id) {
      const teamMemberships = await listMembershipsByTeam(teamId);
      const existingMembership = teamMemberships.find(
        (membership) => membership.user === invitedUser.id,
      );

      if (existingMembership?.status === "suspended") {
        await updateMembershipStatus(existingMembership.id, "active");
      } else if (!existingMembership) {
        await createMembership({
          team: teamId,
          user: invitedUser.id,
          role,
          email_alerts_enabled: true,
        });
      }

      return res.status(201).json({ status: "added" });
    }

    await createInvite(teamId, parsed.data.email.toLowerCase(), role);
    res.status(201).json({ status: "invited" });
  }),
);
