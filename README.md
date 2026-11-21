# TEO + TEA

**Un espacio para explorar, aprender y conectar a tu manera.**
Aplicación de información, acompañamiento e inclusión para personas con Trastorno del Espectro Autista (TEA),
otras personas neurodivergentes, sus familias y su entorno. Es un espacio de la
[Fundación Sendero Azul](https://fundacionsenderoazul.org/).

> Estado: **prototipo funcional en desarrollo**. La app web y la API funcionan de punta a punta con MySQL, y ya se
> compila como app Android (APK de depuración). Aún no está publicada en tiendas ni desplegada en un servidor público.

---

## 1. ¿Qué incluye la app hoy?

| Sección | Qué se puede hacer |
|---|---|
| **Cuenta** | Registro en 2 pasos (datos + "¿cómo te identificas?"), inicio y cierre de sesión. La sesión se renueva sola cada vez que se abre la app. |
| **Inicio** | Saludo personalizado, accesos a cada sección, "Quiénes nos acompañan" y "Conoce a la Fundación Sendero Azul" (misión, sitio web, redes y donaciones). Trofeo de logros, modo oscuro y perfil en la esquina superior. |
| **Biblioteca** | Catálogo abierto de libros de dominio público de [Project Gutenberg](https://www.gutenberg.org) (≈78 000 títulos, ≈800 en español disponibles por derechos). Libro recomendado: *La isla del tesoro*. Lector EPUB con páginas, índice, tamaño y tipo de letra (incl. "Legible"), fondo claro/sepia/oscuro, interlineado y progreso sincronizado. |
| **Música** | Reproductor **solo local**: cada persona importa sus propios archivos (MP3, M4A, OGG, WAV…), que nunca salen del dispositivo. Playlists (crear, reordenar, aleatorio), cola de reproducción, mini reproductor y controles en la pantalla de bloqueo. **Cuidado auditivo**: limitador de volumen, suavizado de sonidos fuertes con potencia ajustable y transición suave. Opciones de música en segundo plano, con la pantalla apagada y mantener la pantalla encendida. |
| **Comunidad** | Publicaciones con imagen, comentarios, "Me gusta", compartir, búsqueda y filtros. **Normas de uso** que se aceptan antes de la primera publicación; el servidor bloquea enlaces, correos y teléfonos. Reportes de contenido. |
| **Leyes y Derechos** | Derechos **laborales** y de **protección al ciudadano** de Ecuador, Colombia, Perú y Venezuela, en lenguaje claro, con enlaces a los textos oficiales y "¿A dónde acudir?". |
| **Trabajo** | Frase motivacional, portales de empleo por país (incl. Incluyeme.com, empleo inclusivo), tutorial de LinkedIn paso a paso y consejos para la búsqueda. |
| **Información** | Artículos claros sobre el TEA, la neurodiversidad y la sensibilidad sensorial. |
| **Perfil** | Foto de perfil, biografía, habilidades y gustos, resumen de logros, apps recomendadas (Chess.com, Lichess, Khan Academy, ibisPaint X, Duolingo), modo oscuro, estilo de íconos y **página en la que se abre la app**. |
| **Logros** | 47 logros en 9 categorías (Biblioteca, Música, Comunidad, Leyes, Trabajo, Fundación, Información, Perfil y Constancia) y niveles del 1 al 100 con curva progresiva. |

Todos los enlaces externos piden confirmación ("¿Seguro que quieres ir a…?") antes de salir de la app.

### Roles y moderación

| Acción | Usuario | Moderador | Administrador |
|---|:-:|:-:|:-:|
| Reportar publicaciones o comentarios | ✅ | ✅ | ✅ |
| Revisar reportes, descartar o eliminar contenido | | ✅ | ✅ |
| **Congelar la participación** en la comunidad (puede leer, no publicar) | | 1–30 días | hasta indefinido |
| **Suspender la cuenta** | | 1–30 días | hasta indefinido |
| Gestionar usuarios y roles, estadísticas, registro de auditoría | | | ✅ |

Toda acción del equipo queda en un registro de auditoría. Las cuentas de equipo (`moderador@teotea.app`,
`admin@teotea.app`) se crean con contraseña aleatoria al ejecutar `npm run db:init` (se muestra una sola vez).

### Accesibilidad

- Navegación simple: 4 pestañas (Inicio, Biblioteca, Música, Comunidad) y perfil arriba a la derecha.
- Modo claro y oscuro con contraste verificado; paleta morado + verde definida en un solo lugar (`src/theme/variables.css`).
- Textos en lenguaje claro, botones grandes, etiquetas para lectores de pantalla y respeto de "reducir movimiento".
- Opciones sensoriales en la lectura y en la música (fuentes legibles, fondos, limitador y suavizado de volumen).

---

## 2. Personajes de referencia

El diseño se apoya en dos perfiles representativos (no son reglas universales: cada persona es distinta).

- **Teo** (28 años, neurotípico): espontáneo, sociable y expresivo. Representa la comunicación, la colaboración y el networking.
- **Tea** (26 años, autista): tranquila, perspicaz, detallista y planificadora. Representa la necesidad de información estructurada, preparación y claridad.

## 3. Público objetivo

Personas autistas y neurodivergentes, familias y cuidadores, personas neurotípicas que quieren aprender sobre
neurodiversidad, personas en búsqueda de empleo y empleadores interesados en la inclusión.

---

## 4. Arquitectura

```
App (Ionic + React)  ──HTTP/JSON──▶  API (Node.js + Express)  ──▶  MySQL 8 (base "teotea")
   web / Android (Capacitor)               │
   └─ música e IndexedDB: solo local       ├─▶ server/uploads/   imágenes y fotos de perfil
                                           └─▶ server/library/   EPUB y portadas descargados
                                                 ▲
                         Catálogo y libros ──────┘  espejo oficial de Project Gutenberg
```

| Capa | Tecnología |
|---|---|
| Interfaz | React 19, Ionic 9, TypeScript, React Router 6, Zustand |
| Lector de libros | epub.js (carga diferida) |
| Música | Web Audio API (compresor, limitador, fundidos), IndexedDB, Media Session |
| App nativa | Capacitor 8 (Android) + plugins `@capgo/capacitor-media-session`, `@capacitor-community/keep-awake` y el plugin propio `ScreenState` |
| API | Node.js 22, Express 4, `mysql2`, `bcryptjs`, JWT |
| Base de datos | MySQL 8 |
| Pruebas y calidad | Vitest, ESLint, TypeScript estricto |

### Estructura del repositorio

```text
├── src/                      App (Ionic + React)
│   ├── pages/                Pantallas (Inicio, Biblioteca, Lector, Música, Comunidad, Leyes, Trabajo, Perfil, Logros, Equipo…)
│   ├── components/           Componentes reutilizables (avatar, mini reproductor, normas, playlists, enlaces externos…)
│   ├── store/                Estado (sesión, comunidad, libros, música, logros, tema)
│   ├── music/                Almacenamiento local, sesión multimedia y pantalla encendida
│   ├── api/                  Cliente HTTP y llamadas del panel del equipo
│   ├── data/                 Contenidos (información, leyes, fundación)
│   └── theme/variables.css   Paleta y modo oscuro
├── server/                   API (Express + MySQL)
│   ├── src/routes/           auth, posts, books, staff, me (logros)
│   ├── src/achievements.js   Catálogo de logros y cálculo de niveles
│   └── db/                   schema.sql, init.js (tablas + migraciones), sync-catalog.js (Gutenberg)
├── android/                  Proyecto Android (Capacitor)
├── assets/                   Imágenes, logos e íconos ilustrados (assets/icons/ilustrado)
├── resources/                Logo fuente para generar los íconos de la app
├── docs/FASE2-ANDROID.md     Guía para compilar e instalar la app Android
└── docs/GOOGLE-PLAY.md       Guía y costos para publicar en Google Play
```

---

## 5. Puesta en marcha (desarrollo)

### Requisitos

- Node.js 22 y npm.
- MySQL 8 con una base y un usuario propios para la app (no usar root):

  ```sql
  CREATE DATABASE IF NOT EXISTS teotea CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'teotea_app'@'localhost' IDENTIFIED BY 'TU_CLAVE';
  GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON teotea.* TO 'teotea_app'@'localhost';
  ```

### Pasos

```bash
npm install                 # dependencias de la app
npm run api:install         # dependencias de la API
cp server/.env.example server/.env   # y completar DB_PASSWORD y JWT_SECRET
npm run db:init             # crea tablas, aplica migraciones y carga datos de ejemplo
npm run books:sync          # importa el catálogo de Project Gutenberg (≈1 min)

npm run api                 # API en http://localhost:3001/api
npm run dev                 # App en http://localhost:5173
```

Cuenta de prueba: `demo@teotea.app` / `demo1234`.
Para usarla desde el celular en la misma Wi-Fi: `http://<IP-de-tu-PC>:5173` (permite el puerto 3001 en el firewall).

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo de la app (Vite). |
| `npm run build` | Compila la app para producción (`dist/`). |
| `npm run lint` · `npx tsc --noEmit` | Revisión de código y de tipos. |
| `npm run test.unit` | Pruebas unitarias (Vitest). |
| `npm run api` | API con recarga automática. |
| `npm run db:init` | Tablas, migraciones, datos de ejemplo y cuentas de equipo (seguro de repetir). |
| `npm run books:sync` | Actualiza el catálogo de libros. |

---

## 6. App Android

El proyecto ya compila como APK. Requisitos: **JDK 21** y **Android SDK** (plataforma 36, build-tools 35); ver la guía
completa en [`docs/FASE2-ANDROID.md`](docs/FASE2-ANDROID.md). Para publicar en la tienda, con costos y requisitos, ver [`docs/GOOGLE-PLAY.md`](docs/GOOGLE-PLAY.md).

```bash
# .env.local → VITE_NATIVE_API_URL=http://<IP-de-tu-PC>:3001/api   (ver .env.example)
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug      # → android/app/build/outputs/apk/debug/app-debug.apk
```

La música usa un servicio en primer plano de tipo "reproducción multimedia" para seguir sonando en segundo plano y
con la pantalla apagada, con controles en la notificación. Íconos y pantalla de carga se generan desde
`resources/logo.png` con `npx capacitor-assets generate --android --assetPath resources`.

---

## 7. Base de datos

| Tabla | Contenido |
|---|---|
| `users` | Cuentas, perfil, rol de equipo, suspensión, congelamiento de comunidad, página de inicio, foto. |
| `posts`, `comments`, `post_likes` | Comunidad. |
| `reports`, `moderation_log` | Reportes y auditoría del equipo. |
| `catalog_books` | Catálogo de Project Gutenberg (búsqueda local). |
| `books`, `user_books` | Libros descargados al servidor y biblioteca/progreso de cada persona. |
| `user_events`, `user_counters`, `user_achievements` | Logros y niveles. |

Los EPUB y las imágenes se guardan en disco (`server/library`, `server/uploads`), no dentro de MySQL.
La música **no** pasa por el servidor: vive en el almacenamiento del dispositivo de cada persona.

---

## 8. Próximos pasos

- Módulo **Empresas** (recursos para organizaciones inclusivas) y ofertas laborales propias.
- Onboarding con objetivos e intereses para personalizar el Inicio.
- Recuperación y cambio de contraseña.
- Revisión legal del contenido de Leyes y Derechos antes de publicar.
- Despliegue con HTTPS, identificador propio de la app (`appId`) y firma para Play Store.
- Pruebas con personas usuarias del público objetivo.

---

## 9. Privacidad y uso responsable

- La app ofrece información general y **no sustituye** el diagnóstico ni la atención profesional, ni la asesoría legal.
- Contraseñas cifradas con bcrypt; sesiones con tokens que caducan si no se usa la app en 7 días.
- La identidad declarada en el registro es voluntaria y no se usa para diagnosticar ni limitar a nadie.
- La comunidad tiene normas, reportes y moderación; por seguridad no permite enlaces ni datos de contacto.
- La música importada nunca se sube al servidor.
- Las credenciales (`server/.env`, `.env.local`) y los archivos subidos están fuera del control de versiones.

## 10. Créditos y licencias de contenido

- Libros: obras de dominio público de **Project Gutenberg**.
- Información de la fundación: [fundacionsenderoazul.org](https://fundacionsenderoazul.org/).
- Logos de terceros (portales de empleo y apps recomendadas): pertenecen a sus respectivos dueños y se usan solo para identificar los enlaces.
- La licencia del código está **pendiente de definición** (agregar un archivo `LICENSE` cuando se decida).

---

**TEO + TEA: información, acompañamiento e inclusión.**
