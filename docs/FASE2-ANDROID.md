# Fase 2 · App Android con música en segundo plano

La app web ya funciona en el navegador del celular. Esta fase la convierte en una **app Android
instalable** (APK) para que la música siga sonando de forma confiable con la app cerrada o la
pantalla bloqueada, con controles en la notificación.

## Qué ya está hecho

- Plugin nativo `@capgo/capacitor-media-session`: inicia un **servicio en primer plano de tipo
  "reproducción multimedia"**, que es lo que Android exige para no pausar ni cerrar la app mientras
  suena música. El código está en `src/music/mediaSession.ts` (en el navegador sigue usando la
  Media Session web).
- Permisos en `android/app/src/main/AndroidManifest.xml`: `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_MEDIA_PLAYBACK` (obligatorio desde Android 14), `WAKE_LOCK` y
  `POST_NOTIFICATIONS`.
- Nombre de la app: **TEO + TEA**.
- La app nativa usa la dirección de la API de `.env.local` (`VITE_NATIVE_API_URL`).

## Requisitos (una sola vez)

1. Instalar **Android Studio** (incluye el Java 21 y el SDK de Android que pide Capacitor 8):
   <https://developer.android.com/studio>
   - En el asistente inicial, aceptar la instalación del **Android SDK** recomendado.
2. En el celular: **Ajustes → Acerca del teléfono → tocar 7 veces "Número de compilación"** para
   activar las *Opciones de desarrollador*, y dentro de ellas activar **Depuración por USB**.

## Cada vez que quieras probar en el celular

1. Revisa la IP de tu PC en la Wi-Fi (`ipconfig` → "Dirección IPv4") y que coincida con
   `VITE_NATIVE_API_URL` en `.env.local`. El celular debe estar en la **misma Wi-Fi**.
2. Con la API encendida (`npm run api`), en la carpeta del proyecto:

   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```

3. En Android Studio: conecta el celular por USB, elígelo arriba y pulsa **▶ Run**.
   - Para generar un archivo instalable: **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
     Queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

> Si el celular no conecta con la API: permite el puerto **3001** en el Firewall de Windows
> (red privada) y confirma que la PC y el teléfono están en la misma red.

## Qué probar

- Importar canciones (el selector de archivos abre la música del teléfono).
- Reproducir, bloquear la pantalla y **cambiar a otra app**: la música debe seguir.
- Controles en la notificación y en la pantalla de bloqueo (play/pausa, siguiente, anterior).
- Limitador de volumen, potencia del suavizado y transición suave.

## Antes de publicar en Play Store (más adelante)

- Cambiar `appId` (`io.ionic.starter`) por uno propio, p. ej. `org.senderoazul.teotea`
  (implica regenerar la carpeta `android/`).
- Publicar la API con **HTTPS** y quitar `androidScheme: 'http'` / `cleartext` de
  `capacitor.config.ts` y `usesCleartextTraffic` del manifiesto.
- Ícono y pantalla de inicio propios, y firma de la app (keystore).
