// Importa el catálogo oficial de Project Gutenberg a MySQL (tabla catalog_books).
// Uso: npm run books:sync            (descarga desde el espejo oficial)
//      npm run books:sync -- archivo.csv[.gz]   (usa un archivo local)
// Se puede ejecutar periódicamente (p. ej. 1 vez por semana) para traer libros nuevos.
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { pool } from '../src/db.js';
import { GUTENBERG_MIRROR, USER_AGENT, YEARS_AFTER_DEATH } from '../src/gutenberg.js';

const FEATURED_PATTERN = /Best Books Ever|Harvard Classics|Best Loved Spanish|Classics of Literature/i;

/** Parser CSV (RFC 4180): comillas, comas y saltos de línea dentro de campos. */
function* parseCsv(text) {
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      yield row;
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    yield row;
  }
}

/** "Cervantes Saavedra, Miguel de, 1547-1616 [Translator]" → { name, birth, death, role } */
const parsePerson = (raw) => {
  let text = raw.trim();
  let role = 'Author';
  const roleMatch = /\s*\[([^\]]+)\]\s*$/.exec(text);
  if (roleMatch) {
    role = roleMatch[1];
    text = text.slice(0, roleMatch.index);
  }
  let birth = null;
  let death = null;
  // Años al final: "1547-1616", "1547?-1616", "-1616", "1547-", "621? BCE-565? BCE", "active 1800"
  const yearsMatch = /,\s*([^,]*\d[^,]*)$/.exec(text);
  if (yearsMatch && /^(active\s+|fl\.\s*)?[\d?]*\s*(BCE)?\s*-?\s*[\d?]*\s*(BCE)?$/i.test(yearsMatch[1].trim())) {
    const part = yearsMatch[1].trim();
    text = text.slice(0, yearsMatch.index);
    const toYear = (s) => {
      const m = /(\d+)\??\s*(BCE)?/.exec(s ?? '');
      if (!m) return null;
      return m[2] ? -Number(m[1]) : Number(m[1]);
    };
    if (!/^(active|fl\.)/i.test(part)) {
      const [b, d] = part.split('-');
      birth = toYear(b);
      death = toYear(d);
    }
  }
  const [last, first] = text.split(', ');
  const name = (first ? `${first} ${last}` : last).trim();
  return { name, birth, death, role };
};

/** Año desde el que la obra es de dominio público (autor/traductor + 70 años). */
const rightsYear = (people) => {
  let year = null;
  for (const p of people) {
    let candidate = null;
    if (p.death != null) candidate = p.death + YEARS_AFTER_DEATH + 1;
    else if (p.birth != null) candidate = p.birth + 100 + YEARS_AFTER_DEATH + 1; // vida máx. estimada
    if (candidate != null && (year == null || candidate > year)) year = candidate;
  }
  return year;
};

const toDate = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);

const loadCsvText = async () => {
  const localPath = process.argv[2];
  let buffer;
  if (localPath) {
    console.log(`Leyendo ${localPath}...`);
    buffer = await readFile(localPath);
  } else {
    const url = `${GUTENBERG_MIRROR}/cache/epub/feeds/pg_catalog.csv.gz`;
    console.log(`Descargando catálogo desde ${url} (puede tardar 1-2 min)...`);
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(600000) });
    if (!response.ok) throw new Error(`El espejo respondió ${response.status}`);
    buffer = Buffer.from(await response.arrayBuffer());
  }
  const isGzip = buffer[0] === 0x1f && buffer[1] === 0x8b;
  return (isGzip ? gunzipSync(buffer) : buffer).toString('utf8');
};

try {
  const text = await loadCsvText();
  const rows = parseCsv(text);
  const header = rows.next().value;
  const col = Object.fromEntries(header.map((name, index) => [name.trim(), index]));
  for (const required of ['Text#', 'Type', 'Title', 'Language', 'Authors']) {
    if (!(required in col)) throw new Error(`El CSV no tiene la columna ${required}`);
  }

  const batch = [];
  let imported = 0;
  const flush = async () => {
    if (!batch.length) return;
    await pool.query(
      `INSERT INTO catalog_books (id, title, authors, authors_text, languages, subjects, bookshelves, issued, rights_year, featured)
       VALUES ?
       ON DUPLICATE KEY UPDATE title = VALUES(title), authors = VALUES(authors), authors_text = VALUES(authors_text),
         languages = VALUES(languages), subjects = VALUES(subjects), bookshelves = VALUES(bookshelves),
         issued = VALUES(issued), rights_year = VALUES(rights_year), featured = VALUES(featured)`,
      [batch.splice(0)],
    );
  };

  for (const row of rows) {
    if (row.length < header.length || row[col.Type] !== 'Text') continue;
    const id = Number(row[col['Text#']]);
    if (!Number.isInteger(id) || id <= 0) continue;

    const people = row[col.Authors] ? row[col.Authors].split(';').map(parsePerson).filter((p) => p.name) : [];
    const bookshelves = row[col.Bookshelves] ?? '';
    batch.push([
      id,
      row[col.Title].replace(/\s+/g, ' ').trim().slice(0, 1000),
      JSON.stringify(people),
      people.map((p) => p.name).join('; ').slice(0, 1000),
      row[col.Language].replace(/\s+/g, '').replace(/;/g, ',').slice(0, 60),
      row[col.Subjects] ?? '',
      bookshelves,
      toDate(row[col.Issued]),
      rightsYear(people),
      FEATURED_PATTERN.test(bookshelves) ? 1 : 0,
    ]);
    imported += 1;
    if (batch.length >= 1000) {
      await flush();
      process.stdout.write(`\r  ${imported} libros importados...`);
    }
  }
  await flush();

  const [[stats]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(FIND_IN_SET('es', languages) > 0) AS es,
            SUM(FIND_IN_SET('es', languages) > 0 AND (rights_year IS NULL OR rights_year <= YEAR(CURDATE()))) AS es_libres
       FROM catalog_books`,
  );
  console.log(`\n✔ Catálogo sincronizado: ${stats.total} libros (${stats.es} en español, ${stats.es_libres} disponibles por derechos).`);
} catch (error) {
  console.error('\n✖ Error sincronizando el catálogo:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
