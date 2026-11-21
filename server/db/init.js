// Crea las tablas y carga datos de ejemplo (solo si la base está vacía).
// Uso: npm run db:init
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
const statements = schema
  .split(/;\s*$/m)
  .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

try {
  for (const statement of statements) {
    await pool.query(statement);
  }
  console.log(`✔ Tablas listas (${statements.length} sentencias).`);

  // Migraciones: columnas agregadas después de crear las tablas (idempotentes).
  const migrations = [
    ['users', 'account_type', "ENUM('user', 'moderator', 'admin') NOT NULL DEFAULT 'user' AFTER role"],
    ['users', 'suspended_until', 'DATETIME NULL'],
    ['users', 'suspension_reason', 'VARCHAR(300) NULL'],
    ['users', 'start_page', "VARCHAR(20) NOT NULL DEFAULT 'inicio'"],
    ['users', 'community_rules_accepted_at', 'DATETIME NULL'],
    ['users', 'community_frozen_until', 'DATETIME NULL'],
    ['users', 'community_freeze_reason', 'VARCHAR(300) NULL'],
  ];
  for (const [table, column, definition] of migrations) {
    const [[exists]] = await pool.query(
      'SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
      [table, column],
    );
    if (!exists.n) {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`✔ Migración: ${table}.${column}`);
    }
  }

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users');
  if (total > 0) {
    console.log(`ℹ La base ya tiene ${total} usuario(s); no se cargan datos de ejemplo.`);
  } else {
    const hash = (pwd) => bcrypt.hash(pwd, 10);
    const users = [
      {
        email: 'demo@teotea.app', username: '@marina.lopez', password: 'demo1234',
        name: 'Marina López', role: 'Persona TEA', profession: 'Diseñadora gráfica',
        birthdate: '1997-04-12', city: 'Medellín', country: 'Colombia',
        bio: 'Me gusta compartir ideas visuales, aprender cosas nuevas y encontrar formas tranquilas de organizar el día.',
        skills: ['Diseño gráfico', 'Ilustración', 'Organización visual'],
        interests: ['Ilustración', 'Naturaleza', 'Música'],
      },
      {
        email: 'sofia@teotea.app', username: '@sofia.herrera', password: 'demo1234',
        name: 'Sofía Herrera', role: 'Familia de persona con TEA', profession: '',
        birthdate: '1988-09-03', city: 'Quito', country: 'Ecuador', bio: '', skills: [], interests: [],
      },
      {
        email: 'diego@teotea.app', username: '@diego.ramirez', password: 'demo1234',
        name: 'Diego Ramírez', role: 'Sin diagnóstico', profession: '',
        birthdate: '1999-01-20', city: 'Lima', country: 'Perú', bio: '', skills: [], interests: [],
      },
    ];

    const ids = [];
    for (const u of users) {
      const [result] = await pool.query(
        `INSERT INTO users (email, username, password_hash, name, role, profession, birthdate, city, country, bio, skills, interests)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.email, u.username, await hash(u.password), u.name, u.role, u.profession, u.birthdate,
          u.city, u.country, u.bio, JSON.stringify(u.skills), JSON.stringify(u.interests)],
      );
      ids.push(result.insertId);
    }
    const [marina, sofia, diego] = ids;

    const posts = [
      [diego, 'Un recordatorio amable: está bien pedir instrucciones por escrito o solicitar una pausa cuando la necesitas.', 50],
      [sofia, 'Estamos aprendiendo a preguntar qué apoyos son útiles en lugar de suponer. Escuchar con atención hace una gran diferencia.', 26],
      [marina, 'Hoy probé usar una lista visual para organizar mi mañana. Me ayudó a empezar con más calma. ¿Qué herramientas les sirven a ustedes?', 2],
    ];
    const postIds = [];
    for (const [userId, body, hoursAgo] of posts) {
      const [r] = await pool.query(
        'INSERT INTO posts (user_id, body, created_at) VALUES (?, ?, UTC_TIMESTAMP() - INTERVAL ? HOUR)',
        [userId, body, hoursAgo],
      );
      postIds.push(r.insertId);
    }
    const [, pSofia, pMarina] = postIds;
    await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?), (?, ?), (?, ?)', [
      pMarina, sofia, pMarina, diego, pSofia, diego,
    ]);
    await pool.query(
      'INSERT INTO comments (post_id, user_id, text, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP() - INTERVAL 1 HOUR)',
      [pMarina, sofia, 'A mí también me ayudan mucho las listas. Gracias por compartirlo.'],
    );
    console.log('✔ Datos de ejemplo cargados. Cuenta de prueba: demo@teotea.app / demo1234');
  }

  // Cuentas de equipo (moderación y administración). Se crean una sola vez con clave aleatoria.
  const staff = [
    { email: 'moderador@teotea.app', username: '@moderacion', name: 'Equipo de Moderación', type: 'moderator' },
    { email: 'admin@teotea.app', username: '@administracion', name: 'Administración TEO + TEA', type: 'admin' },
  ];
  for (const member of staff) {
    const [[found]] = await pool.query('SELECT id FROM users WHERE email = ?', [member.email]);
    if (found) continue;
    const password = randomBytes(9).toString('base64url');
    await pool.query(
      `INSERT INTO users (email, username, password_hash, name, role, account_type, birthdate, city, country, bio, skills, interests)
       VALUES (?, ?, ?, ?, 'Sin diagnóstico', ?, NULL, '', '', '', '[]', '[]')`,
      [member.email, member.username, await bcrypt.hash(password, 10), member.name, member.type],
    );
    console.log(`✔ Cuenta ${member.type === 'admin' ? 'de ADMINISTRADOR' : 'de MODERADOR'} creada:`);
    console.log(`    correo: ${member.email}   contraseña: ${password}`);
    console.log('    ⚠ Guárdala ahora: no se volverá a mostrar.');
  }
} catch (error) {
  console.error('✖ Error inicializando la base de datos:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
