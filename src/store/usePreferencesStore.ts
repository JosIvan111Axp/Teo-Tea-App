import { create } from 'zustand';

/** Preferencias de uso que se recuerdan en este dispositivo. */
const CONFIRM_LINKS_KEY = 'teo-tea-confirm-links';

const readConfirmLinks = () => {
  try {
    return localStorage.getItem(CONFIRM_LINKS_KEY) !== 'off';
  } catch {
    return true;
  }
};

type PreferencesStore = {
  /** Preguntar antes de abrir un sitio externo (activado por defecto). */
  confirmExternalLinks: boolean;
  setConfirmExternalLinks: (value: boolean) => void;
};

export const usePreferencesStore = create<PreferencesStore>((set) => ({
  confirmExternalLinks: readConfirmLinks(),
  setConfirmExternalLinks: (value) => {
    try {
      localStorage.setItem(CONFIRM_LINKS_KEY, value ? 'on' : 'off');
    } catch {
      /* sin almacenamiento: dura solo esta sesión */
    }
    set({ confirmExternalLinks: value });
  },
}));
