import { Router } from 'express';
import passport from 'passport';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { ensureDefaultTeamForUser } from '../services/teams.js';

export const authRouter = Router();

const googleBaseScopes = ['profile', 'email'];
const googleCalendarScope = 'https://www.googleapis.com/auth/calendar.events';

authRouter.get('/google', passport.authenticate('google', { scope: googleBaseScopes }));

authRouter.get('/google/callback', (req, res, next) => {
  passport.authenticate(
    'google',
    { failureRedirect: `${config.appBaseUrl}/?auth=failed` },
    async (err, user) => {
      const isCalendarConnect = req.query.state === 'calendar';
      if (err) {
        console.error('Google OAuth error', err);
        if ((err as any)?.oauthError) {
          const oauthError = (err as any).oauthError;
          const data = oauthError?.data;
          const dataString =
            typeof data === 'string'
              ? data
              : data instanceof Buffer
                ? data.toString('utf8')
                : JSON.stringify(data);
          console.error('OAuthError', oauthError.statusCode ?? '', dataString || oauthError);
        }
        if ((err as any)?.data) {
          const data = (err as any).data;
          const dataString =
            typeof data === 'string'
              ? data
              : data instanceof Buffer
                ? data.toString('utf8')
                : JSON.stringify(data);
          console.error('OAuthError data', dataString || data);
        }
        return res.redirect(
          isCalendarConnect ? `${config.appBaseUrl}?calendar=failed` : `${config.appBaseUrl}/?auth=error`
        );
      }
      if (!user) {
        return res.redirect(
          isCalendarConnect ? `${config.appBaseUrl}?calendar=failed` : `${config.appBaseUrl}/?auth=failed`
        );
      }
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          console.error('Google OAuth login error', loginErr);
          return res.redirect(
            isCalendarConnect ? `${config.appBaseUrl}?calendar=failed` : `${config.appBaseUrl}/?auth=error`
          );
        }
        const teamId = await ensureDefaultTeamForUser(user.id, user.name);
        if (teamId) {
          req.session.teamId = teamId;
        }
        if (isCalendarConnect) {
          const current = req.session.googleCalendar;
          const accessToken = user.google_access_token;
          const refreshToken = user.google_refresh_token ?? current?.refreshToken ?? null;

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
    }
  )(req, res, next);
});

authRouter.get(
  '/google/calendar',
  requireAuth,
  passport.authenticate('google', {
    scope: [...googleBaseScopes, googleCalendarScope],
    accessType: 'offline',
    prompt: 'consent',
    includeGrantedScopes: true,
    state: 'calendar',
  } as any)
);

authRouter.post('/logout', requireAuth, (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.status(204).send();
    });
  });
});

authRouter.get('/me', (req, res) => {
  if (!(req.isAuthenticated && req.isAuthenticated())) {
    return res.json(null);
  }

  return res.json({
    ...req.user,
    team_id: req.session.teamId ?? null,
  });
});
