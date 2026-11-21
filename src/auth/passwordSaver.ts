import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Pide al teléfono o al navegador que guarde la contraseña, y la recupera al iniciar sesión.
 * - App Android: Credential Manager (Google Password Manager), plugin propio PasswordSaver.
 * - Navegador (Chrome/Edge): Credential Management API (PasswordCredential).
 * Si nada de eso existe, no hace nada: el autocompletado normal del navegador sigue funcionando.
 */

type NativeSaver = {
  save(options: { id: string; password: string }): Promise<{ saved: boolean; cancelled?: boolean }>;
  get(): Promise<{ id?: string; password?: string; none?: boolean; cancelled?: boolean }>;
};

const NativePasswordSaver = registerPlugin<NativeSaver>('PasswordSaver');

type PasswordCredentialCtor = new (data: { id: string; password: string; name?: string }) => Credential;
type WebPasswordCredential = Credential & { password?: string };

const isNative = () => Capacitor.getPlatform() === 'android';
const webCtor = () =>
  (window as unknown as { PasswordCredential?: PasswordCredentialCtor }).PasswordCredential;

export const canUseSavedPasswords = () => isNative() || Boolean(webCtor() && navigator.credentials);

/** Huella simple para no volver a preguntar por la misma combinación (no guarda la contraseña). */
const fingerprint = (id: string, password: string) => {
  let hash = 5381;
  for (const ch of `${id.toLowerCase()}\u0000${password}`) hash = ((hash << 5) + hash + ch.charCodeAt(0)) | 0;
  return String(hash >>> 0);
};
const ASKED_KEY = 'teo-password-asked';

const alreadyAsked = (id: string, password: string) => {
  try {
    const list = JSON.parse(localStorage.getItem(ASKED_KEY) ?? '[]') as string[];
    return list.includes(fingerprint(id, password));
  } catch {
    return false;
  }
};

const rememberAsked = (id: string, password: string) => {
  try {
    const list = JSON.parse(localStorage.getItem(ASKED_KEY) ?? '[]') as string[];
    const next = [...list.filter((f) => f !== fingerprint(id, password)), fingerprint(id, password)].slice(-10);
    localStorage.setItem(ASKED_KEY, JSON.stringify(next));
  } catch {
    // sin almacenamiento: se volverá a ofrecer la próxima vez, no pasa nada
  }
};

/** Ofrece guardar la contraseña tras iniciar sesión o crear la cuenta. Nunca lanza errores. */
export const offerToSavePassword = async (id: string, password: string, name?: string) => {
  if (!id || !password || alreadyAsked(id, password)) return;
  try {
    if (isNative()) {
      await NativePasswordSaver.save({ id, password });
      rememberAsked(id, password);
      return;
    }
    const Ctor = webCtor();
    if (Ctor && navigator.credentials) {
      await navigator.credentials.store(new Ctor({ id, password, name }));
      rememberAsked(id, password);
    }
  } catch {
    // el usuario lo rechazó o el dispositivo no lo admite
  }
};

/** Abre el selector de cuentas guardadas. Devuelve null si no hay o se cancela. */
export const pickSavedPassword = async (): Promise<{ id: string; password: string } | null> => {
  try {
    if (isNative()) {
      const result = await NativePasswordSaver.get();
      return result.id && result.password ? { id: result.id, password: result.password } : null;
    }
    if (webCtor() && navigator.credentials) {
      const credential = (await navigator.credentials.get({
        password: true,
        mediation: 'optional',
      } as CredentialRequestOptions)) as WebPasswordCredential | null;
      return credential?.id && credential.password ? { id: credential.id, password: credential.password } : null;
    }
  } catch {
    // sin soporte o cancelado
  }
  return null;
};
