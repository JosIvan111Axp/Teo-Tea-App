import { useEffect, useRef, useState } from 'react';
import {
  IonActionSheet,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  addOutline,
  bookOutline,
  checkmarkOutline,
  ellipsisVertical,
  libraryOutline,
  searchOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import { type CatalogBook, type LibraryBook, useBooksStore } from '../store/useBooksStore';
import { track } from '../store/useAchievementsStore';
import './BooksPage.css';

type View = 'mia' | 'explorar';

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'all', label: 'Todos' },
];

const TOPICS = [
  { value: '', label: 'Destacados' },
  { value: 'novela', label: 'Novela' },
  { value: 'cuentos', label: 'Cuentos' },
  { value: 'poesia', label: 'Poesía' },
  { value: 'teatro', label: 'Teatro' },
  { value: 'infantil', label: 'Infantil y juvenil' },
  { value: 'aventuras', label: 'Aventuras' },
  { value: 'historia', label: 'Historia' },
  { value: 'filosofia', label: 'Filosofía' },
  { value: 'ciencia', label: 'Ciencia' },
];

/** Portada con respaldo: si no hay imagen, muestra una tapa generada con el título. */
const BookCover: React.FC<{ src: string | null; title: string; author?: string }> = ({ src, title, author }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="book-cover book-cover-fallback" aria-hidden="true">
        <IonIcon icon={bookOutline} />
        <strong>{title}</strong>
        {author && <span>{author}</span>}
      </div>
    );
  }
  return <img className="book-cover" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
};

// Reseñas cortas de los libros recomendados (por ID de Project Gutenberg).
const FEATURED_BLURBS: Record<string, string> = {
  '45438':
    'El joven Jim Hawkins encuentra el mapa de un tesoro pirata y se embarca rumbo a una isla lejana. Una aventura clásica de barcos, piratas y amistad.',
};

const authorLine = (authors: string[]) => (authors.length ? authors.slice(0, 2).join(', ') : 'Autor desconocido');

const BooksPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    library,
    libraryLoaded,
    libraryError,
    results,
    total,
    hasMore,
    searching,
    searchError,
    lastSearch,
    adding,
    fetchLibrary,
    featured,
    fetchFeatured,
    search,
    addToLibrary,
    removeFromLibrary,
  } = useBooksStore();

  const [view, setView] = useState<View>('mia');
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState('es');
  const [topic, setTopic] = useState('');
  const [menuBook, setMenuBook] = useState<LibraryBook | null>(null);
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);
  const debounce = useRef<number | undefined>(undefined);
  const viewInitialized = useRef(false);

  useIonViewWillEnter(() => {
    void fetchLibrary();
    void fetchFeatured();
    void track('visit', 'biblioteca');
  });

  // Primera vez: si no hay libros guardados, abrir directamente "Explorar".
  useEffect(() => {
    if (libraryLoaded && !viewInitialized.current) {
      viewInitialized.current = true;
      if (library.length === 0) setView('explorar');
    }
  }, [libraryLoaded, library.length]);

  // Búsqueda con espera de 400 ms mientras se escribe.
  useEffect(() => {
    if (view !== 'explorar') return undefined;
    const params = { q: query.trim(), topic, lang };
    if (lastSearch && lastSearch.q === params.q && lastSearch.topic === topic && lastSearch.lang === lang) {
      return undefined;
    }
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => void search(params), query ? 400 : 0);
    return () => window.clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, topic, lang, view]);

  const handleAdd = async (book: CatalogBook) => {
    const result = await addToLibrary(book.id);
    if (result.ok) void track('check');
    setToast(
      result.ok
        ? { message: `“${book.title}” se agregó a tu biblioteca.`, color: 'secondary' }
        : { message: result.error, color: 'danger' },
    );
  };

  const continueBook = library.find((book) => book.lastReadAt && book.progress < 0.995);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Biblioteca</IonTitle>
        </IonToolbar>
        <IonToolbar className="books-segment-toolbar toolbar-light">
          <IonSegment value={view} onIonChange={(e) => setView((e.detail.value as View) ?? 'mia')}>
            <IonSegmentButton value="mia">
              <IonIcon icon={libraryOutline} aria-hidden="true" />
              <IonLabel>Mi biblioteca</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="explorar">
              <IonIcon icon={searchOutline} aria-hidden="true" />
              <IonLabel>Explorar</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="books-content">
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (event) => {
            if (view === 'mia') await fetchLibrary();
            else await search({ q: query.trim(), topic, lang });
            event.detail.complete();
          }}
        >
          <IonRefresherContent pullingText="Desliza para actualizar" refreshingSpinner="dots" />
        </IonRefresher>

        <main className="books-layout">
          {featured.map((book) => {
            const progress = library.find((item) => item.id === book.id)?.progress ?? book.progress;
            const isAdding = Boolean(adding[book.id]);
            return (
              <section key={book.id} className="featured-card" aria-labelledby={`featured-${book.id}`}>
                <BookCover src={book.cover} title={book.title} author={book.authors[0]} />
                <div className="featured-copy">
                  <p className="featured-eyebrow">
                    <IonIcon icon={sparklesOutline} aria-hidden="true" /> Recomendado por TEO + TEA
                  </p>
                  <h2 id={`featured-${book.id}`}>{book.title}</h2>
                  <p className="book-author">{authorLine(book.authors)}</p>
                  {FEATURED_BLURBS[book.id] && <p className="featured-blurb">{FEATURED_BLURBS[book.id]}</p>}
                  {book.inLibrary ? (
                    <>
                      {progress > 0 && (
                        <div className="progress-bar" aria-hidden="true">
                          <span style={{ width: `${Math.round(progress * 100)}%` }} />
                        </div>
                      )}
                      <IonButton onClick={() => navigate(`/leer/${book.id}`)}>
                        {progress > 0 ? `Continuar (${Math.round(progress * 100)}%)` : 'Empezar a leer'}
                      </IonButton>
                    </>
                  ) : (
                    <IonButton disabled={isAdding} onClick={() => void handleAdd(book)}>
                      {isAdding ? (
                        <>
                          <IonSpinner name="dots" /> Descargando
                        </>
                      ) : (
                        <>
                          <IonIcon slot="start" icon={addOutline} aria-hidden="true" />
                          Agregar a mi biblioteca
                        </>
                      )}
                    </IonButton>
                  )}
                </div>
              </section>
            );
          })}

          {view === 'mia' ? (
            <>
              {continueBook && (
                <section className="continue-card" aria-labelledby="continue-title">
                  <BookCover src={continueBook.cover} title={continueBook.title} />
                  <div className="continue-copy">
                    <p className="books-eyebrow" id="continue-title">
                      Continuar leyendo
                    </p>
                    <h2>{continueBook.title}</h2>
                    <p className="book-author">{authorLine(continueBook.authors)}</p>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      aria-valuenow={Math.round(continueBook.progress * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Avance de lectura"
                    >
                      <span style={{ width: `${Math.round(continueBook.progress * 100)}%` }} />
                    </div>
                    <p className="progress-label">{Math.round(continueBook.progress * 100)}% leído</p>
                    <IonButton onClick={() => navigate(`/leer/${continueBook.id}`)}>Continuar</IonButton>
                  </div>
                </section>
              )}

              {libraryError && (
                <div className="books-empty" role="alert">
                  <p>{libraryError}</p>
                  <IonButton fill="outline" onClick={() => void fetchLibrary()}>
                    Reintentar
                  </IonButton>
                </div>
              )}

              {!libraryLoaded && !libraryError && (
                <p className="books-empty" role="status">
                  <IonSpinner name="dots" /> Cargando tu biblioteca...
                </p>
              )}

              {libraryLoaded && library.length === 0 && (
                <div className="books-empty">
                  <IonIcon icon={libraryOutline} aria-hidden="true" className="books-empty-icon" />
                  <h2>Tu biblioteca está vacía</h2>
                  <p>Explora miles de libros libres y agrega los que quieras leer.</p>
                  <IonButton onClick={() => setView('explorar')}>Explorar libros</IonButton>
                </div>
              )}

              {library.length > 0 && (
                <section aria-labelledby="my-books-title">
                  <h2 className="books-section-title" id="my-books-title">
                    Mis libros <span>({library.length})</span>
                  </h2>
                  <ul className="book-grid">
                    {library.map((book) => (
                      <li key={book.id} className="book-tile">
                        <button
                          type="button"
                          className="book-tile-open"
                          onClick={() => navigate(`/leer/${book.id}`)}
                          aria-label={`Leer ${book.title}`}
                        >
                          <BookCover src={book.cover} title={book.title} author={book.authors[0]} />
                          <div className="progress-bar progress-bar-thin" aria-hidden="true">
                            <span style={{ width: `${Math.round(book.progress * 100)}%` }} />
                          </div>
                        </button>
                        <div className="book-tile-info">
                          <div>
                            <strong>{book.title}</strong>
                            <span className="book-author">{authorLine(book.authors)}</span>
                            <span className="book-meta">
                              {book.progress > 0 ? `${Math.round(book.progress * 100)}% leído` : 'Sin empezar'}
                            </span>
                          </div>
                          <IonButton
                            fill="clear"
                            size="small"
                            color="medium"
                            aria-label={`Opciones de ${book.title}`}
                            onClick={() => setMenuBook(book)}
                          >
                            <IonIcon slot="icon-only" icon={ellipsisVertical} />
                          </IonButton>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          ) : (
            <>
              <IonSearchbar
                className="books-search"
                placeholder="Buscar por título o autor"
                aria-label="Buscar libros por título o autor"
                value={query}
                debounce={0}
                onIonInput={(e) => setQuery(e.detail.value ?? '')}
              />

              <div className="chip-row" role="radiogroup" aria-label="Idioma">
                {LANGUAGES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={lang === option.value}
                    className={`books-chip books-chip-lang${lang === option.value ? ' is-selected' : ''}`}
                    onClick={() => setLang(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="chip-row chip-row-scroll" role="radiogroup" aria-label="Tema">
                {TOPICS.map((option) => (
                  <button
                    key={option.value || 'destacados'}
                    type="button"
                    role="radio"
                    aria-checked={topic === option.value}
                    className={`books-chip${topic === option.value ? ' is-selected' : ''}`}
                    onClick={() => setTopic(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {!searching && !searchError && lastSearch && (
                <p className="books-count" role="status">
                  {total.toLocaleString('es')} {total === 1 ? 'libro encontrado' : 'libros encontrados'}
                </p>
              )}

              {searchError && (
                <div className="books-empty" role="alert">
                  <p>{searchError}</p>
                  <IonButton fill="outline" onClick={() => void search({ q: query.trim(), topic, lang })}>
                    Reintentar
                  </IonButton>
                </div>
              )}

              {!searching && !searchError && lastSearch && results.length === 0 && (
                <p className="books-empty">No encontramos libros con esa búsqueda. Prueba con otras palabras o tema.</p>
              )}

              <ul className="book-grid">
                {results.map((book) => {
                  const isAdding = Boolean(adding[book.id]);
                  return (
                    <li key={book.id} className="book-tile">
                      <BookCover src={book.cover} title={book.title} author={book.authors[0]} />
                      <div className="book-tile-info book-tile-info-stack">
                        <strong>{book.title}</strong>
                        <span className="book-author">{authorLine(book.authors)}</span>
                        {book.inLibrary ? (
                          <IonButton size="small" color="secondary" onClick={() => navigate(`/leer/${book.id}`)}>
                            <IonIcon slot="start" icon={checkmarkOutline} aria-hidden="true" />
                            Leer
                          </IonButton>
                        ) : (
                          <IonButton
                            size="small"
                            fill="outline"
                            disabled={isAdding}
                            aria-label={`Agregar ${book.title} a mi biblioteca`}
                            onClick={() => void handleAdd(book)}
                          >
                            {isAdding ? (
                              <>
                                <IonSpinner name="dots" /> Descargando
                              </>
                            ) : (
                              <>
                                <IonIcon slot="start" icon={addOutline} aria-hidden="true" />
                                Agregar
                              </>
                            )}
                          </IonButton>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {searching && (
                <p className="books-empty" role="status">
                  <IonSpinner name="dots" /> Buscando libros...
                </p>
              )}

              {hasMore && !searching && (
                <IonButton
                  className="books-more"
                  expand="block"
                  fill="outline"
                  onClick={() => void search({ q: query.trim(), topic, lang }, true)}
                >
                  Cargar más libros
                </IonButton>
              )}

              <p className="books-credit">
                Libros de dominio público de{' '}
                <a href="https://www.gutenberg.org" target="_blank" rel="noreferrer">
                  Project Gutenberg
                </a>
                . Solo se muestran obras cuyos autores y traductores fallecieron hace más de 70 años.
              </p>
            </>
          )}
        </main>

        <IonActionSheet
          isOpen={Boolean(menuBook)}
          header={menuBook?.title}
          buttons={[
            {
              text: 'Leer',
              handler: () => {
                if (menuBook) navigate(`/leer/${menuBook.id}`);
              },
            },
            {
              text: 'Quitar de mi biblioteca',
              role: 'destructive',
              handler: () => {
                if (!menuBook) return;
                const book = menuBook;
                void removeFromLibrary(book.id).then((result) =>
                  setToast(
                    result.ok
                      ? { message: `“${book.title}” se quitó de tu biblioteca.`, color: 'medium' }
                      : { message: result.error, color: 'danger' },
                  ),
                );
              },
            },
            { text: 'Cancelar', role: 'cancel' },
          ]}
          onDidDismiss={() => setMenuBook(null)}
        />

        <IonToast
          isOpen={Boolean(toast)}
          message={toast?.message}
          color={toast?.color}
          duration={2600}
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default BooksPage;
