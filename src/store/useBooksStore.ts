import { create } from 'zustand';
import { API_URL, ApiError, api, errorMessage, getAuthToken } from '../api/client';

export type CatalogBook = {
  id: string;
  title: string;
  authors: string[];
  languages: string[];
  cover: string | null;
  inLibrary: boolean;
};

export type LibraryBook = {
  id: string;
  title: string;
  authors: string[];
  languages: string[];
  cover: string | null;
  fileSize: number | null;
  progress: number;
  location: string | null;
  addedAt: number | null;
  lastReadAt: number | null;
};

export type FeaturedBook = CatalogBook & { progress: number };

export type SearchParams = { q: string; topic: string; lang: string };

type SearchResponse = { total: number; page: number; hasMore: boolean; books: CatalogBook[] };
type ActionResult = { ok: true } | { ok: false; error: string };

type BooksStore = {
  library: LibraryBook[];
  featured: FeaturedBook[];
  libraryLoaded: boolean;
  libraryError: string;
  results: CatalogBook[];
  total: number;
  page: number;
  hasMore: boolean;
  searching: boolean;
  searchError: string;
  lastSearch: SearchParams | null;
  /** IDs de libros que se están descargando al servidor. */
  adding: Record<string, boolean>;
  fetchLibrary: () => Promise<void>;
  fetchFeatured: () => Promise<void>;
  search: (params: SearchParams, append?: boolean) => Promise<void>;
  addToLibrary: (bookId: string) => Promise<ActionResult>;
  removeFromLibrary: (bookId: string) => Promise<ActionResult>;
  saveProgress: (bookId: string, location: string, progress: number) => Promise<void>;
  reset: () => void;
};

let searchRequest = 0;

export const useBooksStore = create<BooksStore>((set, get) => ({
  library: [],
  featured: [],
  libraryLoaded: false,
  libraryError: '',
  results: [],
  total: 0,
  page: 1,
  hasMore: false,
  searching: false,
  searchError: '',
  lastSearch: null,
  adding: {},

  fetchLibrary: async () => {
    try {
      const { books } = await api<{ books: LibraryBook[] }>('/books/library');
      set({ library: books, libraryLoaded: true, libraryError: '' });
    } catch (error) {
      set({ libraryError: errorMessage(error) });
    }
  },

  fetchFeatured: async () => {
    try {
      const { books } = await api<{ books: FeaturedBook[] }>('/books/featured');
      set({ featured: books });
    } catch {
      // La tarjeta destacada es opcional: si falla, simplemente no se muestra.
    }
  },

  search: async (params, append = false) => {
    const page = append ? get().page + 1 : 1;
    const requestId = ++searchRequest;
    set({ searching: true, searchError: '', lastSearch: params, ...(append ? {} : { results: [] }) });
    try {
      const query = new URLSearchParams({ ...params, page: String(page) });
      const data = await api<SearchResponse>(`/books/search?${query}`);
      if (requestId !== searchRequest) return; // llegó una búsqueda más reciente
      set((state) => ({
        results: append ? [...state.results, ...data.books] : data.books,
        total: data.total,
        page,
        hasMore: data.hasMore,
      }));
    } catch (error) {
      if (requestId === searchRequest) set({ searchError: errorMessage(error) });
    } finally {
      if (requestId === searchRequest) set({ searching: false });
    }
  },

  addToLibrary: async (bookId) => {
    set((state) => ({ adding: { ...state.adding, [bookId]: true } }));
    try {
      const { book } = await api<{ book: LibraryBook }>(`/books/${bookId}/library`, { method: 'POST' });
      set((state) => ({
        library: [book, ...state.library.filter((item) => item.id !== book.id)],
        results: state.results.map((item) => (item.id === bookId ? { ...item, inLibrary: true } : item)),
        featured: state.featured.map((item) => (item.id === bookId ? { ...item, inLibrary: true } : item)),
      }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    } finally {
      set((state) => {
        const adding = { ...state.adding };
        delete adding[bookId];
        return { adding };
      });
    }
  },

  removeFromLibrary: async (bookId) => {
    try {
      await api(`/books/${bookId}/library`, { method: 'DELETE' });
      set((state) => ({
        library: state.library.filter((item) => item.id !== bookId),
        results: state.results.map((item) => (item.id === bookId ? { ...item, inLibrary: false } : item)),
        featured: state.featured.map((item) => (item.id === bookId ? { ...item, inLibrary: false, progress: 0 } : item)),
      }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },

  saveProgress: async (bookId, location, progress) => {
    set((state) => ({
      library: state.library.map((item) =>
        item.id === bookId ? { ...item, location, progress, lastReadAt: Date.now() } : item,
      ),
    }));
    try {
      await api(`/books/${bookId}/progress`, { method: 'PUT', body: { location, progress } });
    } catch {
      // Se reintenta en el siguiente cambio de página.
    }
  },

  reset: () =>
    set({ library: [], featured: [], libraryLoaded: false, results: [], total: 0, page: 1, hasMore: false, lastSearch: null }),
}));

/** Descarga el EPUB desde nuestra API (requiere sesión) como ArrayBuffer para epub.js. */
export const fetchBookFile = async (bookId: string): Promise<ArrayBuffer> => {
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/books/${bookId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError('No pudimos conectar con el servidor para abrir el libro.', 0);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(data.error ?? 'No se pudo abrir el libro.', response.status);
  }
  return response.arrayBuffer();
};
