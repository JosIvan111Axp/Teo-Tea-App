import { Capacitor } from '@capacitor/core';

/**
 * Cliente HTTP de la API de TEO + TEA.
 * URL configurable con VITE_API_URL; por defecto usa el mismo host que la app en el puerto 3001
 * (así funciona también desde el celular en la red local).
 */
// En la app nativa (Android) "localhost" es el propio teléfono: se usa VITE_NATIVE_API_URL
// (la IP de la PC con la API en la red Wi-Fi, definida en .env.local; ver .env.example).
const nativeApiUrl = Capacitor.isNativePlatform() ? import.meta.env.VITE_NATIVE_API_URL : undefined;

export const API_URL: string =
  nativeApiUrl ??
  import.meta.env.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:3001/api`;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

/** Se llama cuando el servidor responde 401 (sesión expirada o inválida). */
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

export const api = async <T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0);
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && authToken) onUnauthorized?.();
    throw new ApiError(data.error ?? 'Ocurrió un error inesperado.', response.status);
  }
  return data as T;
};

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Ocurrió un error inesperado.';

/** URL completa de un archivo servido por la API (fotos de perfil, imágenes). */
export const mediaUrl = (path: string | null | undefined) =>
  path ? `${API_URL.replace(/\/api\/?$/, '')}/${path.replace(/^\//, '')}` : null;
