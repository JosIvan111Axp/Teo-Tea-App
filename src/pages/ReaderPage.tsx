import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonRange,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  arrowBackOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  listOutline,
  textOutline,
} from 'ionicons/icons';
import ePub, { type Book, type Location, type NavItem, type Rendition } from 'epubjs';
import { useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { fetchBookFile, useBooksStore } from '../store/useBooksStore';
import { track } from '../store/useAchievementsStore';
import './ReaderPage.css';

/* ------------------------------ Preferencias ------------------------------ */
type ThemeName = 'claro' | 'sepia' | 'oscuro';
type FontName = 'serif' | 'sans' | 'legible';

type ReaderPrefs = { fontSize: number; theme: ThemeName; font: FontName; lineHeight: number };

const THEMES: Record<ThemeName, { label: string; bg: string; fg: string; link: string }> = {
  claro: { label: 'Claro', bg: '#fffefc', fg: '#2b2238', link: '#6a3ea1' },
  sepia: { label: 'Sepia', bg: '#f6ecd9', fg: '#4a3a28', link: '#22703f' },
  oscuro: { label: 'Oscuro', bg: '#1c1724', fg: '#e8e2f0', link: '#c6a8f0' },
};

const FONTS: Record<FontName, { label: string; family: string }> = {
  serif: { label: 'Serif', family: 'Georgia, "Times New Roman", serif' },
  sans: { label: 'Sans', family: '-apple-system, "Segoe UI", Roboto, sans-serif' },
  legible: { label: 'Legible', family: 'Verdana, Tahoma, "Trebuchet MS", sans-serif' },
};

const LINE_HEIGHTS = [
  { value: 1.5, label: 'Normal' },
  { value: 1.8, label: 'Amplio' },
  { value: 2.1, label: 'Muy amplio' },
];

const PREFS_KEY = 'teo-tea-reader-prefs';
const DEFAULT_PREFS: ReaderPrefs = { fontSize: 110, theme: 'claro', font: 'serif', lineHeight: 1.8 };

const loadPrefs = (): ReaderPrefs => {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return DEFAULT_PREFS;
  }
};

const savePrefs = (prefs: ReaderPrefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* sin almacenamiento: se usan las preferencias solo en esta sesión */
  }
};

/** Las "locations" (para % y barra de avance) se calculan una vez por libro y se guardan. */
const locationsKey = (bookId: string) => `teo-tea-locations-${bookId}`;

const flattenToc = (items: NavItem[], depth = 0): { item: NavItem; depth: number }[] =>
  items.flatMap((item) => [{ item, depth }, ...flattenToc(item.subitems ?? [], depth + 1)]);

/** Normaliza un href de capítulo para compararlo con la ubicación actual. */
const baseHref = (href: string) => href.split('#')[0].replace(/^\.?\//, '');

/* --------------------------------- Lector --------------------------------- */
const ReaderPage: React.FC = () => {
  const { bookId = '' } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const libraryBook = useBooksStore((state) => state.library.find((item) => item.id === bookId));
  const libraryLoaded = useBooksStore((state) => state.libraryLoaded);
  const fetchLibrary = useBooksStore((state) => state.fetchLibrary);
  const saveProgress = useBooksStore((state) => state.saveProgress);

  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const pendingSave = useRef<{ cfi: string; progress: number } | null>(null);
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastProgress = useRef(libraryBook?.progress ?? 0);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [prefs, setPrefs] = useState<ReaderPrefs>(loadPrefs);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [currentHref, setCurrentHref] = useState('');
  const [progress, setProgress] = useState(libraryBook?.progress ?? 0);
  const [locationsReady, setLocationsReady] = useState(false);
  const [pageInfo, setPageInfo] = useState<{ page: number; total: number } | null>(null);
  const [atStart, setAtStart] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Si se entra directo por URL, se carga la biblioteca para conocer título y posición guardada.
  useEffect(() => {
    if (!libraryLoaded) void fetchLibrary();
  }, [libraryLoaded, fetchLibrary]);

  const flushProgress = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    if (pendingSave.current) {
      void saveProgress(bookId, pendingSave.current.cfi, pendingSave.current.progress);
      pendingSave.current = null;
    }
  }, [bookId, saveProgress]);

  /* Carga del libro (una vez que sabemos la posición guardada). */
  const startLocation = libraryBook?.location ?? undefined;
  const canStart = libraryLoaded || Boolean(libraryBook);

  useEffect(() => {
    if (!canStart || !viewerRef.current) return undefined;
    let cancelled = false;

    const open = async () => {
      try {
        const data = await fetchBookFile(bookId);
        if (cancelled || !viewerRef.current) return;

        const book = ePub(data);
        bookRef.current = book;
        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'auto',
          minSpreadWidth: 900,
          allowScriptedContent: false,
        });
        renditionRef.current = rendition;

        rendition.on('relocated', (location: Location) => {
          setCurrentHref(baseHref(location.start.href));
          setAtStart(location.atStart);
          setAtEnd(location.atEnd);
          setPageInfo(location.start.displayed);
          // Mientras se calculan las posiciones, el % no es fiable: se conserva el último conocido
          // para no sobrescribir el avance guardado con 0%.
          const ready = book.locations.length() > 0;
          const pct = ready ? book.locations.percentageFromCfi(location.start.cfi) : NaN;
          if (Number.isFinite(pct)) {
            lastProgress.current = pct;
            setProgress(pct);
          }

          pendingSave.current = { cfi: location.start.cfi, progress: lastProgress.current };
          window.clearTimeout(saveTimer.current);
          saveTimer.current = window.setTimeout(flushProgress, 1500);
        });

        // Teclado (cuando el foco está dentro del libro).
        rendition.on('keyup', (event: KeyboardEvent) => {
          if (event.key === 'ArrowRight') void rendition.next();
          if (event.key === 'ArrowLeft') void rendition.prev();
        });

        // Deslizar con el dedo para pasar página.
        rendition.on('touchstart', (event: TouchEvent) => {
          const t = event.changedTouches[0];
          touchStart.current = { x: t.screenX, y: t.screenY, t: Date.now() };
        });
        rendition.on('touchend', (event: TouchEvent) => {
          const start = touchStart.current;
          const t = event.changedTouches[0];
          touchStart.current = null;
          if (!start) return;
          const dx = t.screenX - start.x;
          const dy = t.screenY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - start.t < 800) {
            void (dx < 0 ? rendition.next() : rendition.prev());
          }
        });

        // Toque en el centro del texto: mostrar/ocultar controles (modo inmersivo).
        rendition.on('click', (event: MouseEvent) => {
          const selection = (event.view as Window | null)?.getSelection?.();
          if (selection && !selection.isCollapsed) return;
          setChromeVisible((visible) => !visible);
        });

        const navigation = await book.loaded.navigation;
        if (cancelled) return;
        setToc(navigation.toc);

        // Avance guardado (la biblioteca ya está cargada en este punto).
        lastProgress.current =
          useBooksStore.getState().library.find((item) => item.id === bookId)?.progress ?? lastProgress.current;
        await rendition.display(startLocation);
        if (cancelled) return;
        setStatus('ready');

        // Calcula (o recupera) las posiciones para mostrar % exacto y la barra de avance.
        await book.ready;
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(locationsKey(bookId));
        } catch {
          /* sin almacenamiento */
        }
        if (saved) book.locations.load(saved);
        else {
          await book.locations.generate(1600);
          try {
            localStorage.setItem(locationsKey(bookId), book.locations.save());
          } catch {
            /* sin espacio: se recalculará la próxima vez */
          }
        }
        if (cancelled) return;
        setLocationsReady(true);
        const current = rendition.currentLocation() as unknown as Location | undefined;
        if (current?.start?.cfi) {
          const pct = book.locations.percentageFromCfi(current.start.cfi);
          lastProgress.current = pct;
          setProgress(pct);
          pendingSave.current = { cfi: current.start.cfi, progress: pct };
          window.clearTimeout(saveTimer.current);
          saveTimer.current = window.setTimeout(flushProgress, 1500);
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err));
          setStatus('error');
        }
      }
    };

    void open();

    return () => {
      cancelled = true;
      flushProgress();
      window.setTimeout(() => void track('check'), 1200);
      renditionRef.current = null;
      bookRef.current?.destroy();
      bookRef.current = null;
    };
    // startLocation se lee solo al abrir: no debe reabrir el libro en cada guardado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, canStart]);

  /* Aplica tema, fuente, tamaño e interlineado al contenido del libro. */
  useEffect(() => {
    savePrefs(prefs);
    const rendition = renditionRef.current;
    if (!rendition || status !== 'ready') return;
    const theme = THEMES[prefs.theme];
    rendition.themes.override('color', theme.fg, true);
    rendition.themes.override('background', theme.bg, true);
    rendition.themes.override('line-height', String(prefs.lineHeight), true);
    rendition.themes.font(FONTS[prefs.font].family);
    rendition.themes.fontSize(`${prefs.fontSize}%`);
    rendition.themes.register('teo', { a: { color: `${theme.link} !important` } });
    rendition.themes.select('teo');
  }, [prefs, status]);

  /* Teclado fuera del libro y guardado al salir de la pestaña. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (showToc || showSettings) return;
      if (event.key === 'ArrowRight') void renditionRef.current?.next();
      if (event.key === 'ArrowLeft') void renditionRef.current?.prev();
    };
    const onHide = () => flushProgress();
    window.addEventListener('keyup', onKey);
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [flushProgress, showToc, showSettings]);

  const flatToc = useMemo(() => flattenToc(toc), [toc]);
  const chapterLabel = useMemo(() => {
    const match = flatToc.find(({ item }) => baseHref(item.href) === currentHref);
    return match?.item.label.trim() ?? '';
  }, [flatToc, currentHref]);

  const goTo = (target: string) => {
    setShowToc(false);
    void renditionRef.current?.display(target);
  };

  const jumpToPercent = (value: number) => {
    const book = bookRef.current;
    if (!book || !locationsReady) return;
    const cfi = book.locations.cfiFromPercentage(value / 100);
    if (cfi) void renditionRef.current?.display(cfi);
  };

  const updatePrefs = (changes: Partial<ReaderPrefs>) => setPrefs((current) => ({ ...current, ...changes }));

  const theme = THEMES[prefs.theme];
  const title = libraryBook?.title ?? 'Libro';
  const percent = Math.round(progress * 100);

  return (
    <IonPage className={`reader-page reader-theme-${prefs.theme}`}>
      <IonHeader className={`reader-header${chromeVisible ? '' : ' is-hidden'}`}>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton aria-label="Volver a la biblioteca" onClick={() => navigate('/biblioteca')}>
              <IonIcon slot="icon-only" icon={arrowBackOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>
            <span className="reader-title">{title}</span>
            {chapterLabel && <span className="reader-chapter">{chapterLabel}</span>}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton aria-label="Índice" disabled={!flatToc.length} onClick={() => setShowToc(true)}>
              <IonIcon slot="icon-only" icon={listOutline} />
            </IonButton>
            <IonButton aria-label="Ajustes de lectura" onClick={() => setShowSettings(true)}>
              <IonIcon slot="icon-only" icon={textOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent scrollY={false} className="reader-content" style={{ '--background': theme.bg } as React.CSSProperties}>
        <div className="reader-stage" style={{ background: theme.bg }}>
          <div ref={viewerRef} className="reader-viewer" aria-label={`Texto de ${title}`} />

          {status === 'ready' && (
            <>
              <button
                type="button"
                className="reader-tap reader-tap-prev"
                aria-label="Página anterior"
                disabled={atStart}
                onClick={() => void renditionRef.current?.prev()}
              />
              <button
                type="button"
                className="reader-tap reader-tap-next"
                aria-label="Página siguiente"
                disabled={atEnd}
                onClick={() => void renditionRef.current?.next()}
              />
            </>
          )}

          {status === 'loading' && (
            <div className="reader-overlay" role="status">
              <IonSpinner name="crescent" />
              <p>Abriendo el libro...</p>
            </div>
          )}
          {status === 'error' && (
            <div className="reader-overlay" role="alert">
              <p>{error}</p>
              <IonButton onClick={() => navigate('/biblioteca')}>Volver a la biblioteca</IonButton>
            </div>
          )}
        </div>
      </IonContent>

      <footer className={`reader-footer${chromeVisible ? '' : ' is-hidden'}`} style={{ background: theme.bg, color: theme.fg }}>
        <IonButton fill="clear" aria-label="Página anterior" disabled={atStart || status !== 'ready'} onClick={() => void renditionRef.current?.prev()}>
          <IonIcon slot="icon-only" icon={chevronBackOutline} />
        </IonButton>
        <div className="reader-progress">
          <IonRange
            aria-label="Avance en el libro"
            min={0}
            max={100}
            step={1}
            value={percent}
            disabled={!locationsReady}
            onIonChange={(event) => jumpToPercent(Number(event.detail.value))}
          />
          <span>
            {locationsReady ? `${percent}% leído` : 'Calculando avance...'}
            {pageInfo && pageInfo.total > 1 ? ` · pág. ${pageInfo.page} de ${pageInfo.total} del capítulo` : ''}
          </span>
        </div>
        <IonButton fill="clear" aria-label="Página siguiente" disabled={atEnd || status !== 'ready'} onClick={() => void renditionRef.current?.next()}>
          <IonIcon slot="icon-only" icon={chevronForwardOutline} />
        </IonButton>
      </footer>

      {/* Índice */}
      <IonModal
        isOpen={showToc}
        onDidDismiss={() => setShowToc(false)}
        className={`reader-modal reader-modal-${prefs.theme}`}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Índice</IonTitle>
            <IonButtons slot="end">
              <IonButton aria-label="Cerrar índice" onClick={() => setShowToc(false)}>
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList className="reader-toc">
            {flatToc.map(({ item, depth }) => (
              <IonItem
                key={`${item.id}-${item.href}`}
                button
                detail={false}
                className={baseHref(item.href) === currentHref ? 'is-current' : ''}
                style={{ '--padding-start': `${16 + depth * 18}px` } as React.CSSProperties}
                onClick={() => goTo(item.href)}
              >
                <IonLabel className="ion-text-wrap">{item.label.trim()}</IonLabel>
              </IonItem>
            ))}
          </IonList>
        </IonContent>
      </IonModal>

      {/* Ajustes de lectura */}
      <IonModal
        isOpen={showSettings}
        onDidDismiss={() => setShowSettings(false)}
        initialBreakpoint={0.6}
        breakpoints={[0, 0.6, 0.9]}
        className={`reader-settings-modal reader-modal reader-modal-${prefs.theme}`}
      >
        <IonContent className="reader-settings">
          <h2>Ajustes de lectura</h2>

          <section aria-labelledby="rs-size">
            <h3 id="rs-size">Tamaño de letra</h3>
            <div className="rs-row">
              <IonButton
                fill="outline"
                aria-label="Letra más pequeña"
                disabled={prefs.fontSize <= 80}
                onClick={() => updatePrefs({ fontSize: prefs.fontSize - 10 })}
              >
                <span className="rs-a-small">A</span>
              </IonButton>
              <span className="rs-value" aria-live="polite">
                {prefs.fontSize}%
              </span>
              <IonButton
                fill="outline"
                aria-label="Letra más grande"
                disabled={prefs.fontSize >= 200}
                onClick={() => updatePrefs({ fontSize: prefs.fontSize + 10 })}
              >
                <span className="rs-a-large">A</span>
              </IonButton>
            </div>
          </section>

          <section aria-labelledby="rs-theme">
            <h3 id="rs-theme">Fondo</h3>
            <div className="rs-options" role="radiogroup" aria-labelledby="rs-theme">
              {(Object.keys(THEMES) as ThemeName[]).map((name) => (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={prefs.theme === name}
                  className={`rs-theme${prefs.theme === name ? ' is-selected' : ''}`}
                  style={{ background: THEMES[name].bg, color: THEMES[name].fg }}
                  onClick={() => updatePrefs({ theme: name })}
                >
                  {THEMES[name].label}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="rs-font">
            <h3 id="rs-font">Tipo de letra</h3>
            <div className="rs-options" role="radiogroup" aria-labelledby="rs-font">
              {(Object.keys(FONTS) as FontName[]).map((name) => (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={prefs.font === name}
                  className={`rs-option${prefs.font === name ? ' is-selected' : ''}`}
                  style={{ fontFamily: FONTS[name].family }}
                  onClick={() => updatePrefs({ font: name })}
                >
                  {FONTS[name].label}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="rs-line">
            <h3 id="rs-line">Interlineado</h3>
            <div className="rs-options" role="radiogroup" aria-labelledby="rs-line">
              {LINE_HEIGHTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={prefs.lineHeight === option.value}
                  className={`rs-option${prefs.lineHeight === option.value ? ' is-selected' : ''}`}
                  onClick={() => updatePrefs({ lineHeight: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <IonButton expand="block" fill="clear" onClick={() => setPrefs(DEFAULT_PREFS)}>
            Restablecer ajustes
          </IonButton>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default ReaderPage;
