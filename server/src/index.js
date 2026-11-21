import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import postRoutes, { UPLOADS_DIR } from './routes/posts.js';
import bookRoutes, { LIBRARY_DIR } from './routes/books.js';
import staffRoutes from './routes/staff.js';
import meRoutes from './routes/me.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);

// CORS_ORIGIN: lista separada por comas. Vacío = permite cualquier origen (solo para desarrollo).
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json({ limit: '3mb' }));
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));
// Solo las portadas son públicas; los EPUB se entregan por /api/books/:id/file con sesión.
app.use('/library/covers', express.static(path.join(LIBRARY_DIR, 'covers'), { maxAge: '30d' }));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'conectada' });
  } catch (error) {
    res.status(503).json({ ok: false, database: 'sin conexión', error: error.code });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/me', meRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El contenido es demasiado grande.' });
  }
  if (error.status && error.status < 500) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(error);
  return res.status(500).json({ error: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`API de TEO + TEA en http://localhost:${PORT}/api`);
  try {
    await pool.query('SELECT 1');
    console.log('✔ Conectado a MySQL');
  } catch (error) {
    console.error('✖ No se pudo conectar a MySQL:', error.code, '-', error.message);
  }
});
