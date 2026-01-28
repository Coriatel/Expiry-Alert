import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './config.js';
import { createUser, getUserByGoogleSub, getUserById, toAuthUser, updateUser } from './services/users.js';
import { acceptInvite, ensureDefaultTeamForUser, listInvitesByEmail } from './services/teams.js';

export function configurePassport() {
  passport.serializeUser((user, done) => {
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
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('Google account has no email'));
          }

          const existing = await getUserByGoogleSub(profile.id);
          const now = new Date().toISOString();

          if (existing && existing.id) {
            await updateUser(existing.id, {
              name: profile.displayName,
              avatar_url: profile.photos?.[0]?.value,
              last_login_at: now,
            });
            const authUser = toAuthUser({ ...existing, name: profile.displayName });
            const invites = await listInvitesByEmail(email);
            for (const invite of invites) {
              if (invite.status === 'pending') {
                await acceptInvite(invite, authUser.id);
              }
            }
            await ensureDefaultTeamForUser(authUser.id, authUser.name);
            return done(null, authUser);
          }

          const created = await createUser({
            email,
            name: profile.displayName,
            avatar_url: profile.photos?.[0]?.value,
            google_sub: profile.id,
            created_at: now,
            last_login_at: now,
          });

          if (!created) {
            return done(new Error('Failed to create user'));
          }

          const authUser = toAuthUser(created);

          const invites = await listInvitesByEmail(email);
          for (const invite of invites) {
            if (invite.status === 'pending') {
              await acceptInvite(invite, authUser.id);
            }
          }

          await ensureDefaultTeamForUser(authUser.id, authUser.name);

          return done(null, authUser);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}
