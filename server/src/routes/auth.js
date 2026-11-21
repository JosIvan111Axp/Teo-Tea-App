import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { removeImage, saveImage } from './posts.js';
import { isSuspended, requireAuth, signToken, suspensionMessage, toPublicUser } from '../auth.js';

const router = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = [
  'Persona TEA',
  'Otra discapacidad',
  'Familia de persona con TEA',
  'Persona neurotípica',
  'Empleador',
  'Sin diagnóstico',
];

const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max);
const normalizeUsername = (value) => `@${clean(value, 59).replace(/^@+/, '').toLocaleLowerCase()}`;

router.post('/register', async (req, res, next) => {
  try {
    const email = clean(req.body.email, 190).toLocaleLowerCase();
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password ?? '');
    const name = clean(req.body.name);
    const role = clean(req.body.role, 60);
    const city = clean(req.body.city);
    const country = clean(req.body.country, 80);
    const birthdate = clean(req.body.birthdate, 10);

    if (!name || username === '@' || !city || !country || !birthdate) {
      return res.status(400).json({ error: 'Completa todos los campos.' });
    }
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Correo electrónico no válido.' });
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Selecciona cómo te identificas.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate) || new Date(birthdate) > new Date()) {
      return res.status(400).json({ error: 'Fecha de nacimiento no válida.' });
    }

    const [existing] = await pool.query(
      'SELECT email, username FROM users WHERE email = ? OR username = ?',
      [email, username],
    );
    if (existing.some((u) => u.email === email)) {
      return res.status(409).json({ error: 'Ya existe una cuenta con este correo. Prueba iniciar sesión.' });
    }
    if (existing.length) {
      return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso. Elige otro.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (email, username, password_hash, name, role, birthdate, city, country, bio, skills, interests)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '[]', '[]')`,
      [email, username, passwordHash, name, role, birthdate, city, country],
    );
    const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    return res.status(201).json({ token: signToken(row.id), user: toPublicUser(row) });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = clean(req.body.email, 190).toLocaleLowerCase();
    const password = String(req.body.password ?? '');
    const [[row]] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      return res
        .status(401)
        .json({ error: 'Correo o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.' });
    }
    if (isSuspended(row)) return res.status(403).json({ error: suspensionMessage(row) });
    return res.json({ token: signToken(row.id), user: toPublicUser(row) });
  } catch (error) {
    return next(error);
  }
});

// Perfil + token renovado: la sesión se extiende cada vez que se abre la app ("sesión deslizante"),
// así no caduca mientras la persona la use al menos una vez cada 7 días.
router.get('/me', requireAuth, (req, res) =>
  res.json({ user: toPublicUser(req.user), token: signToken(req.user.id) }),
);

export const START_PAGES = ['inicio', 'biblioteca', 'musica', 'comunidad'];

// Página en la que se abre la app al iniciar sesión.
router.put('/me/start-page', requireAuth, async (req, res, next) => {
  try {
    const startPage = String(req.body.startPage ?? '');
    if (!START_PAGES.includes(startPage)) return res.status(400).json({ error: 'Página de inicio no válida.' });
    await pool.query('UPDATE users SET start_page = ? WHERE id = ?', [startPage, req.user.id]);
    const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return res.json({ user: toPublicUser(row) });
  } catch (error) {
    return next(error);
  }
});

// Foto de perfil: se recibe ya recortada y comprimida por la app (data URL JPEG/PNG/WebP, máx. 2 MB).
router.put('/me/avatar', requireAuth, async (req, res, next) => {
  try {
    if (!req.body.image) return res.status(400).json({ error: 'Elige una imagen.' });
    const newPath = await saveImage(req.body.image);
    const oldPath = req.user.avatar_path;
    await pool.query('UPDATE users SET avatar_path = ? WHERE id = ?', [newPath, req.user.id]);
    if (oldPath) await removeImage(oldPath);
    const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return res.json({ user: toPublicUser(row) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/me/avatar', requireAuth, async (req, res, next) => {
  try {
    if (req.user.avatar_path) await removeImage(req.user.avatar_path);
    await pool.query('UPDATE users SET avatar_path = NULL WHERE id = ?', [req.user.id]);
    const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return res.json({ user: toPublicUser(row) });
  } catch (error) {
    return next(error);
  }
});

/** Frase que hay que escribir para eliminar la cuenta (se compara sin mayúsculas, tildes ni espacios extra). */
export const DELETE_PHRASE = 'borrar cuenta y datos';
export const normalizePhrase = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.!¡]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// Eliminar la cuenta de forma permanente (requisito de Google Play).
// Borra el usuario y, en cascada, sus publicaciones, comentarios, likes, reportes hechos,
// progreso de lectura y logros; además las imágenes guardadas en disco.
router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    if (normalizePhrase(req.body?.confirmation) !== normalizePhrase(DELETE_PHRASE)) {
      return res.status(400).json({ error: `Escribe exactamente: "${DELETE_PHRASE}".` });
    }
    if (req.user.account_type === 'admin') {
      const [[{ admins }]] = await pool.query(
        "SELECT COUNT(*) AS admins FROM users WHERE account_type = 'admin'",
      );
      if (admins <= 1) {
        return res.status(409).json({
          error: 'Eres la única cuenta de administración. Asigna otro administrador antes de eliminarla.',
        });
      }
    }
    const [images] = await pool.query(
      'SELECT image_path FROM posts WHERE user_id = ? AND image_path IS NOT NULL',
      [req.user.id],
    );
    await pool.query('DELETE FROM users WHERE id = ?', [req.user.id]);
    await Promise.all([
      removeImage(req.user.avatar_path),
      ...images.map((row) => removeImage(row.image_path)),
    ]);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

// Aceptar las normas de la comunidad (requisito para publicar por primera vez).
router.post('/me/community-rules', requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE users SET community_rules_accepted_at = COALESCE(community_rules_accepted_at, UTC_TIMESTAMP()) WHERE id = ?',
      [req.user.id],
    );
    const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return res.json({ user: toPublicUser(row) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const toList = (value) =>
      (Array.isArray(value) ? value : [])
        .map((item) => clean(item, 40))
        .filter(Boolean)
        .slice(0, 12);

    const name = clean(req.body.name ?? req.user.name);
    if (!name) return res.status(400).json({ error: 'El nombre no puede quedar vacío.' });

    const city = clean(req.body.city ?? req.user.city);
    const country = clean(req.body.country ?? req.user.country, 80);
    if (!city || !country) return res.status(400).json({ error: 'Indica tu país y tu ciudad.' });
    const birthdate = clean(req.body.birthdate ?? req.user.birthdate, 10);
    if (
      birthdate &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate) ||
        Number.isNaN(new Date(birthdate).getTime()) ||
        new Date(birthdate) > new Date())
    ) {
      return res.status(400).json({ error: 'La fecha de nacimiento no es válida.' });
    }

    await pool.query(
      'UPDATE users SET name = ?, profession = ?, bio = ?, skills = ?, interests = ?, city = ?, country = ?, birthdate = ? WHERE id = ?',
      [
        name,
        clean(req.body.profession ?? req.user.profession),
        clean(req.body.bio ?? req.user.bio ?? '', 300),
        JSON.stringify(req.body.skills ? toList(req.body.skills) : toPublicUser(req.user).skills),
        JSON.stringify(req.body.interests ? toList(req.body.interests) : toPublicUser(req.user).interests),
        city,
        country,
        birthdate || null,
        req.user.id,
      ],
    );
    const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return res.json({ user: toPublicUser(row) });
  } catch (error) {
    return next(error);
  }
});

export default router;
