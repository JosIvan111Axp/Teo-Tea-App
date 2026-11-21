import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '7d';

export const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });

const parseJsonList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

/** Convierte una fila de `users` al formato que usa la app (sin el hash de la contraseña). */
export const toPublicUser = (row) => ({
  id: String(row.id),
  email: row.email,
  username: row.username,
  name: row.name,
  role: row.role,
  profession: row.profession ?? '',
  birthdate: row.birthdate ?? '',
  city: row.city ?? '',
  country: row.country ?? '',
  bio: row.bio ?? '',
  skills: parseJsonList(row.skills),
  interests: parseJsonList(row.interests),
  accountType: row.account_type ?? 'user',
  startPage: row.start_page ?? 'inicio',
  communityRulesAccepted: Boolean(row.community_rules_accepted_at),
  communityFrozenUntil: isCommunityFrozen(row) ? new Date(row.community_frozen_until).getTime() : null,
  communityFreezeReason: isCommunityFrozen(row) ? row.community_freeze_reason ?? '' : '',
});

/** ¿La persona tiene congelado el uso de la comunidad (publicar, comentar, reaccionar)? */
export const isCommunityFrozen = (row) =>
  Boolean(row.community_frozen_until && new Date(row.community_frozen_until) > new Date());

export const communityFrozenMessage = (row) => {
  const until = new Date(row.community_frozen_until);
  const when =
    until.getFullYear() >= 9000
      ? 'de forma indefinida'
      : `hasta el ${until.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const reason = row.community_freeze_reason
    ? ` Motivo: ${row.community_freeze_reason.replace(/[.\s]+$/, '')}.`
    : '';
  return `Tu participación en la comunidad está congelada ${when}.${reason} Puedes seguir leyendo las publicaciones.`;
};

/** Exige un token válido y deja el usuario en `req.user`. */
export const requireAuth = async (req, res, next) => {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [payload.sub]);
    if (!rows.length) return res.status(401).json({ error: 'La sesión ya no es válida.' });
    if (isSuspended(rows[0])) return res.status(401).json({ error: suspensionMessage(rows[0]) });
    req.user = rows[0];
    return next();
  } catch {
    return res.status(401).json({ error: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
  }
};

/** ¿La cuenta está suspendida en este momento? */
export const isSuspended = (row) => Boolean(row.suspended_until && new Date(row.suspended_until) > new Date());

export const suspensionMessage = (row) => {
  const until = new Date(row.suspended_until);
  const indefinite = until.getFullYear() >= 9000;
  const when = indefinite
    ? 'de forma indefinida'
    : `hasta el ${until.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const reason = row.suspension_reason ? ` Motivo: ${row.suspension_reason.replace(/[.\s]+$/, '')}.` : '';
  return `Tu cuenta está suspendida ${when}.${reason} Si crees que es un error, escribe a la fundación.`;
};

/** Permite el acceso solo a ciertos tipos de cuenta (usar después de requireAuth). */
export const requireRole =
  (...types) =>
  (req, res, next) =>
    types.includes(req.user.account_type)
      ? next()
      : res.status(403).json({ error: 'No tienes permisos para esta acción.' });

export const isStaff = (user) => user.account_type === 'moderator' || user.account_type === 'admin';

/** Guarda una acción de moderación/administración en el registro de auditoría. */
export const logAction = (actorId, action, targetUserId, details = '') =>
  pool.query('INSERT INTO moderation_log (actor_id, action, target_user_id, details) VALUES (?, ?, ?, ?)', [
    actorId,
    action,
    targetUserId ?? null,
    String(details).slice(0, 500),
  ]);
