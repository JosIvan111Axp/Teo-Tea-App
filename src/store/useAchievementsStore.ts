import { create } from 'zustand';
import { api } from '../api/client';

export type AchievementCategory =
  | 'biblioteca'
  | 'musica'
  | 'comunidad'
  | 'derechos'
  | 'trabajo'
  | 'fundacion'
  | 'informacion'
  | 'perfil'
  | 'constancia';

export type Achievement = {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  goal: number;
  value: number;
  xp: number;
  unlocked: boolean;
  unlockedAt: number | null;
};

export type AchievementsSummary = {
  level: number;
  title: string;
  xp: number;
  levelXp: number;
  nextLevelXp: number;
  maxLevel: number;
  unlockedCount: number;
  total: number;
  achievements: Achievement[];
};

type Unlocked = { id: string; name: string; xp: number };

type EventResponse = { level: number; title: string; xp: number; newlyUnlocked: Unlocked[] };

type AchievementsStore = {
  summary: AchievementsSummary | null;
  loading: boolean;
  /** Cola de avisos "¡Logro desbloqueado!" pendientes de mostrar. */
  queue: Unlocked[];
  levelUp: number | null;
  /** Último nivel conocido (para detectar subidas de nivel). */
  knownLevel: number | null;
  fetchSummary: () => Promise<void>;
  dismiss: () => void;
  dismissLevelUp: () => void;
  reset: () => void;
  _handle: (response: EventResponse) => void;
};

export const useAchievementsStore = create<AchievementsStore>((set, get) => ({
  summary: null,
  loading: false,
  queue: [],
  levelUp: null,
  knownLevel: null,

  fetchSummary: async () => {
    set({ loading: true });
    try {
      const summary = await api<AchievementsSummary>('/me/achievements');
      set({ summary, knownLevel: summary.level });
    } catch {
      /* sin conexión: se mostrará al volver */
    } finally {
      set({ loading: false });
    }
  },

  dismiss: () => set((state) => ({ queue: state.queue.slice(1) })),
  dismissLevelUp: () => set({ levelUp: null }),
  reset: () => set({ summary: null, queue: [], levelUp: null, knownLevel: null }),

  _handle: (response) => {
    const previousLevel = get().knownLevel;
    set({ knownLevel: response.level });
    if (response.newlyUnlocked.length) {
      set((state) => ({ queue: [...state.queue, ...response.newlyUnlocked] }));
    }
    if (previousLevel && response.level > previousLevel) set({ levelUp: response.level });
    // Mantiene el resumen al día (nivel y XP) sin recargar toda la lista.
    set((state) =>
      state.summary
        ? { summary: { ...state.summary, level: response.level, title: response.title, xp: response.xp } }
        : {},
    );
    if (response.newlyUnlocked.length && get().summary) void get().fetchSummary();
  },
}));

export type TrackEvent =
  | 'day'
  | 'check'
  | 'visit'
  | 'law_area'
  | 'law_country'
  | 'law_link'
  | 'job_site'
  | 'linkedin_step'
  | 'foundation_link'
  | 'info_article'
  | 'app_open'
  | 'dark_mode'
  | 'start_page_set'
  | 'music_play'
  | 'songs_imported';

/** Convierte un texto en una referencia corta y segura (ej. "Ley 361 de 1997" → "ley-361-de-1997"). */
export const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

/**
 * Registra una acción para los logros. Nunca interrumpe la app: si falla, se ignora.
 * Ejemplos: track('visit', 'biblioteca') · track('music_play') · track('check') tras publicar.
 */
export const track = async (event: TrackEvent, ref?: string, amount?: number) => {
  try {
    const response = await api<EventResponse>('/me/events', {
      method: 'POST',
      body: { event, ref: ref ? slugify(ref) : undefined, amount },
    });
    useAchievementsStore.getState()._handle(response);
  } catch {
    /* los logros son opcionales */
  }
};
