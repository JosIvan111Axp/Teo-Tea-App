import { create } from 'zustand';
import {
  MAX_TRACK_BYTES,
  createTrackId,
  deletePlaylist as dbDeletePlaylist,
  deleteTrack,
  getTrackBlob,
  isAudioFile,
  listPlaylists,
  listTracks,
  parseFileName,
  readDuration,
  requestPersistentStorage,
  savePlaylist,
  saveTrack,
  type Playlist,
  type TrackMeta,
} from '../music/musicDb';
import { mediaSession } from '../music/mediaSession';
import { setScreenAwake } from '../music/screenAwake';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { track } from './useAchievementsStore';

/* =============================================================================
 * Reproductor local de TEO + TEA
 *
 *   <audio> → [Compresor: suaviza picos] → [Limitador: volumen × máximo] → [Fundido] → salida
 *
 * - Cuidado auditivo: el "volumen máximo" pone un techo que el volumen normal nunca supera,
 *   y el compresor (con potencia ajustable) reduce los golpes de sonido fuertes.
 * - Transición suave: fundido al dar play/pausa y entre canciones.
 * - Cola de reproducción: todas las canciones o una playlist, en orden o mezclada.
 * - Controles del sistema: Media Session (web) o servicio nativo en la app Android.
 * ========================================================================== */

export type RepeatMode = 'off' | 'all' | 'one';

export type MusicSettings = {
  volume: number; // 0..1 (lo que elige la persona)
  maxVolume: number; // 0.2..1 (limitador)
  smoothPeaks: boolean; // compresor activado
  smoothStrength: number; // 1..5 (potencia del suavizado)
  fade: boolean; // transiciones suaves
  fadeSeconds: number; // 1 | 2 | 4
  shuffle: boolean;
  repeat: RepeatMode;
  backgroundPlay: boolean; // seguir sonando al cambiar a otra app
  screenOffPlay: boolean; // seguir sonando con la pantalla apagada / bloqueada
  keepScreenOn: boolean; // no apagar la pantalla mientras suena música
};

/** Potencia del suavizado → ajustes del compresor (umbral en dB y proporción). */
export const SMOOTH_LEVELS = [
  { label: 'Muy suave', threshold: -14, ratio: 2 },
  { label: 'Suave', threshold: -18, ratio: 3 },
  { label: 'Media', threshold: -24, ratio: 6 },
  { label: 'Fuerte', threshold: -30, ratio: 10 },
  { label: 'Muy fuerte', threshold: -36, ratio: 16 },
];

const SETTINGS_KEY = 'teo-tea-music-settings';
const DEFAULT_SETTINGS: MusicSettings = {
  volume: 0.8,
  maxVolume: 0.7,
  smoothPeaks: true,
  smoothStrength: 3,
  fade: true,
  fadeSeconds: 2,
  shuffle: false,
  repeat: 'all',
  backgroundPlay: true,
  screenOffPlay: true,
  keepScreenOn: false,
};

const loadSettings = (): MusicSettings => {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

/** Mezcla aleatoria (Fisher–Yates). */
const shuffled = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/* ------------------------------ Motor de audio ------------------------------ */
const audio = new Audio();
audio.preload = 'auto';

let ctx: AudioContext | null = null;
let compressor: DynamicsCompressorNode | null = null;
let limiterGain: GainNode | null = null;
let fadeGain: GainNode | null = null;
let currentUrl: string | null = null;
let fadingOutForEnd = false;
let switching = false;

/** Crea la cadena de audio en el primer "play" (los navegadores lo exigen tras un toque). */
const ensureGraph = () => {
  if (ctx) return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return; // sin Web Audio: se usa audio.volume como respaldo
  ctx = new Ctor();
  const source = ctx.createMediaElementSource(audio);
  compressor = ctx.createDynamicsCompressor();
  compressor.knee.value = 24;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.25;
  limiterGain = ctx.createGain();
  fadeGain = ctx.createGain();
  fadeGain.gain.value = 0;
  source.connect(compressor);
  compressor.connect(limiterGain);
  limiterGain.connect(fadeGain);
  fadeGain.connect(ctx.destination);
  applyLevels();
};

/** Volumen efectivo = volumen elegido × volumen máximo (nunca supera el límite). */
const effectiveVolume = () => {
  const { volume, maxVolume } = useMusicStore.getState().settings;
  return Math.max(0, Math.min(1, volume * maxVolume));
};

const applyLevels = () => {
  const { smoothPeaks, smoothStrength } = useMusicStore.getState().settings;
  if (ctx && limiterGain && compressor) {
    limiterGain.gain.setTargetAtTime(effectiveVolume(), ctx.currentTime, 0.05);
    const level = SMOOTH_LEVELS[Math.min(SMOOTH_LEVELS.length, Math.max(1, smoothStrength)) - 1];
    // Compresor desactivado = proporción 1:1 (no altera el sonido).
    compressor.ratio.setValueAtTime(smoothPeaks ? level.ratio : 1, ctx.currentTime);
    compressor.threshold.setValueAtTime(smoothPeaks ? level.threshold : 0, ctx.currentTime);
  } else {
    audio.volume = effectiveVolume();
  }
};

const fadeSeconds = () => {
  const { fade, fadeSeconds: secs } = useMusicStore.getState().settings;
  return fade ? secs : 0.05;
};

/** Lleva el fundido a `target` en `seconds`. Resuelve al terminar. */
const fadeTo = (target: number, seconds: number) =>
  new Promise<void>((resolve) => {
    if (!ctx || !fadeGain) {
      resolve();
      return;
    }
    const now = ctx.currentTime;
    fadeGain.gain.cancelScheduledValues(now);
    fadeGain.gain.setValueAtTime(fadeGain.gain.value, now);
    fadeGain.gain.linearRampToValueAtTime(target, now + Math.max(0.02, seconds));
    window.setTimeout(resolve, Math.max(20, seconds * 1000));
  });

const loadIntoAudio = async (item: TrackMeta) => {
  const blob = await getTrackBlob(item.id);
  if (!blob) throw new Error('No se encontró el archivo de la canción en este dispositivo.');
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = URL.createObjectURL(blob);
  audio.src = currentUrl;
  fadingOutForEnd = false;
};

/* --------------------------------- Store --------------------------------- */
type ImportResult = { added: number; skipped: string[] };

/** De dónde sale la cola: todas las canciones o una playlist. */
export type QueueSource = { type: 'all' } | { type: 'playlist'; id: string };

type MusicStore = {
  owner: string | null;
  tracks: TrackMeta[];
  playlists: Playlist[];
  loaded: boolean;
  currentId: string | null;
  queue: string[];
  source: QueueSource;
  isPlaying: boolean;
  position: number;
  duration: number;
  importing: boolean;
  error: string;
  settings: MusicSettings;
  loadFor: (owner: string) => Promise<void>;
  importFiles: (files: FileList | File[]) => Promise<ImportResult>;
  remove: (id: string) => Promise<void>;
  playTrack: (id: string, source?: QueueSource) => Promise<void>;
  playSource: (source: QueueSource, options?: { shuffle?: boolean }) => Promise<void>;
  togglePlay: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  next: (auto?: boolean) => Promise<void>;
  previous: () => Promise<void>;
  seek: (seconds: number) => void;
  toggleShuffle: () => void;
  updateSettings: (changes: Partial<MusicSettings>) => void;
  createPlaylist: (name: string, trackIds?: string[]) => Promise<Playlist | null>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  setPlaylistTracks: (id: string, trackIds: string[]) => Promise<void>;
  addToPlaylist: (id: string, trackIds: string[]) => Promise<void>;
  removePlaylist: (id: string) => Promise<void>;
  stopAndClear: () => void;
};

/** Canciones de una fuente, en su orden original. */
const sourceTrackIds = (state: Pick<MusicStore, 'tracks' | 'playlists'>, source: QueueSource) => {
  if (source.type === 'playlist') {
    const playlist = state.playlists.find((p) => p.id === source.id);
    const existing = new Set(state.tracks.map((t) => t.id));
    return (playlist?.trackIds ?? []).filter((id) => existing.has(id));
  }
  return state.tracks.map((t) => t.id);
};

/** Arma la cola: si hay aleatorio, mezcla dejando primero la canción elegida. */
const buildQueue = (ids: string[], first: string | null, shuffle: boolean) => {
  if (!shuffle) return ids;
  const rest = shuffled(ids.filter((id) => id !== first));
  return first && ids.includes(first) ? [first, ...rest] : rest;
};

export const useMusicStore = create<MusicStore>((set, get) => ({
  owner: null,
  tracks: [],
  playlists: [],
  loaded: false,
  currentId: null,
  queue: [],
  source: { type: 'all' },
  isPlaying: false,
  position: 0,
  duration: 0,
  importing: false,
  error: '',
  settings: loadSettings(),

  loadFor: async (owner) => {
    if (get().owner !== owner) get().stopAndClear();
    try {
      const [tracks, playlists] = await Promise.all([listTracks(owner), listPlaylists(owner)]);
      set({ owner, tracks, playlists, loaded: true, error: '' });
    } catch (error) {
      set({ owner, loaded: true, error: error instanceof Error ? error.message : 'No se pudo cargar tu música.' });
    }
  },

  importFiles: async (fileList) => {
    const owner = get().owner;
    if (!owner) return { added: 0, skipped: [] };
    set({ importing: true, error: '' });
    void requestPersistentStorage();
    const skipped: string[] = [];
    let added = 0;
    for (const file of Array.from(fileList)) {
      if (!isAudioFile(file)) {
        skipped.push(`${file.name} (no es un archivo de audio)`);
        continue;
      }
      if (file.size > MAX_TRACK_BYTES) {
        skipped.push(`${file.name} (pesa más de 60 MB)`);
        continue;
      }
      const duration = await readDuration(file);
      if (duration === null) {
        skipped.push(`${file.name} (formato no compatible con este dispositivo)`);
        continue;
      }
      const { title, artist } = parseFileName(file.name);
      const meta: TrackMeta = {
        id: createTrackId(),
        owner,
        title,
        artist,
        fileName: file.name,
        type: file.type || 'audio/mpeg',
        size: file.size,
        duration,
        addedAt: Date.now() + added,
      };
      try {
        await saveTrack({ ...meta, blob: file });
        added += 1;
        set((state) => ({ tracks: [...state.tracks, meta] }));
      } catch {
        skipped.push(`${file.name} (no hay espacio suficiente)`);
      }
    }
    set({ importing: false });
    return { added, skipped };
  },

  remove: async (id) => {
    if (get().currentId === id) {
      audio.pause();
      audio.removeAttribute('src');
      set({ currentId: null, isPlaying: false, position: 0, duration: 0 });
      mediaSession.setMetadata(null);
      mediaSession.setPlaybackState('none');
    }
    await deleteTrack(id);
    // También se quita de las playlists que la contenían.
    const touched = get().playlists.filter((p) => p.trackIds.includes(id));
    for (const playlist of touched) {
      await savePlaylist({ ...playlist, trackIds: playlist.trackIds.filter((t) => t !== id) });
    }
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== id),
      queue: state.queue.filter((t) => t !== id),
      playlists: state.playlists.map((p) => ({ ...p, trackIds: p.trackIds.filter((t) => t !== id) })),
    }));
  },

  playTrack: async (id, source) => {
    const state = get();
    const item = state.tracks.find((t) => t.id === id);
    if (!item || switching) return;
    // Nueva cola si se indica una fuente o si la canción no está en la cola actual.
    if (source || !state.queue.includes(id)) {
      const from = source ?? state.source;
      set({ source: from, queue: buildQueue(sourceTrackIds(state, from), id, state.settings.shuffle) });
    }
    switching = true;
    try {
      ensureGraph();
      await ctx?.resume();
      if (get().isPlaying) await fadeTo(0, fadeSeconds() / 2);
      await loadIntoAudio(item);
      set({ currentId: id, position: 0, duration: item.duration, error: '' });
      mediaSession.setMetadata({ title: item.title, artist: item.artist || 'Artista desconocido', album: 'TEO + TEA' });
      await get().play();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'No se pudo reproducir la canción.', isPlaying: false });
    } finally {
      switching = false;
    }
  },

  playSource: async (source, options) => {
    const state = get();
    const ids = sourceTrackIds(state, source);
    if (!ids.length) return;
    const shuffle = options?.shuffle ?? state.settings.shuffle;
    if (options?.shuffle !== undefined && options.shuffle !== state.settings.shuffle) {
      get().updateSettings({ shuffle });
    }
    const queue = buildQueue(ids, null, shuffle);
    set({ source, queue });
    await get().playTrack(queue[0]);
  },

  play: async () => {
    if (!get().currentId) {
      await get().playSource(get().source.type === 'playlist' ? get().source : { type: 'all' });
      return;
    }
    ensureGraph();
    await ctx?.resume();
    if (fadeGain && ctx) fadeGain.gain.setValueAtTime(0, ctx.currentTime);
    applyLevels();
    try {
      await audio.play();
      set({ isPlaying: true });
      mediaSession.setPlaybackState('playing');
      syncScreenAwake();
      await fadeTo(1, fadeSeconds());
    } catch {
      set({ isPlaying: false, error: 'El navegador bloqueó la reproducción. Toca ▶ de nuevo.' });
    }
  },

  pause: async () => {
    set({ isPlaying: false });
    syncScreenAwake();
    mediaSession.setPlaybackState('paused');
    await fadeTo(0, fadeSeconds() / 2);
    if (!get().isPlaying) audio.pause();
  },

  togglePlay: async () => (get().isPlaying ? get().pause() : get().play()),

  next: async (auto = false) => {
    const { queue, currentId, settings } = get();
    if (!queue.length) return;
    if (auto && settings.repeat === 'one' && currentId) {
      await get().playTrack(currentId);
      return;
    }
    const index = queue.indexOf(currentId ?? '');
    let nextIndex = index + 1;
    if (nextIndex >= queue.length) {
      if (auto && settings.repeat === 'off') {
        set({ isPlaying: false, position: 0 });
        mediaSession.setPlaybackState('paused');
        audio.currentTime = 0;
        return;
      }
      // Al dar la vuelta con aleatorio, se vuelve a mezclar para no repetir el mismo orden.
      if (settings.shuffle) {
        const reshuffled = buildQueue(queue, null, true);
        set({ queue: reshuffled });
        await get().playTrack(reshuffled[0]);
        return;
      }
      nextIndex = 0;
    }
    await get().playTrack(queue[nextIndex]);
  },

  previous: async () => {
    const { queue, currentId } = get();
    if (!queue.length) return;
    // Como en otros reproductores: si ya avanzó más de 3 s, vuelve al inicio de la canción.
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const index = queue.indexOf(currentId ?? '');
    const prevIndex = index <= 0 ? queue.length - 1 : index - 1;
    await get().playTrack(queue[prevIndex]);
  },

  seek: (seconds) => {
    if (!Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    fadingOutForEnd = false;
    if (fadeGain && ctx && get().isPlaying) void fadeTo(1, 0.15);
    set({ position: audio.currentTime });
    mediaSession.setPositionState(audio.currentTime, audio.duration);
  },

  /** Activa/desactiva el aleatorio y reordena la cola manteniendo la canción actual. */
  toggleShuffle: () => {
    const state = get();
    const shuffle = !state.settings.shuffle;
    state.updateSettings({ shuffle });
    const ids = sourceTrackIds(state, state.source);
    set({ queue: buildQueue(ids, state.currentId, shuffle) });
  },

  updateSettings: (changes) => {
    const settings = { ...get().settings, ...changes };
    if (settings.volume > 1) settings.volume = 1;
    settings.maxVolume = Math.max(0.2, Math.min(1, settings.maxVolume));
    settings.smoothStrength = Math.max(1, Math.min(SMOOTH_LEVELS.length, Math.round(settings.smoothStrength)));
    set({ settings });
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* sin almacenamiento */
    }
    applyLevels();
    syncScreenAwake();
  },

  /* ------------------------------- Playlists ------------------------------- */
  createPlaylist: async (name, trackIds = []) => {
    const owner = get().owner;
    const clean = name.trim().slice(0, 60);
    if (!owner || !clean) return null;
    const playlist: Playlist = { id: createTrackId().replace(/^t-/, 'p-'), owner, name: clean, trackIds, createdAt: Date.now() };
    await savePlaylist(playlist);
    set((state) => ({ playlists: [...state.playlists, playlist] }));
    return playlist;
  },

  renamePlaylist: async (id, name) => {
    const playlist = get().playlists.find((p) => p.id === id);
    const clean = name.trim().slice(0, 60);
    if (!playlist || !clean) return;
    const updated = { ...playlist, name: clean };
    await savePlaylist(updated);
    set((state) => ({ playlists: state.playlists.map((p) => (p.id === id ? updated : p)) }));
  },

  setPlaylistTracks: async (id, trackIds) => {
    const playlist = get().playlists.find((p) => p.id === id);
    if (!playlist) return;
    const updated = { ...playlist, trackIds: [...new Set(trackIds)] };
    await savePlaylist(updated);
    set((state) => ({ playlists: state.playlists.map((p) => (p.id === id ? updated : p)) }));
  },

  addToPlaylist: async (id, trackIds) => {
    const playlist = get().playlists.find((p) => p.id === id);
    if (!playlist) return;
    await get().setPlaylistTracks(id, [...playlist.trackIds, ...trackIds]);
  },

  removePlaylist: async (id) => {
    await dbDeletePlaylist(id);
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== id),
      ...(state.source.type === 'playlist' && state.source.id === id ? { source: { type: 'all' } as QueueSource } : {}),
    }));
  },

  stopAndClear: () => {
    void setScreenAwake(false);
    audio.pause();
    audio.removeAttribute('src');
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = null;
    mediaSession.setMetadata(null);
    mediaSession.setPlaybackState('none');
    set({
      owner: null,
      tracks: [],
      playlists: [],
      loaded: false,
      currentId: null,
      queue: [],
      source: { type: 'all' },
      isPlaying: false,
      position: 0,
      duration: 0,
    });
  },
}));

/* ----------------------------- Eventos del <audio> ----------------------------- */
let lastPositionSync = 0;
audio.addEventListener('timeupdate', () => {
  const { isPlaying, settings } = useMusicStore.getState();
  useMusicStore.setState({ position: audio.currentTime });
  // Posición en la pantalla de bloqueo (cada 5 s basta).
  if (Date.now() - lastPositionSync > 5000) {
    lastPositionSync = Date.now();
    mediaSession.setPositionState(audio.currentTime, audio.duration);
  }
  // Transición suave entre canciones: baja el volumen antes del final.
  const remaining = (audio.duration || 0) - audio.currentTime;
  if (isPlaying && settings.fade && !fadingOutForEnd && audio.duration > settings.fadeSeconds * 3 && remaining <= settings.fadeSeconds) {
    fadingOutForEnd = true;
    void fadeTo(0, Math.max(0.2, remaining));
  }
});
audio.addEventListener('loadedmetadata', () => {
  if (Number.isFinite(audio.duration)) {
    useMusicStore.setState({ duration: audio.duration });
    mediaSession.setPositionState(0, audio.duration);
  }
});
audio.addEventListener('ended', () => {
  void track('music_play'); // logro: canciones escuchadas completas
  void useMusicStore.getState().next(true);
});
/** Pantalla encendida solo mientras suena música y si la persona lo activó. */
function syncScreenAwake() {
  const { isPlaying, settings } = useMusicStore.getState();
  void setScreenAwake(isPlaying && settings.keepScreenOn);
}

/* ------------- Segundo plano y pantalla apagada (activar / desactivar) ------------- */
// - "Música en segundo plano": seguir sonando al cambiar a otra app (pantalla encendida).
// - "Música con la pantalla apagada": seguir sonando al bloquear / apagar la pantalla.
// En la app Android, el plugin propio ScreenState (MainActivity) distingue ambos casos.
// En el navegador no se pueden distinguir: al ocultarse la app se pausa si cualquiera está desactivado.
type ScreenStatePlugin = {
  isScreenOn: () => Promise<{ screenOn: boolean }>;
  addListener: (event: 'screenChange', cb: (data: { screenOn: boolean }) => void) => Promise<unknown>;
};
const ScreenState = registerPlugin<ScreenStatePlugin>('ScreenState');
const isNativeApp = Capacitor.isNativePlatform();

const pauseIf = (shouldPause: (settings: MusicSettings) => boolean) => {
  const { isPlaying, settings, pause } = useMusicStore.getState();
  if (isPlaying && shouldPause(settings)) void pause();
};

if (isNativeApp) {
  // Pantalla apagada (aunque la app ya estuviera en segundo plano).
  void ScreenState.addListener('screenChange', ({ screenOn }) => {
    if (!screenOn) pauseIf((s) => !s.screenOffPlay);
  }).catch(() => undefined);
  // La app pasó a segundo plano: ¿fue por bloquear la pantalla o por cambiar de app?
  void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) return;
    window.setTimeout(async () => {
      const screenOn = await ScreenState.isScreenOn()
        .then((r) => r.screenOn)
        .catch(() => true);
      pauseIf((s) => (screenOn ? !s.backgroundPlay : !s.screenOffPlay));
    }, 700);
  });
} else {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pauseIf((s) => !s.backgroundPlay || !s.screenOffPlay);
  });
}

audio.addEventListener('pause', () => {
  // Pausa externa (auriculares desconectados, llamada, etc.)
  if (!switching && useMusicStore.getState().isPlaying && !audio.ended) {
    useMusicStore.setState({ isPlaying: false });
    mediaSession.setPlaybackState('paused');
    syncScreenAwake();
  }
});

/* ------------------------- Controles del sistema (bloqueo) ------------------------- */
mediaSession.setActionHandler('play', () => void useMusicStore.getState().play());
mediaSession.setActionHandler('pause', () => void useMusicStore.getState().pause());
mediaSession.setActionHandler('nexttrack', () => void useMusicStore.getState().next());
mediaSession.setActionHandler('previoustrack', () => void useMusicStore.getState().previous());
mediaSession.setActionHandler('stop', () => void useMusicStore.getState().pause());
mediaSession.setActionHandler('seekto', (details) => {
  if (details.seekTime != null) useMusicStore.getState().seek(details.seekTime);
});

export const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const formatBytes = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
