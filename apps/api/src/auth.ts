import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './config.js';
import {
  createUser,
  getUserByEmail,
  getUserByGoogleSub,
  getUserById,
  toAuthUser,
  updateUser,
} from './services/users.js';
import { acceptInvite, listInvitesByEmail, listMembershipsByUser } from './services/teams.js';
import { listPendingJoinRequestsByUser } from './services/joinRequests.js';
import { logAdminEvent } from './services/adminEvents.js';
import { notifySystemAdmin } from './services/adminNotifications.js';

export function configurePassport() {
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const record = await getUserById(id);
      if (!record) return done(null, false);
      return done(null, toAuthUser(record));
    } catch (err) {
      return done(err as Error);
    }
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const rawEmail = profile.emails?.[0]?.value;
          if (!rawEmail) {
            return done(new Error('Google account has no email'));
          }
          const email = rawEmail.toLowerCase();

          const existing =
            (await getUserByGoogleSub(profile.id)) ??
            (await getUserByEmail(email));
          const now = new Date().toISOString();

          if (existing && existing.id) {
            await updateUser(existing.id, {
              display_name: profile.displayName,
              name: profile.displayName,
              avatar_url: profile.photos?.[0]?.value,
              google_id: profile.id,
              last_login: now,
              updatedAt: now,
            });
            // Update the display_name in memory for the session
            const authUser = {
              ...toAuthUser({
                ...existing,
                display_name: profile.displayName,
                name: profile.displayName,
                google_id: profile.id,
              }),
              google_access_token: accessToken,
              google_refresh_token: refreshToken ?? null,
            };
            
            const invites = await listInvitesByEmail(email);
            for (const invite of invites) {
              if (invite.status === 'pending') {
                await acceptInvite(invite, authUser.id);
              }
            }

            const memberships = await listMembershipsByUser(authUser.id);
            const pendingJoinRequests = await listPendingJoinRequestsByUser(authUser.id);
            if (memberships.length === 0 && pendingJoinRequests.length > 0) {
              console.log(
                `Google user ${authUser.email} has pending join requests and no active team`,
              );
            }
            return done(null, authUser);
          }

          const created = await createUser({
            email,
            display_name: profile.displayName,
            name: profile.displayName,
            avatar_url: profile.photos?.[0]?.value,
            google_id: profile.id,
            last_login: now,
            updatedAt: now,
            isActive: true,
            role: 'USER',
          });

          if (!created) {
            return done(new Error('Failed to create user'));
          }

          const authUser = {
            ...toAuthUser(created),
            google_access_token: accessToken,
            google_refresh_token: refreshToken ?? null,
          };

          const invites = await listInvitesByEmail(email);
          for (const invite of invites) {
            if (invite.status === 'pending') {
              await acceptInvite(invite, authUser.id);
            }
          }

          void logAdminEvent({
            eventType: 'google_user_registered',
            message: `Google sign-up completed for ${authUser.email}`,
            userId: authUser.id,
            metadata: {
              provider: 'google',
            },
          }).catch((error) => {
            console.error('Failed to log Google user registration event', error);
          });

          void notifySystemAdmin(
            `Expiry Alert: Google sign-up for ${authUser.email}`,
            `A new Google user signed up for Expiry Alert.\n\nEmail: ${authUser.email}\nName: ${authUser.name}`,
            `<p>A new Google user signed up for Expiry Alert.</p><p><strong>${authUser.name}</strong><br />${authUser.email}</p>`,
          ).catch((error) => {
            console.error('Failed to notify system admin about Google sign-up', error);
          });

          return done(null, authUser);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}
