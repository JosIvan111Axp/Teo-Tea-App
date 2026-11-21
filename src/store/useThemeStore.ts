import { create } from 'zustand';

/** Modo de color de toda la app. Se recuerda en el navegador/dispositivo. */
export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'teo-tea-theme';

const readSaved = (): ThemeMode | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
};

/** Primera vez: se respeta la preferencia del sistema operativo. */
const initialMode = (): ThemeMode =>
  readSaved() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

/** Aplica el modo al documento (clase de la paleta oscura de Ionic + color-scheme del navegador). */
export const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  root.classList.toggle('ion-palette-dark', mode === 'dark');
  root.style.colorScheme = mode;
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', mode);
};

/** Estilo de los íconos del Inicio: líneas (Ionicons) o ilustraciones propias (assets/icons/ilustrado). */
export type IconStyle = 'lineas' | 'ilustrado';
const ICON_STYLE_KEY = 'teo-tea-icon-style';

const readIconStyle = (): IconStyle => {
  try {
    return localStorage.getItem(ICON_STYLE_KEY) === 'lineas' ? 'lineas' : 'ilustrado';
  } catch {
    return 'ilustrado';
  }
};

type ThemeStore = {
  mode: ThemeMode;
  iconStyle: IconStyle;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  setIconStyle: (style: IconStyle) => void;
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: initialMode(),
  iconStyle: readIconStyle(),
  setIconStyle: (iconStyle) => {
    try {
      localStorage.setItem(ICON_STYLE_KEY, iconStyle);
    } catch {
      /* sin almacenamiento */
    }
    set({ iconStyle });
  },
  setMode: (mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* sin almacenamiento: dura solo esta sesión */
    }
    applyTheme(mode);
    set({ mode });
  },
  toggle: () => get().setMode(get().mode === 'dark' ? 'light' : 'dark'),
}));

// Se aplica de inmediato al cargar, antes de pintar la app (evita el destello claro).
applyTheme(useThemeStore.getState().mode);
