/**
 * Controles del sistema (pantalla de bloqueo / notificación).
 *
 * - App Android (Capacitor): plugin nativo @capgo/capacitor-media-session, que inicia un
 *   servicio en primer plano de tipo "mediaPlayback". Eso evita que Android pause o cierre la
 *   app mientras suena música en segundo plano (fase 2).
 * - Navegador: Media Session API estándar (fase 1, ya probada).
 */
import { Capacitor } from '@capacitor/core';
import { MediaSession } from '@capgo/capacitor-media-session';

type Action = 'play' | 'pause' | 'nexttrack' | 'previoustrack' | 'seekto' | 'stop';
type Handler = (details: { seekTime?: number | null }) => void;

const isNative = Capacitor.isNativePlatform();
const webSession = !isNative && 'mediaSession' in navigator ? navigator.mediaSession : null;

const ignore = () => undefined;

export const mediaSession = {
  setMetadata(meta: { title: string; artist: string; album?: string } | null) {
    if (isNative) {
      if (meta) void MediaSession.setMetadata({ title: meta.title, artist: meta.artist, album: meta.album }).catch(ignore);
      return;
    }
    if (!webSession) return;
    webSession.metadata = meta ? new MediaMetadata(meta) : null;
  },

  setPlaybackState(state: 'playing' | 'paused' | 'none') {
    if (isNative) {
      void MediaSession.setPlaybackState({ playbackState: state }).catch(ignore);
      return;
    }
    if (webSession) webSession.playbackState = state;
  },

  setPositionState(position: number, duration: number) {
    if (!Number.isFinite(duration) || duration <= 0) return;
    const safe = { duration, position: Math.min(Math.max(0, position), duration), playbackRate: 1 };
    if (isNative) {
      void MediaSession.setPositionState(safe).catch(ignore);
      return;
    }
    try {
      webSession?.setPositionState?.(safe);
    } catch {
      /* algunos navegadores no lo soportan */
    }
  },

  setActionHandler(action: Action, handler: Handler) {
    if (isNative) {
      void MediaSession.setActionHandler({ action }, (details) => handler(details)).catch(ignore);
      return;
    }
    try {
      webSession?.setActionHandler(action, (details) => handler(details));
    } catch {
      /* acción no soportada en este navegador */
    }
  },
};
