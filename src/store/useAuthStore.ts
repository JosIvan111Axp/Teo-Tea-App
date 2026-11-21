import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { UserProfile } from '../data/mockData';
import { api, errorMessage, setAuthToken, setUnauthorizedHandler } from '../api/client';
import { safeLocalStorage } from '../utils/helpers';

export type RegisterInput = {
  name: string;
  username: string;
  email: string;
  password: string;
  country: string;
  city: string;
  birthdate: string;
  role: string;
};

type AuthResult = { ok: true } | { ok: false; error: string };
type AuthResponse = { token: string; user: UserProfile };

type AuthStore = {
  token: string | null;
  user: UserProfile | null;
  register: (input: RegisterInput) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (
    changes: Partial<Pick<UserProfile, 'name' | 'profession' | 'bio' | 'skills' | 'interests'>>,
  ) => Promise<AuthResult>;
};

// Cuenta creada por `npm run db:init` en el servidor.
export const DEMO_EMAIL = 'demo@teotea.app';
export const DEMO_PASSWORD = 'demo1234';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => {
      const startSession = ({ token, user }: AuthResponse) => {
        setAuthToken(token);
        set({ token, user });
      };

      return {
        token: null,
        user: null,

        register: async (input) => {
          try {
            startSession(await api<AuthResponse>('/auth/register', { method: 'POST', body: input }));
            return { ok: true };
          } catch (error) {
            return { ok: false, error: errorMessage(error) };
          }
        },

        login: async (email, password) => {
          try {
            startSession(await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }));
            return { ok: true };
          } catch (error) {
            return { ok: false, error: errorMessage(error) };
          }
        },

        logout: () => {
          setAuthToken(null);
          set({ token: null, user: null });
        },

        refreshUser: async () => {
          try {
            const { user } = await api<{ user: UserProfile }>('/auth/me');
            set({ user });
          } catch {
            // Sin conexión: se conserva el usuario guardado. Un 401 cierra la sesión (ver abajo).
          }
        },

        updateProfile: async (changes) => {
          try {
            const { user } = await api<{ user: UserProfile }>('/auth/me', { method: 'PATCH', body: changes });
            set({ user });
            return { ok: true };
          } catch (error) {
            return { ok: false, error: errorMessage(error) };
          }
        },
      };
    },
    {
      name: 'teo-tea-session',
      version: 2,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: ({ token, user }) => ({ token, user }),
      onRehydrateStorage: () => (state) => setAuthToken(state?.token ?? null),
    },
  ),
);

// Si el servidor rechaza el token, se cierra la sesión automáticamente.
setUnauthorizedHandler(() => useAuthStore.getState().logout());

export const useCurrentUser = () => useAuthStore((state) => state.user);

export const useIsLoggedIn = () => useAuthStore((state) => Boolean(state.token && state.user));
