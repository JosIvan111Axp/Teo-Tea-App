import { create } from 'zustand';
import {
  MAX_TRACK_BYTES,
  createTrackId,
  deleteTrack,
  getTrackBlob,
  isAudioFile,
  listTracks,
  parseFileName,
  readDuration,
  requestPersistentStorage,
  saveTrack,
  type TrackMeta,
} from '../music/musicDb';

/* =============================================================================
 * Reproductor local de TEO + TEA
 *
 *   <audio> → [Compresor: suaviza picos] → [Limitador: volumen × máximo] → [Fundido] → salida
 *
 * - Cuidado auditivo: el "volumen máximo" pone un techo que el volumen normal nunca supera,
 *   y el compresor reduce los golpes de sonido fuertes dentro de una misma canción.
 * - Transición suave: fundido al dar play/pausa y entre canciones (al terminar una, baja
 *   el volumen gradualmente y la siguiente entra subiendo).
 * - Media Session: controles en la pantalla de bloqueo / notificación del sistema.
 * ========================================================================== */

export type RepeatMode = 'off' | 'all' | 'one';

export type MusicSettings = {
  volume: number; // 0..1 (lo que elige la persona)
  maxVolume: number; // 0.2..1 (limitador)
  smoothPeaks: boolean; // compresor
  fade: boolean; // transiciones suaves
  fadeSeconds: number; // 1 | 2 | 4
  shuffle: boolean;
  repeat: RepeatMode;
};

const SETTINGS_KEY = 'teo-tea-music-settings';
const DEFAULT_SETTINGS: MusicSettings = {
  volume: 0.8,
  maxVolume: 0.7,
  smoothPeaks: true,
  fade: true,
  fadeSeconds: 2,
  shuffle: false,
  repeat: 'all',
};

const loadSettings = (): MusicSettings => {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
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
  compressor.threshold.value = -24;
  compressor.knee.value = 24;
  compressor.ratio.value = 8;
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
  const { smoothPeaks } = useMusicStore.getState().settings;
  if (ctx && limiterGain && compressor) {
    limiterGain.gain.setTargetAtTime(effectiveVolume(), ctx.currentTime, 0.05);
    // Compresor desactivado = proporción 1:1 (no altera el sonido).
    compressor.ratio.setValueAtTime(smoothPeaks ? 8 : 1, ctx.currentTime);
    compressor.threshold.setValueAtTime(smoothPeaks ? -24 : 0, ctx.currentTime);
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

const loadIntoAudio = async (track: TrackMeta) => {
  const blob = await getTrackBlob(track.id);
  if (!blob) throw new Error('No se encontró el archivo de la canción en este dispositivo.');
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = URL.createObjectURL(blob);
  audio.src = currentUrl;
  fadingOutForEnd = false;
};

const updateMediaSession = (track: TrackMeta | null) => {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = track
    ? new MediaMetadata({ title: track.title, artist: track.artist || 'Artista desconocido', album: 'TEO + TEA' })
    : null;
};

/* --------------------------------- Store --------------------------------- */
type ImportResult = { added: number; skipped: string[] };

type MusicStore = {
  owner: string | null;
  tracks: TrackMeta[];
  loaded: boolean;
  currentId: string | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  importing: boolean;
  error: string;
  settings: MusicSettings;
  loadFor: (owner: string) => Promise<void>;
  importFiles: (files: FileList | File[]) => Promise<ImportResult>;
  remove: (id: string) => Promise<void>;
  playTrack: (id: string) => Promise<void>;
  togglePlay: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  next: (auto?: boolean) => Promise<void>;
  previous: () => Promise<void>;
  seek: (seconds: number) => void;
  updateSettings: (changes: Partial<MusicSettings>) => void;
  stopAndClear: () => void;
};

export const useMusicStore = create<MusicStore>((set, get) => ({
  owner: null,
  tracks: [],
  loaded: false,
  currentId: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  importing: false,
  error: '',
  settings: loadSettings(),

  loadFor: async (owner) => {
    if (get().owner !== owner) get().stopAndClear();
    try {
      const tracks = await listTracks(owner);
      set({ owner, tracks, loaded: true, error: '' });
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
      updateMediaSession(null);
    }
    await deleteTrack(id);
    set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) }));
  },

  playTrack: async (id) => {
    const track = get().tracks.find((t) => t.id === id);
    if (!track || switching) return;
    switching = true;
    try {
      ensureGraph();
      await ctx?.resume();
      if (get().isPlaying) await fadeTo(0, fadeSeconds() / 2);
      await loadIntoAudio(track);
      set({ currentId: id, position: 0, duration: track.duration, error: '' });
      updateMediaSession(track);
      await get().play();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'No se pudo reproducir la canción.', isPlaying: false });
    } finally {
      switching = false;
    }
  },

  play: async () => {
    if (!get().currentId) {
      const first = get().tracks[0];
      if (first) await get().playTrack(first.id);
      return;
    }
    ensureGraph();
    await ctx?.resume();
    if (fadeGain && ctx) fadeGain.gain.setValueAtTime(0, ctx.currentTime);
    applyLevels();
    try {
      await audio.play();
      set({ isPlaying: true });
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      await fadeTo(1, fadeSeconds());
    } catch {
      set({ isPlaying: false, error: 'El navegador bloqueó la reproducción. Toca ▶ de nuevo.' });
    }
  },

  pause: async () => {
    set({ isPlaying: false });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    await fadeTo(0, fadeSeconds() / 2);
    if (!get().isPlaying) audio.pause();
  },

  togglePlay: async () => (get().isPlaying ? get().pause() : get().play()),

  next: async (auto = false) => {
    const { tracks, currentId, settings } = get();
    if (!tracks.length) return;
    const index = tracks.findIndex((t) => t.id === currentId);
    if (auto && settings.repeat === 'one' && currentId) {
      await get().playTrack(currentId);
      return;
    }
    let nextIndex: number;
    if (settings.shuffle && tracks.length > 1) {
      do nextIndex = Math.floor(Math.random() * tracks.length);
      while (nextIndex === index);
    } else {
      nextIndex = index + 1;
      if (nextIndex >= tracks.length) {
        if (auto && settings.repeat === 'off') {
          set({ isPlaying: false, position: 0 });
          audio.currentTime = 0;
          return;
        }
        nextIndex = 0;
      }
    }
    await get().playTrack(tracks[nextIndex].id);
  },

  previous: async () => {
    const { tracks, currentId } = get();
    if (!tracks.length) return;
    // Como en otros reproductores: si ya avanzó más de 3 s, vuelve al inicio de la canción.
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const index = tracks.findIndex((t) => t.id === currentId);
    const prevIndex = index <= 0 ? tracks.length - 1 : index - 1;
    await get().playTrack(tracks[prevIndex].id);
  },

  seek: (seconds) => {
    if (!Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    fadingOutForEnd = false;
    if (fadeGain && ctx && get().isPlaying) fadeTo(1, 0.15);
    set({ position: audio.currentTime });
  },

  updateSettings: (changes) => {
    const settings = { ...get().settings, ...changes };
    if (settings.volume > 1) settings.volume = 1;
    settings.maxVolume = Math.max(0.2, Math.min(1, settings.maxVolume));
    set({ settings });
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* sin almacenamiento */
    }
    applyLevels();
  },

  stopAndClear: () => {
    audio.pause();
    audio.removeAttribute('src');
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = null;
    updateMediaSession(null);
    set({ owner: null, tracks: [], loaded: false, currentId: null, isPlaying: false, position: 0, duration: 0 });
  },
}));

/* ----------------------------- Eventos del <audio> ----------------------------- */
audio.addEventListener('timeupdate', () => {
  const { isPlaying, settings } = useMusicStore.getState();
  useMusicStore.setState({ position: audio.currentTime });
  // Transición suave entre canciones: baja el volumen antes del final.
  const remaining = (audio.duration || 0) - audio.currentTime;
  if (isPlaying && settings.fade && !fadingOutForEnd && audio.duration > settings.fadeSeconds * 3 && remaining <= settings.fadeSeconds) {
    fadingOutForEnd = true;
    void fadeTo(0, Math.max(0.2, remaining));
  }
});
audio.addEventListener('loadedmetadata', () => {
  if (Number.isFinite(audio.duration)) useMusicStore.setState({ duration: audio.duration });
});
audio.addEventListener('ended', () => {
  void useMusicStore.getState().next(true);
});
audio.addEventListener('pause', () => {
  // Pausa externa (auriculares desconectados, llamada, etc.)
  if (!switching && useMusicStore.getState().isPlaying && !audio.ended) useMusicStore.setState({ isPlaying: false });
});

/* ------------------------- Controles del sistema (bloqueo) ------------------------- */
if ('mediaSession' in navigator) {
  const session = navigator.mediaSession;
  const safe = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
    try {
      session.setActionHandler(action, handler);
    } catch {
      /* acción no soportada en este navegador */
    }
  };
  safe('play', () => void useMusicStore.getState().play());
  safe('pause', () => void useMusicStore.getState().pause());
  safe('nexttrack', () => void useMusicStore.getState().next());
  safe('previoustrack', () => void useMusicStore.getState().previous());
  safe('seekto', (details) => {
    if (details.seekTime != null) useMusicStore.getState().seek(details.seekTime);
  });
}

export const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const formatBytes = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
