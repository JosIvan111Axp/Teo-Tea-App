// Logros y niveles de TEO + TEA.
// Los logros se calculan en el servidor a partir de lo que la persona hace en la app
// (datos reales de MySQL + eventos de uso), así el progreso sigue a la cuenta en cualquier dispositivo.
import { pool } from './db.js';

export const MAX_LEVEL = 100;

/** XP total necesaria para llegar a un nivel (curva progresiva: cada nivel cuesta más). */
export const xpForLevel = (level) => Math.round(15 * Math.pow(Math.max(0, level - 1), 1.9));

export const levelFromXp = (xp) => {
  let level = 1;
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= xp) level += 1;
  return level;
};

const LEVEL_TITLES = [
  [100, 'Leyenda de TEO + TEA'],
  [75, 'Leyenda en camino'],
  [50, 'Capitán del sendero'],
  [25, 'Navegante'],
  [10, 'Aventurero'],
  [1, 'Explorador'],
];
export const levelTitle = (level) => LEVEL_TITLES.find(([min]) => level >= min)[1];

export const SECTIONS = ['inicio', 'biblioteca', 'musica', 'comunidad', 'derechos', 'trabajo', 'informacion', 'perfil'];

/* ------------------------------ Catálogo de logros ------------------------------ */
// metric: dato que se mide · goal: meta · xp: experiencia que otorga al desbloquearse.
export const ACHIEVEMENTS = [
  // Biblioteca
  { id: 'lib-visit', category: 'biblioteca', name: 'Primer vistazo', description: 'Abre la Biblioteca.', metric: 'visit:biblioteca', goal: 1, xp: 10 },
  { id: 'lib-treasure', category: 'biblioteca', name: '¡Al abordaje!', description: 'Empieza a leer La isla del tesoro.', metric: 'treasure_started', goal: 1, xp: 30 },
  { id: 'lib-add-1', category: 'biblioteca', name: 'Coleccionista novato', description: 'Agrega tu primer libro.', metric: 'books_in_library', goal: 1, xp: 20 },
  { id: 'lib-add-10', category: 'biblioteca', name: 'Estantería con vida', description: 'Ten 10 libros en tu biblioteca.', metric: 'books_in_library', goal: 10, xp: 80 },
  { id: 'lib-add-50', category: 'biblioteca', name: 'Biblioteca de Alejandría', description: 'Ten 50 libros en tu biblioteca.', metric: 'books_in_library', goal: 50, xp: 300 },
  { id: 'lib-read-1', category: 'biblioteca', name: 'Primera aventura completada', description: 'Termina de leer un libro.', metric: 'books_finished', goal: 1, xp: 100 },
  { id: 'lib-read-10', category: 'biblioteca', name: 'Devorador de páginas', description: 'Termina 10 libros.', metric: 'books_finished', goal: 10, xp: 500 },
  { id: 'lib-read-100', category: 'biblioteca', name: 'Leyenda de las letras', description: 'Termina 100 libros.', metric: 'books_finished', goal: 100, xp: 3000 },
  { id: 'lib-read-1000', category: 'biblioteca', name: 'Guardián del conocimiento', description: 'Termina 1000 libros.', metric: 'books_finished', goal: 1000, xp: 20000 },

  // Música
  { id: 'mus-visit', category: 'musica', name: 'Primera nota', description: 'Abre Música.', metric: 'visit:musica', goal: 1, xp: 10 },
  { id: 'mus-import-1', category: 'musica', name: 'DJ en casa', description: 'Importa tu primera canción.', metric: 'songs_imported', goal: 1, xp: 20 },
  { id: 'mus-import-25', category: 'musica', name: 'Discoteca personal', description: 'Importa 25 canciones.', metric: 'songs_imported', goal: 25, xp: 100 },
  { id: 'mus-play-10', category: 'musica', name: 'Melómano en formación', description: 'Escucha 10 canciones completas.', metric: 'music_plays', goal: 10, xp: 50 },
  { id: 'mus-play-100', category: 'musica', name: 'Oído de oro', description: 'Escucha 100 canciones completas.', metric: 'music_plays', goal: 100, xp: 300 },
  { id: 'mus-play-1000', category: 'musica', name: 'Maestro de la sinfonía', description: 'Escucha 1000 canciones completas.', metric: 'music_plays', goal: 1000, xp: 2000 },

  // Comunidad
  { id: 'com-visit', category: 'comunidad', name: 'Hola, comunidad', description: 'Abre la Comunidad.', metric: 'visit:comunidad', goal: 1, xp: 10 },
  { id: 'com-rules', category: 'comunidad', name: 'Ciudadano ejemplar', description: 'Acepta las normas de la comunidad.', metric: 'rules_accepted', goal: 1, xp: 20 },
  { id: 'com-post-1', category: 'comunidad', name: 'Rompiendo el hielo', description: 'Publica por primera vez.', metric: 'posts', goal: 1, xp: 30 },
  { id: 'com-post-10', category: 'comunidad', name: 'Voz de la comunidad', description: 'Publica 10 veces.', metric: 'posts', goal: 10, xp: 150 },
  { id: 'com-post-100', category: 'comunidad', name: 'Faro de la comunidad', description: 'Publica 100 veces.', metric: 'posts', goal: 100, xp: 1000 },
  { id: 'com-comment-10', category: 'comunidad', name: 'Buen conversador', description: 'Escribe 10 comentarios.', metric: 'comments', goal: 10, xp: 100 },
  { id: 'com-comment-100', category: 'comunidad', name: 'Puente entre personas', description: 'Escribe 100 comentarios.', metric: 'comments', goal: 100, xp: 600 },
  { id: 'com-like-10', category: 'comunidad', name: 'Corazón generoso', description: 'Da 10 "Me gusta".', metric: 'likes_given', goal: 10, xp: 50 },
  { id: 'com-like-100', category: 'comunidad', name: 'Lluvia de corazones', description: 'Da 100 "Me gusta".', metric: 'likes_given', goal: 100, xp: 300 },
  { id: 'com-like-1000', category: 'comunidad', name: 'Fuente de cariño', description: 'Da 1000 "Me gusta".', metric: 'likes_given', goal: 1000, xp: 1500 },

  // Leyes y Derechos
  { id: 'law-visit', category: 'derechos', name: 'Conozco mis derechos', description: 'Abre Leyes y Derechos.', metric: 'visit:derechos', goal: 1, xp: 10 },
  { id: 'law-areas', category: 'derechos', name: 'Doble escudo', description: 'Revisa los derechos laborales y de protección al ciudadano.', metric: 'law_areas', goal: 2, xp: 30 },
  { id: 'law-countries', category: 'derechos', name: 'Explorador andino', description: 'Revisa las leyes de los 4 países.', metric: 'law_countries', goal: 4, xp: 60 },
  { id: 'law-links-1', category: 'derechos', name: 'Lector de leyes', description: 'Abre un texto oficial.', metric: 'law_links', goal: 1, xp: 30 },
  { id: 'law-links-5', category: 'derechos', name: 'Jurista en formación', description: 'Abre 5 textos oficiales distintos.', metric: 'law_links', goal: 5, xp: 120 },

  // Trabajo
  { id: 'job-visit', category: 'trabajo', name: 'Manos a la obra', description: 'Abre Trabajo.', metric: 'visit:trabajo', goal: 1, xp: 10 },
  { id: 'job-linkedin', category: 'trabajo', name: 'Perfil profesional', description: 'Lee los 8 pasos del tutorial de LinkedIn.', metric: 'linkedin_steps', goal: 8, xp: 80 },
  { id: 'job-sites', category: 'trabajo', name: 'Buscador de oportunidades', description: 'Visita 3 portales de empleo.', metric: 'job_sites', goal: 3, xp: 60 },

  // Fundación
  { id: 'fnd-1', category: 'fundacion', name: 'Amigo del Sendero', description: 'Visita un espacio de la Fundación Sendero Azul.', metric: 'foundation_links', goal: 1, xp: 20 },
  { id: 'fnd-3', category: 'fundacion', name: 'Sendero Azul de corazón', description: 'Visita 3 espacios distintos de la fundación.', metric: 'foundation_links', goal: 3, xp: 60 },

  // Información
  { id: 'info-1', category: 'informacion', name: 'Curiosidad encendida', description: 'Lee un artículo de Información.', metric: 'info_articles', goal: 1, xp: 15 },
  { id: 'info-all', category: 'informacion', name: 'Sabio del espectro', description: 'Lee todos los artículos de Información.', metric: 'info_articles', goal: 3, xp: 60 },

  // Perfil
  { id: 'prof-complete', category: 'perfil', name: 'Esta es mi historia', description: 'Completa tu biografía, habilidades y gustos.', metric: 'profile_complete', goal: 1, xp: 50 },
  { id: 'prof-start', category: 'perfil', name: 'A mi manera', description: 'Elige la página en la que se abre tu app.', metric: 'start_page_set', goal: 1, xp: 10 },
  { id: 'prof-dark', category: 'perfil', name: 'Criatura de la noche', description: 'Activa el modo oscuro.', metric: 'dark_mode', goal: 1, xp: 10 },
  { id: 'prof-apps', category: 'perfil', name: 'Explorador de apps', description: 'Abre 3 apps recomendadas.', metric: 'apps_opened', goal: 3, xp: 40 },

  // Constancia
  { id: 'all-sections', category: 'constancia', name: 'Todoterreno', description: 'Visita todas las secciones de la app.', metric: 'sections_visited', goal: SECTIONS.length, xp: 100 },
  { id: 'days-3', category: 'constancia', name: 'Buen comienzo', description: 'Usa la app 3 días distintos.', metric: 'days', goal: 3, xp: 30 },
  { id: 'days-7', category: 'constancia', name: 'Una semana conmigo', description: 'Usa la app 7 días distintos.', metric: 'days', goal: 7, xp: 80 },
  { id: 'days-30', category: 'constancia', name: 'Hábito de oro', description: 'Usa la app 30 días distintos.', metric: 'days', goal: 30, xp: 400 },
  { id: 'days-100', category: 'constancia', name: 'Centenario', description: 'Usa la app 100 días distintos.', metric: 'days', goal: 100, xp: 1500 },
  { id: 'days-365', category: 'constancia', name: 'Un año juntos', description: 'Usa la app 365 días distintos.', metric: 'days', goal: 365, xp: 5000 },
];

/* ------------------------------- Eventos de uso ------------------------------- */
// Tipos de evento permitidos y validación de su referencia.
const SLUG = /^[a-z0-9-]{1,60}$/;
export const EVENT_TYPES = {
  visit: (ref) => SECTIONS.includes(ref),
  law_area: (ref) => ['laboral', 'ciudadano'].includes(ref),
  law_country: (ref) => ['ecuador', 'colombia', 'peru', 'venezuela'].includes(ref),
  law_link: (ref) => SLUG.test(ref),
  job_site: (ref) => SLUG.test(ref),
  linkedin_step: (ref) => /^[1-8]$/.test(ref),
  foundation_link: (ref) => SLUG.test(ref),
  info_article: (ref) => SLUG.test(ref),
  app_open: (ref) => SLUG.test(ref),
  dark_mode: () => true,
  start_page_set: () => true,
};
export const COUNTER_TYPES = { music_play: 1, songs_imported: 500 }; // máximo por llamada

export const recordEvent = (userId, type, ref = '') =>
  pool.query('INSERT IGNORE INTO user_events (user_id, event_key) VALUES (?, ?)', [userId, ref ? `${type}:${ref}` : type]);

export const recordDay = (userId) =>
  pool.query("INSERT IGNORE INTO user_events (user_id, event_key) VALUES (?, CONCAT('day:', DATE(UTC_TIMESTAMP())))", [userId]);

export const incrementCounter = (userId, key, amount) =>
  pool.query(
    'INSERT INTO user_counters (user_id, counter_key, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = value + VALUES(value)',
    [userId, key, amount],
  );

/* ---------------------------------- Cálculo ---------------------------------- */
const gatherMetrics = async (userId) => {
  const [[db]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM user_books WHERE user_id = ?) AS books_in_library,
       (SELECT COUNT(*) FROM user_books WHERE user_id = ? AND progress >= 0.98) AS books_finished,
       (SELECT COUNT(*) FROM user_books WHERE user_id = ? AND book_id = 45438 AND (progress > 0 OR location IS NOT NULL)) AS treasure_started,
       (SELECT COUNT(*) FROM posts WHERE user_id = ?) AS posts,
       (SELECT COUNT(*) FROM comments WHERE user_id = ?) AS comments,
       (SELECT COUNT(*) FROM post_likes WHERE user_id = ?) AS likes_given,
       (SELECT community_rules_accepted_at IS NOT NULL FROM users WHERE id = ?) AS rules_accepted,
       (SELECT (COALESCE(bio, '') <> '' AND JSON_LENGTH(COALESCE(skills, '[]')) > 0 AND JSON_LENGTH(COALESCE(interests, '[]')) > 0) FROM users WHERE id = ?) AS profile_complete`,
    Array(8).fill(userId),
  );
  const [events] = await pool.query('SELECT event_key FROM user_events WHERE user_id = ?', [userId]);
  const [counters] = await pool.query('SELECT counter_key, value FROM user_counters WHERE user_id = ?', [userId]);

  const keys = events.map((e) => e.event_key);
  const countPrefix = (prefix) => keys.filter((k) => k.startsWith(prefix)).length;
  const metrics = Object.fromEntries(Object.entries(db).map(([k, v]) => [k, Number(v) || 0]));
  for (const key of keys) if (!key.includes(':') || key.startsWith('visit:')) metrics[key] = 1;
  Object.assign(metrics, {
    days: countPrefix('day:'),
    sections_visited: SECTIONS.filter((s) => keys.includes(`visit:${s}`)).length,
    law_areas: countPrefix('law_area:'),
    law_countries: countPrefix('law_country:'),
    law_links: countPrefix('law_link:'),
    job_sites: countPrefix('job_site:'),
    linkedin_steps: countPrefix('linkedin_step:'),
    foundation_links: countPrefix('foundation_link:'),
    info_articles: countPrefix('info_article:'),
    apps_opened: countPrefix('app_open:'),
  });
  for (const c of counters) metrics[c.counter_key] = Number(c.value);
  return metrics;
};

/** Experiencia por actividad (además de la de los logros). */
const activityXp = (m) =>
  (m.days ?? 0) * 10 +
  (m.posts ?? 0) * 5 +
  (m.comments ?? 0) * 2 +
  (m.likes_given ?? 0) +
  (m.books_in_library ?? 0) * 5 +
  (m.books_finished ?? 0) * 50 +
  (m.music_play ?? m.music_plays ?? 0) * 2;

/**
 * Calcula el estado de logros, guarda los recién desbloqueados y devuelve el resumen.
 */
export const evaluateAchievements = async (userId) => {
  const metrics = await gatherMetrics(userId);
  metrics.music_plays = metrics.music_play ?? 0;

  const [stored] = await pool.query('SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?', [userId]);
  const unlockedAt = new Map(stored.map((r) => [r.achievement_id, new Date(r.unlocked_at).getTime()]));

  const list = ACHIEVEMENTS.map((a) => {
    const value = metrics[a.metric] ?? 0;
    return { ...a, value: Math.min(value, a.goal), unlocked: value >= a.goal };
  });

  const newlyUnlocked = list.filter((a) => a.unlocked && !unlockedAt.has(a.id));
  if (newlyUnlocked.length) {
    await pool.query('INSERT IGNORE INTO user_achievements (user_id, achievement_id) VALUES ?', [
      newlyUnlocked.map((a) => [userId, a.id]),
    ]);
    for (const a of newlyUnlocked) unlockedAt.set(a.id, Date.now());
  }

  const achievementXp = list.filter((a) => a.unlocked).reduce((sum, a) => sum + a.xp, 0);
  const xp = achievementXp + activityXp(metrics);
  const level = levelFromXp(xp);
  const current = xpForLevel(level);
  const next = level >= MAX_LEVEL ? current : xpForLevel(level + 1);

  return {
    level,
    title: levelTitle(level),
    xp,
    levelXp: current,
    nextLevelXp: next,
    maxLevel: MAX_LEVEL,
    unlockedCount: list.filter((a) => a.unlocked).length,
    total: list.length,
    achievements: list.map((a) => ({
      id: a.id,
      category: a.category,
      name: a.name,
      description: a.description,
      goal: a.goal,
      value: a.value,
      xp: a.xp,
      unlocked: a.unlocked,
      unlockedAt: unlockedAt.get(a.id) ?? null,
    })),
    newlyUnlocked: newlyUnlocked.map((a) => ({ id: a.id, name: a.name, xp: a.xp })),
  };
};
