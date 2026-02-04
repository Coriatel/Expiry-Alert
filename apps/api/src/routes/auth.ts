import { Router } from 'express';
import passport from 'passport';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { ensureDefaultTeamForUser } from '../services/teams.js';

export const authRouter = Router();

authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

authRouter.get('/google/callback', (req, res, next) => {
  passport.authenticate(
    'google',
    { failureRedirect: `${config.appBaseUrl}/?auth=failed` },
    async (err, user) => {
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
        return res.redirect(`${config.appBaseUrl}/?auth=error`);
      }
      if (!user) {
        return res.redirect(`${config.appBaseUrl}/?auth=failed`);
      }
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          console.error('Google OAuth login error', loginErr);
          return res.redirect(`${config.appBaseUrl}/?auth=error`);
        }
        const teamId = await ensureDefaultTeamForUser(user.id, user.name);
        if (teamId) {
          req.session.teamId = teamId;
        }
        res.redirect(config.appBaseUrl);
      });
    }
  )(req, res, next);
});

authRouter.post('/logout', requireAuth, (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.status(204).send();
    });
  });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({
    ...req.user,
    team_id: req.session.teamId ?? null,
  });
});
