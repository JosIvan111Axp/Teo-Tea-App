// Panel del equipo: moderación (moderadores y administradores) y administración (solo administradores).
//
// MODERADOR       → revisar reportes, descartar o eliminar contenido, suspender usuarios (1-30 días)
//                    y reactivar usuarios comunes.
// ADMINISTRADOR   → todo lo anterior + suspensión indefinida, gestión de usuarios y roles,
//                    estadísticas y registro de auditoría.
import { Router } from 'express';
import { pool } from '../db.js';
import { logAction, requireAuth, requireRole } from '../auth.js';
import { removeImage } from './posts.js';

const router = Router();
router.use(requireAuth, requireRole('moderator', 'admin'));
const adminOnly = requireRole('admin');

const MODERATOR_SUSPENSION_DAYS = [1, 3, 7, 30];
const INDEFINITE = '9999-12-31 00:00:00';
const ACCOUNT_TYPES = ['user', 'moderator', 'admin'];

const fileUrl = (req, p) => (p ? `${req.protocol}://${req.get('host')}/${p}` : null);
const ms = (value) => (value ? new Date(value).getTime() : null);
const suspendedUntil = (value) => (value && new Date(value) > new Date() ? ms(value) : null);

const getUser = async (id) => {
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return user;
};

/* --------------------------------- Reportes --------------------------------- */

// Reportes agrupados por contenido (varias personas pueden reportar lo mismo).
router.get('/reports', async (req, res, next) => {
  try {
    const status = ['pending', 'resolved', 'dismissed'].includes(req.query.status) ? req.query.status : 'pending';
    const [rows] = await pool.query(
      `SELECT r.id, r.post_id, r.comment_id, r.reason, r.details, r.created_at, r.status, r.resolved_at,
              rep.name AS reporter_name,
              p.body AS post_body, p.image_path, p.created_at AS post_created,
              c.text AS comment_text, c.created_at AS comment_created,
              au.id AS author_id, au.name AS author_name, au.account_type AS author_type,
              au.suspended_until AS author_suspended_until, au.community_frozen_until AS author_frozen_until,
              (SELECT COUNT(*) FROM moderation_log ml
                 WHERE ml.target_user_id = au.id
                   AND ml.action IN ('delete_post', 'delete_comment', 'suspend_user')) AS author_strikes
         FROM reports r
         JOIN users rep ON rep.id = r.reporter_id
         JOIN posts p ON p.id = r.post_id
         LEFT JOIN comments c ON c.id = r.comment_id
         JOIN users au ON au.id = COALESCE(c.user_id, p.user_id)
        WHERE r.status = ?
        ORDER BY r.created_at ASC
        LIMIT 300`,
      [status],
    );

    const groups = new Map();
    for (const row of rows) {
      const key = `${row.post_id}:${row.comment_id ?? ''}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          postId: String(row.post_id),
          commentId: row.comment_id ? String(row.comment_id) : null,
          type: row.comment_id ? 'comment' : 'post',
          text: row.comment_id ? row.comment_text : row.post_body,
          image: row.comment_id ? null : fileUrl(req, row.image_path),
          contentCreatedAt: ms(row.comment_id ? row.comment_created : row.post_created),
          author: {
            id: String(row.author_id),
            name: row.author_name,
            accountType: row.author_type,
            suspendedUntil: suspendedUntil(row.author_suspended_until),
            communityFrozenUntil: suspendedUntil(row.author_frozen_until),
            strikes: Number(row.author_strikes),
          },
          reports: [],
        });
      }
      groups.get(key).reports.push({
        id: String(row.id),
        reason: row.reason,
        details: row.details,
        reporterName: row.reporter_name,
        createdAt: ms(row.created_at),
      });
    }
    res.json({ items: [...groups.values()].sort((a, b) => b.reports.length - a.reports.length) });
  } catch (error) {
    next(error);
  }
});

const parseTarget = (body) => ({
  postId: Number(body.postId),
  commentId: body.commentId ? Number(body.commentId) : null,
});

// Descartar: el contenido no infringe las normas.
router.post('/reports/dismiss', async (req, res, next) => {
  try {
    const { postId, commentId } = parseTarget(req.body);
    const [result] = await pool.query(
      `UPDATE reports SET status = 'dismissed', resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
        WHERE post_id = ? AND comment_id <=> ? AND status = 'pending'`,
      [req.user.id, postId, commentId],
    );
    await logAction(req.user.id, 'dismiss_reports', null, `${result.affectedRows} reporte(s) de ${commentId ? `comentario #${commentId}` : `publicación #${postId}`}`);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Eliminar el contenido reportado.
router.post('/reports/remove', async (req, res, next) => {
  try {
    const { postId, commentId } = parseTarget(req.body);
    const note = String(req.body.note ?? '').trim().slice(0, 200);
    if (commentId) {
      const [[comment]] = await pool.query('SELECT * FROM comments WHERE id = ? AND post_id = ?', [commentId, postId]);
      if (!comment) return res.status(404).json({ error: 'El comentario ya no existe.' });
      await pool.query(
        `UPDATE reports SET status = 'resolved', resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE comment_id = ? AND status = 'pending'`,
        [req.user.id, commentId],
      );
      await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);
      await logAction(req.user.id, 'delete_comment', comment.user_id, `Por reporte. "${comment.text.slice(0, 150)}"${note ? ` — ${note}` : ''}`);
    } else {
      const [[post]] = await pool.query('SELECT * FROM posts WHERE id = ?', [postId]);
      if (!post) return res.status(404).json({ error: 'La publicación ya no existe.' });
      await pool.query('DELETE FROM posts WHERE id = ?', [postId]);
      await removeImage(post.image_path);
      await logAction(req.user.id, 'delete_post', post.user_id, `Por reporte. "${post.body.slice(0, 150)}"${note ? ` — ${note}` : ''}`);
    }
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------ Suspensiones ------------------------------ */

router.post('/users/:id/suspend', async (req, res, next) => {
  try {
    const target = await getUser(req.params.id);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'No puedes suspender tu propia cuenta.' });

    const isAdmin = req.user.account_type === 'admin';
    if (target.account_type === 'admin' || (!isAdmin && target.account_type !== 'user')) {
      return res.status(403).json({ error: 'No tienes permisos para suspender a esta cuenta.' });
    }

    const days = Number(req.body.days);
    const indefinite = isAdmin && days === 0;
    if (!indefinite && !(isAdmin ? days >= 1 && days <= 365 : MODERATOR_SUSPENSION_DAYS.includes(days))) {
      return res.status(400).json({ error: 'Duración de suspensión no válida.' });
    }
    const reason = String(req.body.reason ?? '').trim().slice(0, 300);
    if (!reason) return res.status(400).json({ error: 'Indica el motivo de la suspensión.' });

    await pool.query(
      `UPDATE users SET suspended_until = ${indefinite ? '?' : 'UTC_TIMESTAMP() + INTERVAL ? DAY'}, suspension_reason = ? WHERE id = ?`,
      [indefinite ? INDEFINITE : days, reason, target.id],
    );
    await logAction(req.user.id, 'suspend_user', target.id, `${indefinite ? 'Indefinida' : `${days} día(s)`}. ${reason}`);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.post('/users/:id/reactivate', async (req, res, next) => {
  try {
    const target = await getUser(req.params.id);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (req.user.account_type !== 'admin' && target.account_type !== 'user') {
      return res.status(403).json({ error: 'No tienes permisos para reactivar esta cuenta.' });
    }
    await pool.query('UPDATE users SET suspended_until = NULL, suspension_reason = NULL WHERE id = ?', [target.id]);
    await logAction(req.user.id, 'reactivate_user', target.id, '');
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/* --------------------- Congelar el uso de la comunidad --------------------- */
// Medida más leve que la suspensión: la persona puede usar la app y leer la comunidad,
// pero no publicar, comentar ni reaccionar mientras dure.

router.post('/users/:id/freeze-community', async (req, res, next) => {
  try {
    const target = await getUser(req.params.id);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'No puedes aplicarte esta medida.' });
    const isAdmin = req.user.account_type === 'admin';
    if (target.account_type === 'admin' || (!isAdmin && target.account_type !== 'user')) {
      return res.status(403).json({ error: 'No tienes permisos para esta cuenta.' });
    }
    const days = Number(req.body.days);
    const indefinite = isAdmin && days === 0;
    if (!indefinite && !(isAdmin ? days >= 1 && days <= 365 : MODERATOR_SUSPENSION_DAYS.includes(days))) {
      return res.status(400).json({ error: 'Duración no válida.' });
    }
    const reason = String(req.body.reason ?? '').trim().slice(0, 300);
    if (!reason) return res.status(400).json({ error: 'Indica el motivo.' });

    await pool.query(
      `UPDATE users SET community_frozen_until = ${indefinite ? '?' : 'UTC_TIMESTAMP() + INTERVAL ? DAY'}, community_freeze_reason = ? WHERE id = ?`,
      [indefinite ? INDEFINITE : days, reason, target.id],
    );
    await logAction(req.user.id, 'freeze_community', target.id, `${indefinite ? 'Indefinido' : `${days} día(s)`}. ${reason}`);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.post('/users/:id/unfreeze-community', async (req, res, next) => {
  try {
    const target = await getUser(req.params.id);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (req.user.account_type !== 'admin' && target.account_type !== 'user') {
      return res.status(403).json({ error: 'No tienes permisos para esta cuenta.' });
    }
    await pool.query('UPDATE users SET community_frozen_until = NULL, community_freeze_reason = NULL WHERE id = ?', [target.id]);
    await logAction(req.user.id, 'unfreeze_community', target.id, '');
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/* ---------------------------- Solo administración ---------------------------- */

router.get('/stats', adminOnly, async (_req, res, next) => {
  try {
    const [[s]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM users WHERE created_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY) AS users_week,
        (SELECT COUNT(*) FROM users WHERE account_type = 'moderator') AS moderators,
        (SELECT COUNT(*) FROM users WHERE account_type = 'admin') AS admins,
        (SELECT COUNT(*) FROM users WHERE suspended_until > UTC_TIMESTAMP()) AS suspended,
        (SELECT COUNT(*) FROM posts) AS posts,
        (SELECT COUNT(*) FROM posts WHERE created_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY) AS posts_week,
        (SELECT COUNT(*) FROM comments) AS comments,
        (SELECT COUNT(*) FROM reports WHERE status = 'pending') AS pending_reports,
        (SELECT COUNT(*) FROM books) AS books_downloaded,
        (SELECT COALESCE(SUM(file_size), 0) FROM books) AS books_bytes,
        (SELECT COUNT(*) FROM user_books) AS library_entries,
        (SELECT COUNT(*) FROM catalog_books) AS catalog_size`);
    const [byRole] = await pool.query('SELECT role, COUNT(*) AS total FROM users GROUP BY role ORDER BY total DESC');
    const [topBooks] = await pool.query(
      `SELECT b.title, COUNT(*) AS readers FROM user_books ub JOIN books b ON b.id = ub.book_id
        GROUP BY b.id ORDER BY readers DESC LIMIT 5`,
    );
    res.json({
      stats: Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Number(v)])),
      byRole: byRole.map((r) => ({ role: r.role, total: Number(r.total) })),
      topBooks: topBooks.map((b) => ({ title: b.title, readers: Number(b.readers) })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/users', adminOnly, async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim().slice(0, 80);
    const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.username, u.role, u.account_type, u.suspended_until, u.suspension_reason,
              u.community_frozen_until, u.community_freeze_reason,
              u.created_at, (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) AS posts
         FROM users u
        WHERE ? = '' OR u.name LIKE ? OR u.email LIKE ? OR u.username LIKE ?
        ORDER BY FIELD(u.account_type, 'admin', 'moderator', 'user'), u.created_at DESC
        LIMIT 100`,
      [q, like, like, like],
    );
    res.json({
      users: rows.map((u) => ({
        id: String(u.id),
        name: u.name,
        email: u.email,
        username: u.username,
        role: u.role,
        accountType: u.account_type,
        suspendedUntil: suspendedUntil(u.suspended_until),
        suspensionReason: u.suspension_reason,
        communityFrozenUntil: suspendedUntil(u.community_frozen_until),
        communityFreezeReason: u.community_freeze_reason,
        createdAt: ms(u.created_at),
        posts: Number(u.posts),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id/account-type', adminOnly, async (req, res, next) => {
  try {
    const target = await getUser(req.params.id);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (target.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes cambiar tu propio tipo de cuenta.' });
    }
    const accountType = String(req.body.accountType);
    if (!ACCOUNT_TYPES.includes(accountType)) return res.status(400).json({ error: 'Tipo de cuenta no válido.' });
    await pool.query('UPDATE users SET account_type = ? WHERE id = ?', [accountType, target.id]);
    await logAction(req.user.id, 'change_account_type', target.id, `${target.account_type} → ${accountType}`);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/log', adminOnly, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.id, l.action, l.details, l.created_at, a.name AS actor_name, a.account_type AS actor_type, t.name AS target_name
         FROM moderation_log l
         LEFT JOIN users a ON a.id = l.actor_id
         LEFT JOIN users t ON t.id = l.target_user_id
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT 150`,
    );
    res.json({
      entries: rows.map((r) => ({
        id: String(r.id),
        action: r.action,
        details: r.details,
        actorName: r.actor_name ?? 'Cuenta eliminada',
        actorType: r.actor_type,
        targetName: r.target_name,
        createdAt: ms(r.created_at),
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
