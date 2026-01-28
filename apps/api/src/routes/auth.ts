import { Router } from 'express';
import passport from 'passport';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { ensureDefaultTeamForUser } from '../services/teams.js';

export const authRouter = Router();

authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

authRouter.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${config.appBaseUrl}/?auth=failed` }),
  async (req, res) => {
    if (req.user) {
      const teamId = await ensureDefaultTeamForUser(req.user.id, req.user.name);
      if (teamId) {
        req.session.teamId = teamId;
      }
    }
    res.redirect(config.appBaseUrl);
  }
);

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
