import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';
import { communityFrozenMessage, isCommunityFrozen, isStaff, logAction, requireAuth } from '../auth.js';

export const UPLOADS_DIR = fileURLToPath(new URL('../../uploads', import.meta.url));

const router = Router();
router.use(requireAuth);

/* ------------------------- Normas de la comunidad ------------------------- */

/** Bloquea a quien tiene la comunidad congelada (puede seguir leyendo). */
const requireNotFrozen = (req, res, next) =>
  isCommunityFrozen(req.user)
    ? res.status(403).json({ error: communityFrozenMessage(req.user), code: 'COMMUNITY_FROZEN' })
    : next();

/** Para publicar o comentar hay que aceptar antes las normas de la comunidad. */
const requireRulesAccepted = (req, res, next) =>
  req.user.community_rules_accepted_at
    ? next()
    : res
        .status(403)
        .json({ error: 'Para participar, primero acepta las normas de la comunidad.', code: 'RULES_NOT_ACCEPTED' });

const LINK_PATTERN =
  /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|edu|gov|ec|co|pe|ve|io|me|ly|gl|app|info|xyz|link|site|online|store|shop|tk|ru)(\/\S*)?\b/i;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
const PHONE_CANDIDATES = /[+(]?\d[\d\s().-]{5,}\d/g;

/** Por seguridad no se permiten enlaces, correos ni teléfonos (contactos fuera de la app). */
export const findForbiddenContent = (text) => {
  if (LINK_PATTERN.test(text)) return 'enlaces';
  if (EMAIL_PATTERN.test(text)) return 'correos electrónicos';
  for (const match of text.match(PHONE_CANDIDATES) ?? []) {
    if (match.replace(/\D/g, '').length >= 7) return 'números de teléfono';
  }
  return null;
};

const rejectForbidden = (res, text) => {
  const found = findForbiddenContent(text);
  if (!found) return false;
  res.status(400).json({
    error: `Por seguridad, la comunidad no permite ${found} ni datos para contactarse fuera de la app. Edita tu mensaje e inténtalo de nuevo.`,
    code: 'FORBIDDEN_CONTENT',
  });
  return true;
};

const MAX_POST_LENGTH = 500;
const MAX_COMMENT_LENGTH = 300;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const publicUrl = (req, imagePath) =>
  imagePath ? `${req.protocol}://${req.get('host')}/${imagePath}` : undefined;

/** Guarda una imagen recibida como data URL y devuelve su ruta relativa. */
const saveImage = async (dataUrl) => {
  const match = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  const ext = match && IMAGE_TYPES[match[1]];
  if (!ext) throw Object.assign(new Error('Formato de imagen no permitido.'), { status: 400 });
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw Object.assign(new Error('La imagen es demasiado grande (máx. 2 MB).'), { status: 400 });
  }
  await mkdir(UPLOADS_DIR, { recursive: true });
  const fileName = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
  await writeFile(path.join(UPLOADS_DIR, fileName), buffer);
  return `uploads/${fileName}`;
};

export const removeImage = async (imagePath) => {
  if (!imagePath) return;
  try {
    await unlink(path.join(UPLOADS_DIR, path.basename(imagePath)));
  } catch {
    /* el archivo ya no existe */
  }
};

/** Carga publicaciones (con autor, likes y comentarios) en el formato de la app. */
const loadPosts = async (req, postIds) => {
  const where = postIds ? 'WHERE p.id IN (?)' : '';
  const [posts] = await pool.query(
    `SELECT p.id, p.user_id, p.body, p.image_path, p.created_at, u.name AS author, u.role, u.account_type AS author_type
       FROM posts p JOIN users u ON u.id = p.user_id
       ${where}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 100`,
    postIds ? [postIds] : [],
  );
  if (!posts.length) return [];

  const ids = posts.map((p) => p.id);
  const [likes] = await pool.query('SELECT post_id, user_id FROM post_likes WHERE post_id IN (?)', [ids]);
  const [comments] = await pool.query(
    `SELECT c.id, c.post_id, c.user_id, c.text, c.created_at, u.name AS author, u.account_type AS author_type
       FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.post_id IN (?)
      ORDER BY c.created_at ASC, c.id ASC`,
    [ids],
  );

  return posts.map((p) => ({
    id: String(p.id),
    authorId: String(p.user_id),
    author: p.author,
    role: p.role,
    authorType: p.author_type,
    createdAt: new Date(p.created_at).getTime(),
    body: p.body,
    image: publicUrl(req, p.image_path),
    likedBy: likes.filter((l) => l.post_id === p.id).map((l) => String(l.user_id)),
    comments: comments
      .filter((c) => c.post_id === p.id)
      .map((c) => ({
        id: String(c.id),
        authorId: String(c.user_id),
        author: c.author,
        authorType: c.author_type,
        text: c.text,
        createdAt: new Date(c.created_at).getTime(),
      })),
  }));
};

const loadOne = async (req, postId) => (await loadPosts(req, [postId]))[0];

/** Verifica que la publicación exista (y opcionalmente que sea del usuario). */
const findPost = async (req, res, { mustOwn = false } = {}) => {
  const [[post]] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (!post) {
    res.status(404).json({ error: 'La publicación ya no existe.' });
    return null;
  }
  if (mustOwn && post.user_id !== req.user.id) {
    res.status(403).json({ error: 'Solo puedes modificar tus propias publicaciones.' });
    return null;
  }
  return post;
};

router.get('/', async (req, res, next) => {
  try {
    res.json({ posts: await loadPosts(req) });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireNotFrozen, requireRulesAccepted, async (req, res, next) => {
  try {
    const body = String(req.body.body ?? '').trim().slice(0, MAX_POST_LENGTH);
    if (rejectForbidden(res, body)) return undefined;
    if (!body && !req.body.image) {
      return res.status(400).json({ error: 'Escribe algo o adjunta una imagen para publicar.' });
    }
    const imagePath = req.body.image ? await saveImage(req.body.image) : null;
    const [result] = await pool.query('INSERT INTO posts (user_id, body, image_path) VALUES (?, ?, ?)', [
      req.user.id,
      body,
      imagePath,
    ]);
    return res.status(201).json({ post: await loadOne(req, result.insertId) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', requireNotFrozen, async (req, res, next) => {
  try {
    const post = await findPost(req, res, { mustOwn: true });
    if (!post) return undefined;
    const body = String(req.body.body ?? '').trim().slice(0, MAX_POST_LENGTH);
    if (rejectForbidden(res, body)) return undefined;
    if (!body && !post.image_path) {
      return res.status(400).json({ error: 'La publicación no puede quedar vacía.' });
    }
    await pool.query('UPDATE posts SET body = ? WHERE id = ?', [body, post.id]);
    return res.json({ post: await loadOne(req, post.id) });
  } catch (error) {
    return next(error);
  }
});

// Borrar: la persona autora, o moderación/administración (queda registrado).
router.delete('/:id', async (req, res, next) => {
  try {
    const post = await findPost(req, res);
    if (!post) return undefined;
    const isOwner = post.user_id === req.user.id;
    if (!isOwner && !isStaff(req.user)) {
      return res.status(403).json({ error: 'Solo puedes eliminar tus propias publicaciones.' });
    }
    await pool.query('DELETE FROM posts WHERE id = ?', [post.id]);
    await removeImage(post.image_path);
    if (!isOwner) {
      await logAction(req.user.id, 'delete_post', post.user_id, `Publicación #${post.id}: "${post.body.slice(0, 120)}"`);
    }
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/like', requireNotFrozen, async (req, res, next) => {
  try {
    const post = await findPost(req, res);
    if (!post) return undefined;
    const [result] = await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [
      post.id,
      req.user.id,
    ]);
    if (result.affectedRows === 0) {
      await pool.query('INSERT IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)', [post.id, req.user.id]);
    }
    return res.json({ post: await loadOne(req, post.id) });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/comments', requireNotFrozen, requireRulesAccepted, async (req, res, next) => {
  try {
    const post = await findPost(req, res);
    if (!post) return undefined;
    const text = String(req.body.text ?? '').trim().slice(0, MAX_COMMENT_LENGTH);
    if (!text) return res.status(400).json({ error: 'El comentario está vacío.' });
    if (rejectForbidden(res, text)) return undefined;
    await pool.query('INSERT INTO comments (post_id, user_id, text) VALUES (?, ?, ?)', [
      post.id,
      req.user.id,
      text,
    ]);
    return res.status(201).json({ post: await loadOne(req, post.id) });
  } catch (error) {
    return next(error);
  }
});

// Borrar comentario: la persona autora, o moderación/administración (queda registrado).
router.delete('/:id/comments/:commentId', async (req, res, next) => {
  try {
    const [[comment]] = await pool.query('SELECT * FROM comments WHERE id = ? AND post_id = ?', [
      req.params.commentId,
      req.params.id,
    ]);
    const isOwner = comment?.user_id === req.user.id;
    if (!comment || (!isOwner && !isStaff(req.user))) {
      return res.status(404).json({ error: 'No se encontró tu comentario.' });
    }
    await pool.query('DELETE FROM comments WHERE id = ?', [comment.id]);
    if (!isOwner) {
      await logAction(req.user.id, 'delete_comment', comment.user_id, `Comentario #${comment.id}: "${comment.text.slice(0, 120)}"`);
    }
    return res.json({ post: await loadOne(req, Number(req.params.id)) });
  } catch (error) {
    return next(error);
  }
});

// Reportar una publicación o un comentario para que lo revise el equipo de moderación.
export const REPORT_REASONS = [
  'Acoso u ofensas',
  'Información falsa o peligrosa',
  'Spam o publicidad',
  'Contenido inapropiado',
  'Otro motivo',
];

const createReport = async (req, res, commentId = null) => {
  const post = await findPost(req, res);
  if (!post) return undefined;
  let targetOwner = post.user_id;
  if (commentId) {
    const [[comment]] = await pool.query('SELECT user_id FROM comments WHERE id = ? AND post_id = ?', [commentId, post.id]);
    if (!comment) return res.status(404).json({ error: 'El comentario ya no existe.' });
    targetOwner = comment.user_id;
  }
  if (targetOwner === req.user.id) return res.status(400).json({ error: 'No puedes reportar tu propio contenido.' });

  const reason = String(req.body.reason ?? '');
  if (!REPORT_REASONS.includes(reason)) return res.status(400).json({ error: 'Elige un motivo para el reporte.' });
  const details = String(req.body.details ?? '').trim().slice(0, 300);

  const [[existing]] = await pool.query(
    `SELECT id FROM reports WHERE reporter_id = ? AND post_id = ? AND comment_id <=> ? AND status = 'pending'`,
    [req.user.id, post.id, commentId],
  );
  if (!existing) {
    await pool.query('INSERT INTO reports (post_id, comment_id, reporter_id, reason, details) VALUES (?, ?, ?, ?, ?)', [
      post.id,
      commentId,
      req.user.id,
      reason,
      details,
    ]);
  }
  return res.status(201).json({ ok: true });
};

router.post('/:id/report', async (req, res, next) => {
  try {
    await createReport(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/comments/:commentId/report', async (req, res, next) => {
  try {
    await createReport(req, res, Number(req.params.commentId));
  } catch (error) {
    next(error);
  }
});

export default router;
