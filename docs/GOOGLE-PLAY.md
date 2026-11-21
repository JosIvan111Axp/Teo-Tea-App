# Publicar TEO + TEA en Google Play

Guía paso a paso para pasar del APK de pruebas a la app publicada en Google Play, con sus costos.
Datos revisados en noviembre de 2026. Google cambia sus reglas seguido: confirma cada punto en la
Play Console antes de pagar o enviar.

---

## 1. Costos

| Concepto | Costo | Frecuencia | Notas |
|---|---|---|---|
| Cuenta de desarrollador de Google Play | **USD 25** | Una sola vez | Se paga con tarjeta al crear la cuenta. |
| Número D-U-N-S (solo cuenta de **organización**) | Gratis | Una vez | Lo emite Dun & Bradstreet. Tarda de días a unas semanas. |
| Servidor para la API y MySQL | **USD 5–12** | Mensual | VPS (Hetzner, DigitalOcean, Contabo…) o plataformas como Railway/Render. |
| Dominio | USD 0–15 | Anual | **Gratis** si se usa un subdominio de la fundación, p. ej. `api.fundacionsenderoazul.org`. |
| Certificado HTTPS | Gratis | — | Let's Encrypt (Caddy o Certbot lo renuevan solos). |
| Política de privacidad | Gratis | — | Una página en la web de la fundación. |
| Comisión de Google | USD 0 | — | La app es gratis y no vende nada dentro. |

**Mínimo realista: USD 25 una vez + unos USD 5–10 al mes de servidor.**

> Si más adelante quieren iPhone: la cuenta de Apple Developer cuesta USD 99 al año (o gratis
> para organizaciones sin fines de lucro que la soliciten y sean aprobadas) y se necesita una Mac
> para compilar.

---

## 2. ¿Cuenta personal o de organización?

**Recomendado: cuenta de organización a nombre de Fundación Sendero Azul.**

- **Personal:** las cuentas nuevas deben hacer una **prueba cerrada con al menos 12 personas
  durante 14 días seguidos** antes de poder publicar. Además, la ficha muestra el nombre de la persona.
- **Organización:** no tiene esa regla de 12 testers. Pide el **número D-U-N-S** de la fundación,
  un correo y un teléfono de contacto verificados y un sitio web. La ficha aparece como
  "Fundación Sendero Azul", lo que da más confianza.

Para pedir el D-U-N-S: busca "D-U-N-S lookup" en la ayuda de la Play Console. Google enlaza el
formulario gratuito de Dun & Bradstreet.

---

## 3. Preparar la app (código)

Estos cambios se hacen una sola vez. Puedo hacerlos cuando decidas publicar.

1. **Identificador propio de la app.** Hoy es `io.ionic.starter` (el de la plantilla). Hay que
   cambiarlo antes de la primera subida, porque **después ya no se puede cambiar**. Por ejemplo,
   `org.senderoazul.teotea`. Se edita en `capacitor.config.ts` (`appId`) y en
   `android/app/build.gradle` (`applicationId`).
2. **API publicada con HTTPS.** El celular de cualquier persona debe llegar al servidor, no a tu PC:
   - Sube `server/` y la base MySQL a un VPS y pon delante Caddy o Nginx con Let's Encrypt.
   - Cambia `VITE_NATIVE_API_URL` a `https://api.tu-dominio/api`.
   - Quita `androidScheme: 'http'` y `cleartext: true` de `capacitor.config.ts`, y
     `usesCleartextTraffic` de `AndroidManifest.xml`.
3. **Versión.** En `android/app/build.gradle`:
   - `versionCode` es un número entero que **debe subir en cada envío** (1, 2, 3…).
   - `versionName` es la versión que ve la gente (`1.0.0`).
4. **Borrar la cuenta (obligatorio).** Si la app permite crear cuentas, Google exige dos cosas:
   - un botón para **eliminar la cuenta desde la app**;
   - una **página web** donde pedir el borrado sin tener la app instalada.

   *El botón ya existe (Perfil → al fondo → "Eliminar mi cuenta", escribiendo "borrar cuenta y datos"). Falta
   la página web: puede ser una sección en fundacionsenderoazul.org con un formulario o un correo
   de contacto para pedir el borrado.*
5. **Contenido creado por usuarios.** Google revisa que la Comunidad tenga normas visibles,
   moderación y una forma de **reportar publicaciones**. TEO + TEA ya tiene las tres.

### Firmar la app (keystore)

Google Play no acepta APK de depuración. Necesitas una **llave de subida** (upload key):

```bash
keytool -genkeypair -v -keystore teotea-upload.jks -alias teotea \
  -keyalg RSA -keysize 2048 -validity 10000
```

- Guarda el archivo `.jks` y sus contraseñas **fuera del repositorio**, con copia de seguridad.
  Si se pierde, hay que pedir a Google que la reemplace.
- Activa **Play App Signing** (viene por defecto). Google guarda la llave final y tú solo usas la
  de subida.
- Crea `android/keystore.properties` (y agrégalo al `.gitignore`) con la ruta y las contraseñas.
  Después, en `build.gradle`, crea un `signingConfig` para `release` que lea ese archivo.

### Generar el paquete para la tienda (AAB)

Play Store pide **Android App Bundle (`.aab`)**, no `.apk`:

```bash
npm run build && npx cap sync android
cd android && ./gradlew bundleRelease
# Resultado: android/app/build/outputs/bundle/release/app-release.aab
```

Requisito de nivel de API: desde el 31 de agosto de 2026, las apps nuevas y las actualizaciones
deben apuntar a **Android 16 (API 36)**. TEO + TEA ya usa `targetSdkVersion = 36`.

---

## 4. Crear la cuenta y la ficha en Play Console

1. Entra a <https://play.google.com/console> con la cuenta de Google de la fundación. Elige el
   tipo de cuenta, paga los USD 25 y completa la verificación de identidad (documento y teléfono).
2. **Crear app:** nombre "TEO + TEA", idioma Español (Latinoamérica), *App*, *Gratis*.
3. **Ficha de Play Store:**

   | Elemento | Requisito | Dato |
   |---|---|---|
   | Nombre | Máx. 30 caracteres | TEO + TEA |
   | Descripción breve | Máx. 80 caracteres | Ver sección 7 |
   | Descripción completa | Máx. 4000 caracteres | Ver sección 7 |
   | Ícono | 512 × 512 px, PNG | Se saca de `assets/logos/LogoPrincipal.png` |
   | Imagen destacada | 1024 × 500 px | |
   | Capturas de teléfono | Mínimo 2, ideal 4–8 | Inicio, Biblioteca, Música, Comunidad, Logros |
   | Categoría | — | *Educación* o *Estilo de vida* |
   | Contacto | Correo de soporte de la fundación | |

---

## 5. Contenido de la app (formularios obligatorios)

En **Política → Contenido de la app**:

- **Política de privacidad:** la URL de la página que publiquen.
- **Anuncios:** No.
- **Acceso a la app:** como se necesita cuenta, da a Google una cuenta de prueba (correo y contraseña).
- **Seguridad de los datos.** Qué datos se recopilan y para qué:
  - Nombre, correo, nombre de usuario, fecha de nacimiento, país y ciudad: funcionamiento de la
    cuenta. Sin compartir con terceros.
  - Foto de perfil y publicaciones: contenido que la persona crea y que ven otras personas de la
    comunidad.
  - Progreso de lectura y logros: funcionamiento de la app.
  - La **música no sale del teléfono**: los archivos se reproducen localmente y no se recopilan.
  - Datos cifrados en tránsito: **sí** (cuando la API ya use HTTPS).
  - Se puede pedir el borrado de datos: **sí** (botón en la app + página web).
- **Clasificación de contenido:** cuestionario IARC. Marca que hay interacción entre usuarios
  (comunidad) y que no hay violencia ni compras.
- **Público objetivo:** se recomienda **13 años o más**. Si eliges menores de 13, aplica la política
  de Familias, que es mucho más estricta con la comunidad y los datos.
- **Servicio en primer plano:** la app usa `FOREGROUND_SERVICE_MEDIA_PLAYBACK` para la música en
  segundo plano. Play Console pide declarar para qué se usa y a veces un video corto que lo muestre:
  reproducir una canción, bloquear la pantalla y ver los controles en la notificación.
- **Aplicaciones gubernamentales / salud / finanzas:** No.

---

## 6. Pruebas y publicación

1. **Prueba interna** (opcional, inmediata): hasta 100 testers por correo, sin revisión larga.
   Sirve para probar el `.aab` firmado en celulares reales.
2. **Prueba cerrada.** *Obligatoria con cuenta personal*: 12 testers o más, inscritos **14 días
   seguidos**, que de verdad abran y usen la app. Con cuenta de organización es opcional.
3. **Producción.** Sube el `.aab`, escribe las notas de la versión ("Novedades") y envía a
   revisión. La primera revisión suele tardar **de unos días a una semana**.
4. **Actualizaciones.**
   - Sube el `versionCode`, genera un nuevo `.aab` y crea una versión nueva en Producción.
   - Si solo cambia la web (React), también hay que recompilar: el código va dentro de la app.

### Distribuir el APK fuera de la tienda

Google está obligando a que todas las apps instalables en Android certificado estén registradas
por un **desarrollador verificado**, aunque se instalen por APK:

- Empezó el 30 de septiembre de 2026 en algunos países (Brasil, Indonesia, Singapur y Tailandia).
- Se extiende al resto del mundo en 2027.

Publicar en Play Store (con la cuenta verificada) resuelve esto. Para pruebas propias, instalar con
`adb` sigue permitido.

---

## 7. Textos para la ficha de la tienda

**Descripción breve (80 caracteres máx.):**

> Comunidad, lectura, música y recursos para personas con TEA y sus familias.

**Descripción completa:**

> **TEO + TEA** es la app de la Fundación Sendero Azul, un espacio seguro y tranquilo para
> personas dentro del espectro autista (TEA), sus familias y quienes quieren acompañarlas.
> Está pensada con colores suaves, textos claros y botones grandes para usarla a tu ritmo.
>
> **Qué puedes hacer:**
>
> - **Comunidad:** comparte ideas, logros y preguntas con otras personas. Hay normas claras y un
>   equipo de moderación que cuida el espacio.
> - **Biblioteca:** lee libros clásicos gratuitos del Proyecto Gutenberg dentro de la app. Tu
>   progreso se guarda para seguir donde te quedaste.
> - **Música:** escucha tus propias canciones desde tu teléfono, con limitador de volumen,
>   transiciones suaves, listas de reproducción y modo aleatorio. Sigue sonando con la pantalla
>   bloqueada, y tus archivos nunca salen de tu celular.
> - **Trabajo:** portales de empleo inclusivo, guía para crear tu perfil de LinkedIn y una frase
>   motivadora para cada día.
> - **Tus derechos:** leyes laborales y de protección al ciudadano de Ecuador, Colombia, Perú y
>   Venezuela, con enlaces a las fuentes oficiales.
> - **Logros:** gana experiencia y sube hasta el nivel 100 mientras lees, escuchas y participas.
> - **Tu perfil:** foto, biografía, habilidades y gustos. Elige con qué sección se abre la app y
>   activa el modo oscuro si te resulta más cómodo.
> - **Apps recomendadas:** ajedrez, idiomas, dibujo y cursos gratuitos para seguir aprendiendo.
>
> TEO + TEA es gratuita, sin anuncios. Conoce más sobre la Fundación Sendero Azul en
> fundacionsenderoazul.org.

---

## 8. Lista rápida antes de enviar

- [ ] Cuenta de Play Console creada y verificada (USD 25).
- [ ] `appId` / `applicationId` definitivo.
- [ ] API en servidor con HTTPS. Sin `cleartext` en la app.
- [x] Botón "Eliminar mi cuenta" en la app.
- [ ] Página web para pedir el borrado de la cuenta.
- [x] Normas, moderación y reportes en la Comunidad (ya están).
- [ ] Política de privacidad publicada.
- [ ] Keystore creado, respaldado y fuera de git.
- [ ] `.aab` firmado (`bundleRelease`), con el `versionCode` subido.
- [ ] Ficha: ícono 512, imagen 1024×500, 2 o más capturas, textos.
- [ ] Formularios: seguridad de datos, clasificación, público, servicio en primer plano.
- [ ] Prueba cerrada (12 testers × 14 días) si la cuenta es personal.
