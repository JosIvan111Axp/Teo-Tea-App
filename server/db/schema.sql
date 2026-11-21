-- Esquema de TEO + TEA. Se puede ejecutar varias veces sin borrar datos.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(60) NOT NULL,
  profession VARCHAR(120) NOT NULL DEFAULT '',
  birthdate DATE NULL,
  city VARCHAR(120) NOT NULL DEFAULT '',
  country VARCHAR(80) NOT NULL DEFAULT '',
  bio TEXT NULL,
  skills JSON NULL,
  interests JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  image_path VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_posts_created (created_at),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_likes (
  post_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  CONSTRAINT fk_likes_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  text VARCHAR(300) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comments_post (post_id, created_at),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Biblioteca: libros descargados desde Gutendex (Project Gutenberg).
CREATE TABLE IF NOT EXISTS books (
  id INT UNSIGNED PRIMARY KEY,               -- mismo ID que Project Gutenberg
  title VARCHAR(500) NOT NULL,
  authors JSON NULL,
  translators JSON NULL,
  languages JSON NULL,
  subjects JSON NULL,
  cover_path VARCHAR(255) NULL,
  epub_path VARCHAR(255) NULL,
  file_size INT UNSIGNED NULL,
  source_url VARCHAR(500) NULL,
  downloaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Libros que cada usuario agregó a su biblioteca + progreso de lectura.
CREATE TABLE IF NOT EXISTS user_books (
  user_id INT UNSIGNED NOT NULL,
  book_id INT UNSIGNED NOT NULL,
  location VARCHAR(500) NULL,                -- posición EPUB (CFI)
  progress DECIMAL(5,4) NOT NULL DEFAULT 0,  -- 0..1
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP NULL,
  PRIMARY KEY (user_id, book_id),
  CONSTRAINT fk_ub_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_ub_book FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catálogo de Project Gutenberg importado con `npm run books:sync` (búsqueda local y rápida).
CREATE TABLE IF NOT EXISTS catalog_books (
  id INT UNSIGNED PRIMARY KEY,
  title VARCHAR(1000) NOT NULL,
  authors JSON NULL,                         -- [{ name, birth, death, role }]
  authors_text VARCHAR(1000) NOT NULL DEFAULT '',
  languages VARCHAR(60) NOT NULL DEFAULT '', -- "es" o "es,en"
  subjects TEXT NULL,
  bookshelves TEXT NULL,
  issued DATE NULL,
  rights_year SMALLINT NULL,                 -- año desde el que es dominio público aquí (NULL = sin datos)
  featured TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_catalog_lang (languages),
  INDEX idx_catalog_featured (featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reportes de la comunidad (publicaciones o comentarios) para moderación.
CREATE TABLE IF NOT EXISTS reports (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id INT UNSIGNED NOT NULL,
  comment_id INT UNSIGNED NULL,              -- NULL = se reporta la publicación
  reporter_id INT UNSIGNED NOT NULL,
  reason VARCHAR(60) NOT NULL,
  details VARCHAR(300) NOT NULL DEFAULT '',
  status ENUM('pending', 'resolved', 'dismissed') NOT NULL DEFAULT 'pending',
  resolved_by INT UNSIGNED NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reports_status (status, created_at),
  CONSTRAINT fk_reports_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_comment FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_resolver FOREIGN KEY (resolved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registro de acciones de moderadores y administradores (auditoría).
CREATE TABLE IF NOT EXISTS moderation_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id INT UNSIGNED NULL,
  action VARCHAR(40) NOT NULL,
  target_user_id INT UNSIGNED NULL,
  details VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_modlog_created (created_at),
  CONSTRAINT fk_modlog_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_modlog_target FOREIGN KEY (target_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Logros: acciones únicas (visitas a secciones, días de uso, etc.).
CREATE TABLE IF NOT EXISTS user_events (
  user_id INT UNSIGNED NOT NULL,
  event_key VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, event_key),
  CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Logros: contadores (canciones escuchadas, etc.).
CREATE TABLE IF NOT EXISTS user_counters (
  user_id INT UNSIGNED NOT NULL,
  counter_key VARCHAR(40) NOT NULL,
  value INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, counter_key),
  CONSTRAINT fk_counters_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Logros desbloqueados (para avisar "¡Logro nuevo!" una sola vez).
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id INT UNSIGNED NOT NULL,
  achievement_id VARCHAR(60) NOT NULL,
  unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id),
  CONSTRAINT fk_ach_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
