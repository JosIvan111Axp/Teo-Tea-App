// Progreso personal: eventos de uso y logros.
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import {
  COUNTER_TYPES,
  EVENT_TYPES,
  evaluateAchievements,
  incrementCounter,
  recordDay,
  recordEvent,
} from '../achievements.js';

const router = Router();
router.use(requireAuth);

/**
 * Registra un evento y devuelve los logros recién desbloqueados.
 * body: { event: 'visit', ref: 'biblioteca' } | { event: 'music_play' } | { event: 'songs_imported', amount: 3 }
 *       | { event: 'day' } | { event: 'check' }
 */
router.post('/events', async (req, res, next) => {
  try {
    const event = String(req.body.event ?? '');
    const ref = String(req.body.ref ?? '').toLowerCase().slice(0, 60);

    if (event === 'day') await recordDay(req.user.id);
    else if (event in COUNTER_TYPES) {
      const amount = Math.max(1, Math.min(COUNTER_TYPES[event], Math.floor(Number(req.body.amount) || 1)));
      await incrementCounter(req.user.id, event, amount);
    } else if (event in EVENT_TYPES) {
      if (!EVENT_TYPES[event](ref)) return res.status(400).json({ error: 'Evento no válido.' });
      await recordEvent(req.user.id, event, ref);
    } else if (event !== 'check') {
      return res.status(400).json({ error: 'Evento no válido.' });
    }

    const summary = await evaluateAchievements(req.user.id);
    return res.json({
      level: summary.level,
      title: summary.title,
      xp: summary.xp,
      newlyUnlocked: summary.newlyUnlocked,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/achievements', async (req, res, next) => {
  try {
    res.json(await evaluateAchievements(req.user.id));
  } catch (error) {
    next(error);
  }
});

export default router;
