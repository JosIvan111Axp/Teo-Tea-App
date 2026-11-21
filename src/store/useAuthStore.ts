import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mockData, type UserProfile } from '../data/mockData';
import { createId, hashPassword, safeLocalStorage } from '../utils/helpers';

type StoredUser = UserProfile & { passwordHash: string };

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

type AuthStore = {
  users: StoredUser[];
  currentUserId: string | null;
  seedDemoUser: () => Promise<void>;
  register: (input: RegisterInput) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  updateProfile: (changes: Partial<Omit<UserProfile, 'id' | 'email'>>) => void;
};

export const DEMO_EMAIL = mockData.profile.email;
export const DEMO_PASSWORD = 'demo1234';

const normalizeEmail = (email: string) => email.trim().toLocaleLowerCase();
const normalizeUsername = (username: string) =>
  `@${username.trim().replace(/^@+/, '').toLocaleLowerCase()}`;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,

      seedDemoUser: async () => {
        if (get().users.some((user) => user.id === mockData.profile.id)) return;
        const passwordHash = await hashPassword(DEMO_PASSWORD);
        set((state) => ({
          users: [...state.users, { ...mockData.profile, passwordHash }],
        }));
      },

      register: async (input) => {
        const email = normalizeEmail(input.email);
        const username = normalizeUsername(input.username);
        const { users } = get();

        if (users.some((user) => user.email === email)) {
          return { ok: false, error: 'Ya existe una cuenta con este correo. Prueba iniciar sesión.' };
        }
        if (users.some((user) => user.username === username)) {
          return { ok: false, error: 'Ese nombre de usuario ya está en uso. Elige otro.' };
        }

        const user: StoredUser = {
          id: createId('user'),
          email,
          username,
          name: input.name.trim(),
          role: input.role,
          profession: '',
          birthdate: input.birthdate,
          city: input.city.trim(),
          country: input.country,
          bio: '',
          skills: [],
          interests: [],
          passwordHash: await hashPassword(input.password),
        };

        set({ users: [...users, user], currentUserId: user.id });
        return { ok: true };
      },

      login: async (email, password) => {
        const user = get().users.find((item) => item.email === normalizeEmail(email));
        if (!user || user.passwordHash !== (await hashPassword(password))) {
          return { ok: false, error: 'Correo o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.' };
        }
        set({ currentUserId: user.id });
        return { ok: true };
      },

      logout: () => set({ currentUserId: null }),

      updateProfile: (changes) =>
        set((state) => ({
          users: state.users.map((user) =>
            user.id === state.currentUserId ? { ...user, ...changes } : user,
          ),
        })),
    }),
    {
      name: 'teo-tea-auth',
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
    },
  ),
);

/** Usuario con sesión activa (sin el hash de la contraseña). */
export const useCurrentUser = (): UserProfile | null =>
  useAuthStore((state) => {
    const user = state.users.find((item) => item.id === state.currentUserId);
    return user ?? null;
  });

export const useIsLoggedIn = () =>
  useAuthStore((state) => state.users.some((user) => user.id === state.currentUserId));
