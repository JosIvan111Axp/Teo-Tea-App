/**
 * Almacenamiento LOCAL de canciones (IndexedDB). Los archivos nunca salen del dispositivo:
 * no se suben al servidor ni se comparten con otras personas.
 */

export type TrackMeta = {
  id: string;
  owner: string;
  title: string;
  artist: string;
  fileName: string;
  type: string;
  size: number;
  duration: number;
  addedAt: number;
};

type TrackRecord = TrackMeta & { blob: Blob };

/** Playlist local: solo guarda el orden de las canciones (referencias a la tienda "tracks"). */
export type Playlist = {
  id: string;
  owner: string;
  name: string;
  trackIds: string[];
  createdAt: number;
};

const DB_NAME = 'teo-tea-music';
const STORE = 'tracks';
const PLAYLISTS = 'playlists';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = () => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('Este navegador no permite guardar canciones en el dispositivo.'));
        return;
      }
      // v1: canciones · v2: playlists (la actualización conserva las canciones ya importadas)
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('owner', 'owner');
        }
        if (!db.objectStoreNames.contains(PLAYLISTS)) {
          db.createObjectStore(PLAYLISTS, { keyPath: 'id' }).createIndex('owner', 'owner');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('No se pudo abrir el almacenamiento de música.'));
    });
  }
  return dbPromise;
};

const run = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
  storeName = STORE,
): Promise<T> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = fn(tx.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Error de almacenamiento.'));
    tx.onabort = () => reject(tx.error ?? new Error('No hay espacio suficiente en el dispositivo.'));
  });
};

/** Canciones de una persona (sin el archivo, para que la lista sea liviana). */
export const listTracks = async (owner: string): Promise<TrackMeta[]> => {
  const records = await run<TrackRecord[]>('readonly', (s) => s.index('owner').getAll(owner));
  return records
    .map((record) => {
      const meta: TrackMeta & { blob?: Blob } = { ...record };
      delete meta.blob;
      return meta as TrackMeta;
    })
    .sort((a, b) => a.addedAt - b.addedAt);
};

export const getTrackBlob = async (id: string): Promise<Blob | null> => {
  const record = await run<TrackRecord | undefined>('readonly', (s) => s.get(id));
  return record?.blob ?? null;
};

export const saveTrack = (record: TrackRecord) => run('readwrite', (s) => s.put(record));

export const deleteTrack = (id: string) => run('readwrite', (s) => s.delete(id));

/* --------------------------------- Playlists --------------------------------- */
export const listPlaylists = async (owner: string): Promise<Playlist[]> => {
  const records = await run<Playlist[]>('readonly', (s) => s.index('owner').getAll(owner), PLAYLISTS);
  return records.sort((a, b) => a.createdAt - b.createdAt);
};

export const savePlaylist = (playlist: Playlist) => run('readwrite', (s) => s.put(playlist), PLAYLISTS);

export const deletePlaylist = (id: string) => run('readwrite', (s) => s.delete(id), PLAYLISTS);

/** Pide al navegador que no borre la música si el dispositivo se queda sin espacio. */
export const requestPersistentStorage = async () => {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
      await navigator.storage.persist?.();
    }
  } catch {
    /* opcional */
  }
};

export const storageEstimate = async (): Promise<{ used: number; quota: number } | null> => {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate?.quota) return null;
    return { used: estimate.usage ?? 0, quota: estimate.quota };
  } catch {
    return null;
  }
};

const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;
export const MAX_TRACK_BYTES = 60 * 1024 * 1024;

export const isAudioFile = (file: File) => file.type.startsWith('audio/') || AUDIO_EXTENSIONS.test(file.name);

/** "Artista - Título.mp3" → { artist, title }. Si no hay guion, todo es el título. */
export const parseFileName = (fileName: string) => {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = base.split(/\s+-\s+/);
  if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  return { artist: '', title: base || 'Canción sin título' };
};

/** Lee la duración del archivo; devuelve null si el formato no se puede reproducir aquí. */
export const readDuration = (file: File): Promise<number | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      probe.removeAttribute('src');
      resolve(value);
    };
    const timer = window.setTimeout(() => done(0), 8000);
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      window.clearTimeout(timer);
      done(Number.isFinite(probe.duration) ? probe.duration : 0);
    };
    probe.onerror = () => {
      window.clearTimeout(timer);
      done(null);
    };
    probe.src = url;
  });

export const createTrackId = () =>
  `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
