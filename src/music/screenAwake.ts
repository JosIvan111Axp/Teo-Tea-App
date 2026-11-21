/**
 * Mantener la pantalla encendida mientras suena música.
 * - App Android: plugin @capacitor-community/keep-awake.
 * - Navegador: Screen Wake Lock API (se libera sola al ocultar la pestaña; se vuelve a pedir al volver).
 */
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';

const isNative = Capacitor.isNativePlatform();
let wanted = false;
let webLock: WakeLockSentinel | null = null;

const requestWebLock = async () => {
  try {
    if (!('wakeLock' in navigator) || webLock) return;
    webLock = await navigator.wakeLock.request('screen');
    webLock.addEventListener('release', () => {
      webLock = null;
    });
  } catch {
    /* el navegador lo rechazó (p. ej. batería baja): no es crítico */
  }
};

/** Activa o desactiva el "no apagar pantalla". */
export const setScreenAwake = async (on: boolean) => {
  if (on === wanted) return;
  wanted = on;
  if (isNative) {
    try {
      await (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep());
    } catch {
      /* no soportado en este dispositivo */
    }
    return;
  }
  if (on) await requestWebLock();
  else {
    await webLock?.release().catch(() => undefined);
    webLock = null;
  }
};

// En el navegador el bloqueo se pierde al cambiar de pestaña: se recupera al volver.
document.addEventListener('visibilitychange', () => {
  if (!isNative && wanted && document.visibilityState === 'visible') void requestWebLock();
});
