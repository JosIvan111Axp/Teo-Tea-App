// Biblioteca digital: catálogo abierto de Project Gutenberg (importado a MySQL con `npm run books:sync`).
// Los EPUB se descargan UNA vez al servidor (server/library) desde el espejo oficial y la app los lee desde aquí.
import { Router } from 'express';
import { createReadStream } from 'node:fs';
import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { USER_AGENT, coverUrl, epubCandidates } from '../gutenberg.js';

export const LIBRARY_DIR = fileURLToPath(new URL('../../library', import.meta.url));

const MAX_EPUB_BYTES = 40 * 1024 * 1024;
const PAGE_SIZE = 24;
const ALLOWED_LANGUAGES = new Set(['es', 'en', 'fr', 'pt', 'it', 'de']);

// Temas (clave usada por la app → patrones en categorías/materias del catálogo).
const TOPICS = {
  novela: ['Category: Novels', 'Fiction'],
  cuentos: ['Short Stories'],
  poesia: ['Poetry'],
  teatro: ['Drama', 'Plays'],
  infantil: ['Children', 'Juvenile'],
  aventuras: ['Adventure'],
  historia: ['History'],
  filosofia: ['Philosophy'],
  ciencia: ['Science'],
};

// Libros recomendados por TEO + TEA: aparecen primero y en la tarjeta principal de la Biblioteca.
// 45438 = "La isla del tesoro" (R. L. Stevenson, trad. Manuel Caballero).
export const FEATURED_BOOK_IDS = (process.env.FEATURED_BOOK_IDS || '45438')
  .split(',')
  .map((id) => Number(id.trim()))
  .filter((id) => Number.isInteger(id) && id > 0);

/** Obra en dominio público en la región (ver rights_year en db/sync-catalog.js). */
const RIGHTS_SQL = '(c.rights_year IS NULL OR c.rights_year <= YEAR(CURDATE()))';

const router = Router();
router.use(requireAuth);

/* ------------------------------- Utilidades ------------------------------- */
const parseList = (value) => {
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value ?? '[]');
  } catch {
    return [];
  }
};

const authorsOf = (row) =>
  parseList(row.authors)
    .filter((p) => typeof p === 'string' || !p.role || p.role === 'Author')
    .map((p) => (typeof p === 'string' ? p : p.name));

const fileUrl = (req, relativePath) =>
  relativePath ? `${req.protocol}://${req.get('host')}/${relativePath}` : null;

const toCatalogBook = (row) => ({
  id: String(row.id),
  title: row.title,
  authors: authorsOf(row),
  languages: String(row.languages || '').split(',').filter(Boolean),
  cover: coverUrl(row.id),
  inLibrary: Boolean(row.in_library),
});

const toLibraryBook = (req, row) => ({
  id: String(row.id),
  title: row.title,
  authors: authorsOf(row),
  languages: parseList(row.languages),
  cover: fileUrl(req, row.cover_path),
  fileSize: row.file_size,
  progress: Number(row.progress ?? 0),
  location: row.location ?? null,
  addedAt: row.added_at ? new Date(row.added_at).getTime() : null,
  lastReadAt: row.last_read_at ? new Date(row.last_read_at).getTime() : null,
});

const parseBookId = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw Object.assign(new Error('ID de libro no válido.'), { status: 400 });
  return id;
};

const httpError = (status, message) => Object.assign(new Error(message), { status });

/** Descarga un archivo a disco con límite de tamaño (escritura atómica vía .part). */
const downloadTo = async (url, destination, { maxBytes, expectZip = false }) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'follow',
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new Error('archivo demasiado grande');

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxBytes) throw new Error('archivo demasiado grande');
  // Un EPUB es un ZIP: debe empezar con "PK".
  if (expectZip && !(buffer[0] === 0x50 && buffer[1] === 0x4b)) throw new Error('no es un EPUB válido');

  const temp = `${destination}.part`;
  await writeFile(temp, buffer);
  await rename(temp, destination);
  return buffer.length;
};

const downloadLocks = new Map();

/** Garantiza que el libro esté en el servidor (fila en `books` + EPUB en disco). */
const ensureBookDownloaded = async (bookId) => {
  const [[existing]] = await pool.query('SELECT * FROM books WHERE id = ?', [bookId]);
  if (existing?.epub_path) {
    try {
      await stat(path.join(LIBRARY_DIR, path.basename(existing.epub_path)));
      return existing;
    } catch {
      /* el archivo se borró: se vuelve a descargar */
    }
  }

  // Evita descargar dos veces el mismo libro si dos usuarios lo piden a la vez.
  if (downloadLocks.has(bookId)) return downloadLocks.get(bookId);
  const task = (async () => {
    const [[meta]] = await pool.query('SELECT * FROM catalog_books c WHERE c.id = ?', [bookId]);
    if (!meta) throw httpError(404, 'Este libro no está en el catálogo.');
    const [[allowed]] = await pool.query(`SELECT ${RIGHTS_SQL} AS ok FROM catalog_books c WHERE c.id = ?`, [bookId]);
    if (!allowed.ok) throw httpError(403, 'Este libro aún no está en dominio público en nuestra región.');

    await mkdir(path.join(LIBRARY_DIR, 'covers'), { recursive: true });
    let fileSize = null;
    let sourceUrl = null;
    const errors = [];
    for (const url of epubCandidates(bookId)) {
      try {
        fileSize = await downloadTo(url, path.join(LIBRARY_DIR, `${bookId}.epub`), {
          maxBytes: MAX_EPUB_BYTES,
          expectZip: true,
        });
        sourceUrl = url;
        break;
      } catch (error) {
        errors.push(`${url}: ${error.message}`);
      }
    }
    if (!sourceUrl) {
      console.warn(`No se pudo descargar el libro ${bookId}:\n  ${errors.join('\n  ')}`);
      throw httpError(502, 'No se pudo descargar el libro desde Project Gutenberg. Inténtalo más tarde.');
    }

    let coverPath = null;
    try {
      await downloadTo(coverUrl(bookId), path.join(LIBRARY_DIR, 'covers', `${bookId}.jpg`), {
        maxBytes: 3 * 1024 * 1024,
      });
      coverPath = `library/covers/${bookId}.jpg`;
    } catch {
      /* sin portada: la app muestra una genérica */
    }

    const languages = String(meta.languages || '').split(',').filter(Boolean);
    await pool.query(
      `INSERT INTO books (id, title, authors, translators, languages, subjects, cover_path, epub_path, file_size, source_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), authors = VALUES(authors), translators = VALUES(translators),
         languages = VALUES(languages), subjects = VALUES(subjects), cover_path = VALUES(cover_path),
         epub_path = VALUES(epub_path), file_size = VALUES(file_size), source_url = VALUES(source_url),
         downloaded_at = CURRENT_TIMESTAMP`,
      [
        bookId,
        meta.title.slice(0, 500),
        JSON.stringify(authorsOf(meta)),
        JSON.stringify(parseList(meta.authors).filter((p) => p.role === 'Translator').map((p) => p.name)),
        JSON.stringify(languages),
        JSON.stringify(String(meta.subjects || '').split('; ').filter(Boolean).slice(0, 8)),
        coverPath,
        `library/${bookId}.epub`,
        fileSize,
        sourceUrl,
      ],
    );
    const [[row]] = await pool.query('SELECT * FROM books WHERE id = ?', [bookId]);
    return row;
  })();

  downloadLocks.set(bookId, task);
  try {
    return await task;
  } finally {
    downloadLocks.delete(bookId);
  }
};

const LIBRARY_SELECT = `SELECT b.*, ub.location, ub.progress, ub.added_at, ub.last_read_at
                          FROM user_books ub JOIN books b ON b.id = ub.book_id`;

/* --------------------------------- Rutas --------------------------------- */

// Buscar en el catálogo: ?q=texto&topic=poesia&lang=es|all&page=1
router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim().slice(0, 100);
    const topic = TOPICS[String(req.query.topic ?? '')];
    const lang = String(req.query.lang ?? 'es');
    const page = Math.max(1, Math.min(1000, Number(req.query.page) || 1));

    const where = [RIGHTS_SQL];
    const params = [];
    if (ALLOWED_LANGUAGES.has(lang)) {
      where.push('FIND_IN_SET(?, c.languages) > 0');
      params.push(lang);
    }
    // Cada palabra debe aparecer en el título o en los autores (sin distinguir tildes/mayúsculas).
    for (const word of q.split(/\s+/).filter(Boolean).slice(0, 6)) {
      const like = `%${word.replace(/[\\%_]/g, '\\$&')}%`;
      where.push('(c.title LIKE ? OR c.authors_text LIKE ?)');
      params.push(like, like);
    }
    if (topic) {
      where.push(`(${topic.map(() => '(c.bookshelves LIKE ? OR c.subjects LIKE ?)').join(' OR ')})`);
      for (const pattern of topic) params.push(`%${pattern}%`, `%${pattern}%`);
    }
    const whereSql = where.join(' AND ');

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM catalog_books c WHERE ${whereSql}`, params);
    const [rows] = await pool.query(
      `SELECT c.id, c.title, c.authors, c.languages, (ub.book_id IS NOT NULL) AS in_library
         FROM catalog_books c
         LEFT JOIN user_books ub ON ub.book_id = c.id AND ub.user_id = ?
        WHERE ${whereSql}
        ORDER BY FIELD(c.id, ${FEATURED_BOOK_IDS.map(() => '?').join(', ') || 'NULL'}) > 0 DESC, c.featured DESC, c.id ASC
        LIMIT ? OFFSET ?`,
      [req.user.id, ...params, ...FEATURED_BOOK_IDS, PAGE_SIZE, (page - 1) * PAGE_SIZE],
    );

    res.json({
      total,
      page,
      hasMore: page * PAGE_SIZE < total,
      books: rows.map(toCatalogBook),
    });
  } catch (error) {
    next(error);
  }
});

// Libros recomendados (tarjeta principal de la Biblioteca).
router.get('/featured', async (req, res, next) => {
  try {
    if (!FEATURED_BOOK_IDS.length) return res.json({ books: [] });
    const [rows] = await pool.query(
      `SELECT c.id, c.title, c.authors, c.languages, c.subjects, (ub.book_id IS NOT NULL) AS in_library, ub.progress
         FROM catalog_books c
         LEFT JOIN user_books ub ON ub.book_id = c.id AND ub.user_id = ?
        WHERE c.id IN (?) AND ${RIGHTS_SQL}
        ORDER BY FIELD(c.id, ?)`,
      [req.user.id, FEATURED_BOOK_IDS, FEATURED_BOOK_IDS],
    );
    return res.json({
      books: rows.map((row) => ({
        ...toCatalogBook(row),
        progress: Number(row.progress ?? 0),
        subjects: String(row.subjects || '').split('; ').filter(Boolean).slice(0, 4),
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// Mi biblioteca (con progreso), lo último leído primero.
router.get('/library', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `${LIBRARY_SELECT} WHERE ub.user_id = ? ORDER BY COALESCE(ub.last_read_at, ub.added_at) DESC`,
      [req.user.id],
    );
    res.json({ books: rows.map((row) => toLibraryBook(req, row)) });
  } catch (error) {
    next(error);
  }
});

// Agregar a mi biblioteca: descarga el EPUB al servidor si aún no está.
router.post('/:id/library', async (req, res, next) => {
  try {
    const bookId = parseBookId(req);
    await ensureBookDownloaded(bookId);
    await pool.query('INSERT IGNORE INTO user_books (user_id, book_id) VALUES (?, ?)', [req.user.id, bookId]);
    const [[row]] = await pool.query(`${LIBRARY_SELECT} WHERE ub.user_id = ? AND ub.book_id = ?`, [
      req.user.id,
      bookId,
    ]);
    res.status(201).json({ book: toLibraryBook(req, row) });
  } catch (error) {
    next(error);
  }
});

// Quitar de mi biblioteca (el archivo se conserva para otros usuarios).
router.delete('/:id/library', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM user_books WHERE user_id = ? AND book_id = ?', [req.user.id, parseBookId(req)]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// Archivo EPUB (solo para libros en la biblioteca del usuario).
router.get('/:id/file', async (req, res, next) => {
  try {
    const bookId = parseBookId(req);
    const [[row]] = await pool.query(`${LIBRARY_SELECT} WHERE ub.user_id = ? AND ub.book_id = ?`, [
      req.user.id,
      bookId,
    ]);
    if (!row) return res.status(404).json({ error: 'Agrega el libro a tu biblioteca para leerlo.' });

    const book = await ensureBookDownloaded(bookId); // recupera el archivo si se perdió
    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return createReadStream(path.join(LIBRARY_DIR, path.basename(book.epub_path)))
      .on('error', next)
      .pipe(res);
  } catch (error) {
    return next(error);
  }
});

// Guardar progreso de lectura.
router.put('/:id/progress', async (req, res, next) => {
  try {
    const bookId = parseBookId(req);
    const location = String(req.body.location ?? '').slice(0, 500) || null;
    const progress = Math.max(0, Math.min(1, Number(req.body.progress) || 0));
    const [result] = await pool.query(
      'UPDATE user_books SET location = ?, progress = ?, last_read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND book_id = ?',
      [location, progress, req.user.id, bookId],
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'El libro no está en tu biblioteca.' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

/** Mantenimiento: borra del disco los libros que ningún usuario tiene (no se expone por HTTP). */
export const removeOrphanBooks = async () => {
  const [rows] = await pool.query(
    'SELECT b.id, b.epub_path, b.cover_path FROM books b LEFT JOIN user_books ub ON ub.book_id = b.id WHERE ub.book_id IS NULL',
  );
  for (const row of rows) {
    for (const p of [row.epub_path, row.cover_path].filter(Boolean)) {
      await unlink(path.join(LIBRARY_DIR, p.replace(/^library\//, ''))).catch(() => {});
    }
    await pool.query('DELETE FROM books WHERE id = ?', [row.id]);
  }
  return rows.length;
};

export default router;
