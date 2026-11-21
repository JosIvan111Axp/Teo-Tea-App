// Configuración compartida para Project Gutenberg.
// Espejo oficial de la Project Gutenberg Literary Archive Foundation (configurable en .env).
export const GUTENBERG_MIRROR = (process.env.GUTENBERG_MIRROR || 'https://gutenberg.pglaf.org').replace(/\/$/, '');
export const USER_AGENT = 'TeoTeaApp/0.1 (biblioteca de prototipo)';

// Regla conservadora de dominio público para la región: autor y traductor fallecidos
// hace más de 70 años (p. ej. Ecuador). Ajustable con PUBLIC_DOMAIN_YEARS.
export const YEARS_AFTER_DEATH = Number(process.env.PUBLIC_DOMAIN_YEARS || 70);

/** URLs candidatas del EPUB, en orden de preferencia (EPUB3 con imágenes primero). */
export const epubCandidates = (id) => [
  `${GUTENBERG_MIRROR}/cache/epub/${id}/pg${id}-images-3.epub`,
  `${GUTENBERG_MIRROR}/cache/epub/${id}/pg${id}-images.epub`,
  `${GUTENBERG_MIRROR}/cache/epub/${id}/pg${id}.epub`,
  `https://www.gutenberg.org/ebooks/${id}.epub3.images`,
];

export const coverUrl = (id) => `${GUTENBERG_MIRROR}/cache/epub/${id}/pg${id}.cover.medium.jpg`;
