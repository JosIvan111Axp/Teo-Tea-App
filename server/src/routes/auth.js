import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
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

router.get('/me', requireAuth, (req, res) => res.json({ user: toPublicUser(req.user) }));

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const toList = (value) =>
      (Array.isArray(value) ? value : [])
        .map((item) => clean(item, 40))
        .filter(Boolean)
        .slice(0, 12);

    const name = clean(req.body.name ?? req.user.name);
    if (!name) return res.status(400).json({ error: 'El nombre no puede quedar vacío.' });

    await pool.query(
      'UPDATE users SET name = ?, profession = ?, bio = ?, skills = ?, interests = ? WHERE id = ?',
      [
        name,
        clean(req.body.profession ?? req.user.profession),
        clean(req.body.bio ?? req.user.bio ?? '', 300),
        JSON.stringify(req.body.skills ? toList(req.body.skills) : toPublicUser(req.user).skills),
        JSON.stringify(req.body.interests ? toList(req.body.interests) : toPublicUser(req.user).interests),
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
