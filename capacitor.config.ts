import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ⚠ Antes de publicar en Play Store conviene un identificador propio (p. ej. org.senderoazul.teotea).
  //   Cambiarlo implica regenerar la carpeta android/, por eso se mantiene el de la plantilla por ahora.
  appId: 'io.ionic.starter',
  appName: 'TEO + TEA',
  webDir: 'dist',
  server: {
    // Desarrollo: la app nativa habla con la API local por http (red Wi-Fi).
    // Para producción usar HTTPS y quitar estas dos opciones.
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
