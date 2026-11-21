import { useEffect, useRef, useState } from 'react';
import {
  IonActionSheet,
  IonAlert,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonRange,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToggle,
  IonToolbar,
} from '@ionic/react';
import {
  addCircleOutline,
  albumsOutline,
  chevronForwardOutline,
  listOutline,
  earOutline,
  musicalNotesOutline,
  pause,
  phonePortraitOutline,
  play,
  playSkipBack,
  playSkipForward,
  repeat,
  shuffle,
  trashOutline,
  volumeHighOutline,
  volumeLowOutline,
} from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { storageEstimate, type Playlist } from '../music/musicDb';
import PlaylistModal from '../components/PlaylistModal';
import { useCurrentUser } from '../store/useAuthStore';
import { SMOOTH_LEVELS, formatBytes, formatTime, useMusicStore } from '../store/useMusicStore';
import { track } from '../store/useAchievementsStore';
import ProfileButton from '../components/ProfileButton';
import './MusicPage.css';

const FADE_OPTIONS = [1, 2, 4];

const MusicPage: React.FC = () => {
  const user = useCurrentUser();
  const {
    tracks,
    loaded,
    currentId,
    isPlaying,
    position,
    duration,
    importing,
    error,
    settings,
    loadFor,
    importFiles,
    remove,
    playTrack,
    togglePlay,
    next,
    previous,
    seek,
    updateSettings,
    playlists,
    source,
    toggleShuffle,
    playSource,
    createPlaylist,
    addToPlaylist,
  } = useMusicStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [storage, setStorage] = useState<{ used: number; quota: number } | null>(null);
  const [seeking, setSeeking] = useState<number | null>(null);
  const [addTarget, setAddTarget] = useState<string | null>(null);
  /** Nombre de la playlist nueva: null = cerrado; '' = sin canción; id = crear con esa canción. */
  const [newPlaylistFor, setNewPlaylistFor] = useState<string | null>(null);
  const [openPlaylist, setOpenPlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    if (user) void loadFor(user.id);
    void track('visit', 'musica');
  }, [user, loadFor]);

  useEffect(() => {
    void storageEstimate().then(setStorage);
  }, [tracks.length]);

  const current = tracks.find((t) => t.id === currentId) ?? null;
  const shownPosition = seeking ?? position;
  const effectivePercent = Math.round(settings.volume * settings.maxVolume * 100);
  const sourceLabel =
    source.type === 'playlist' ? playlists.find((p) => p.id === source.id)?.name ?? 'Playlist' : 'Todas las canciones';

  const handleImport = async (files: FileList | null) => {
    if (!files?.length) return;
    const { added, skipped } = await importFiles(files);
    if (added) void track('songs_imported', undefined, added);
    if (fileInput.current) fileInput.current.value = '';
    if (skipped.length) {
      setToast({
        message: `${added} canción(es) agregada(s). No se pudieron agregar: ${skipped.join('; ')}`,
        color: added ? 'warning' : 'danger',
      });
    } else if (added) {
      setToast({ message: `${added} canción(es) agregada(s) a tu música.`, color: 'secondary' });
    }
  };

  const cycleRepeat = () =>
    updateSettings({ repeat: settings.repeat === 'off' ? 'all' : settings.repeat === 'all' ? 'one' : 'off' });
  const repeatLabel = { off: 'Repetir: no', all: 'Repetir: todas', one: 'Repetir: esta canción' }[settings.repeat];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Música</IonTitle>
          <ProfileButton />
        </IonToolbar>
      </IonHeader>
      <IonContent className="music-content">
        <main className="music-layout">
          <p className="music-privacy">
            <IonIcon icon={phonePortraitOutline} aria-hidden="true" />
            Tus canciones se guardan <strong>solo en este dispositivo</strong>. No se suben a internet ni las ve nadie más.
          </p>

          {/* --------------------------- Reproduciendo --------------------------- */}
          <section className="now-playing" aria-label="Reproductor">
            <div className="np-art" aria-hidden="true">
              <IonIcon icon={musicalNotesOutline} />
            </div>
            <div className="np-info">
              <strong>{current?.title ?? 'Elige una canción'}</strong>
              <span>{current ? current.artist || 'Artista desconocido' : 'Importa tus canciones para empezar'}</span>
              {current && (
                <span className="np-source">
                  {settings.shuffle ? 'Aleatorio · ' : ''}
                  {sourceLabel}
                </span>
              )}
            </div>
            <IonRange
              className="np-seek"
              aria-label="Posición de la canción"
              min={0}
              max={Math.max(1, Math.floor(duration))}
              step={1}
              value={Math.floor(shownPosition)}
              disabled={!current}
              onIonInput={(e) => setSeeking(Number(e.detail.value))}
              onIonChange={(e) => {
                seek(Number(e.detail.value));
                setSeeking(null);
              }}
            />
            <div className="np-times" aria-hidden="true">
              <span>{formatTime(shownPosition)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="np-controls">
              <IonButton
                fill="clear"
                className={settings.shuffle ? 'is-active' : ''}
                aria-label={settings.shuffle ? 'Aleatorio activado' : 'Aleatorio desactivado'}
                aria-pressed={settings.shuffle}
                onClick={toggleShuffle}
              >
                <IonIcon slot="icon-only" icon={shuffle} />
              </IonButton>
              <IonButton fill="clear" aria-label="Anterior" disabled={!tracks.length} onClick={() => void previous()}>
                <IonIcon slot="icon-only" icon={playSkipBack} />
              </IonButton>
              <IonButton
                className="np-play"
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                disabled={!tracks.length}
                onClick={() => void togglePlay()}
              >
                <IonIcon slot="icon-only" icon={isPlaying ? pause : play} />
              </IonButton>
              <IonButton fill="clear" aria-label="Siguiente" disabled={!tracks.length} onClick={() => void next()}>
                <IonIcon slot="icon-only" icon={playSkipForward} />
              </IonButton>
              <IonButton
                fill="clear"
                className={settings.repeat !== 'off' ? 'is-active' : ''}
                aria-label={repeatLabel}
                onClick={cycleRepeat}
              >
                <IonIcon slot="icon-only" icon={repeat} />
                {settings.repeat === 'one' && <span className="repeat-one">1</span>}
              </IonButton>
            </div>
            <div className="np-volume">
              <IonIcon icon={volumeLowOutline} aria-hidden="true" />
              <IonRange
                aria-label="Volumen"
                min={0}
                max={100}
                step={1}
                value={Math.round(settings.volume * 100)}
                onIonInput={(e) => updateSettings({ volume: Number(e.detail.value) / 100 })}
              />
              <IonIcon icon={volumeHighOutline} aria-hidden="true" />
            </div>
            <p className="np-volume-note">
              Volumen real: {effectivePercent}% (límite {Math.round(settings.maxVolume * 100)}%)
            </p>
            {error && (
              <p className="music-error" role="alert">
                {error}
              </p>
            )}
          </section>

          {/* --------------------------- Reproducción --------------------------- */}
          <section className="music-card" aria-labelledby="playback-title">
            <h2 id="playback-title">
              <IonIcon icon={phonePortraitOutline} aria-hidden="true" /> Reproducción
            </h2>
            <IonToggle
              className="music-toggle"
              checked={settings.backgroundPlay}
              justify="space-between"
              onIonChange={(e) => updateSettings({ backgroundPlay: e.detail.checked })}
            >
              Música en segundo plano
            </IonToggle>
            <p className="music-help">
              {settings.backgroundPlay
                ? 'La música sigue sonando si cambias a otra app.'
                : 'La música se pausa al cambiar a otra app.'}
            </p>
            <IonToggle
              className="music-toggle"
              checked={settings.screenOffPlay}
              justify="space-between"
              onIonChange={(e) => updateSettings({ screenOffPlay: e.detail.checked })}
            >
              Música con la pantalla apagada
            </IonToggle>
            <p className="music-help">
              {settings.screenOffPlay
                ? 'La música sigue sonando aunque bloquees o apagues la pantalla.'
                : 'La música se pausa al bloquear o apagar la pantalla.'}
            </p>
            <IonToggle
              className="music-toggle"
              checked={settings.keepScreenOn}
              justify="space-between"
              onIonChange={(e) => updateSettings({ keepScreenOn: e.detail.checked })}
            >
              Mantener la pantalla encendida
            </IonToggle>
            <p className="music-help">
              {settings.keepScreenOn
                ? 'Mientras suena música la pantalla no se apaga sola (usa más batería).'
                : 'La pantalla se apaga sola como siempre, aunque suene música.'}
            </p>
            {!Capacitor.isNativePlatform() && (
              <p className="music-note">
                En el navegador, cambiar de app y bloquear la pantalla se ven igual: si desactivas cualquiera de los
                dos, la música se pausa en ambos casos. En la app Android se distinguen.
              </p>
            )}
          </section>

          {/* --------------------------- Cuidado auditivo --------------------------- */}
          <section className="music-card" aria-labelledby="hearing-title">
            <h2 id="hearing-title">
              <IonIcon icon={earOutline} aria-hidden="true" /> Cuidado auditivo
            </h2>
            <label className="music-setting-label" htmlFor="max-volume">
              Limitador de volumen: <strong>{Math.round(settings.maxVolume * 100)}%</strong>
            </label>
            <p className="music-help">El volumen nunca superará este límite, aunque subas el control al máximo.</p>
            <IonRange
              id="max-volume"
              aria-label="Volumen máximo"
              min={20}
              max={100}
              step={5}
              snaps
              value={Math.round(settings.maxVolume * 100)}
              onIonInput={(e) => updateSettings({ maxVolume: Number(e.detail.value) / 100 })}
            />

            <IonToggle
              className="music-toggle"
              checked={settings.smoothPeaks}
              justify="space-between"
              onIonChange={(e) => updateSettings({ smoothPeaks: e.detail.checked })}
            >
              Suavizar sonidos fuertes
            </IonToggle>
            <p className="music-help">Reduce los golpes de volumen repentinos dentro de una canción.</p>
            {settings.smoothPeaks && (
              <div className="smooth-strength">
                <label className="music-setting-label" htmlFor="smooth-strength">
                  Potencia del suavizado: <strong>{SMOOTH_LEVELS[settings.smoothStrength - 1].label}</strong>
                </label>
                <IonRange
                  id="smooth-strength"
                  aria-label="Potencia del suavizado"
                  min={1}
                  max={SMOOTH_LEVELS.length}
                  step={1}
                  snaps
                  ticks
                  value={settings.smoothStrength}
                  onIonInput={(e) => updateSettings({ smoothStrength: Number(e.detail.value) })}
                />
                <div className="range-labels" aria-hidden="true">
                  <span>Muy suave</span>
                  <span>Muy fuerte</span>
                </div>
                <p className="music-help">
                  Más potencia = los sonidos fuertes se igualan más con los suaves. Útil si hay sensibilidad auditiva.
                </p>
              </div>
            )}

            <IonToggle
              className="music-toggle"
              checked={settings.fade}
              justify="space-between"
              onIonChange={(e) => updateSettings({ fade: e.detail.checked })}
            >
              Transición suave
            </IonToggle>
            <p className="music-help">El sonido sube y baja poco a poco al empezar, pausar y cambiar de canción.</p>
            {settings.fade && (
              <div className="fade-options" role="radiogroup" aria-label="Duración de la transición">
                {FADE_OPTIONS.map((secs) => (
                  <button
                    key={secs}
                    type="button"
                    role="radio"
                    aria-checked={settings.fadeSeconds === secs}
                    className={`fade-option${settings.fadeSeconds === secs ? ' is-selected' : ''}`}
                    onClick={() => updateSettings({ fadeSeconds: secs })}
                  >
                    {secs} {secs === 1 ? 'segundo' : 'segundos'}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ------------------------------ Mis playlists ------------------------------ */}
          <section className="music-card" aria-labelledby="playlists-title">
            <div className="tracks-head">
              <h2 id="playlists-title">
                <IonIcon icon={albumsOutline} aria-hidden="true" /> Mis playlists <span>({playlists.length})</span>
              </h2>
              <IonButton fill="outline" disabled={!tracks.length} onClick={() => setNewPlaylistFor('')}>
                <IonIcon slot="start" icon={addCircleOutline} aria-hidden="true" />
                Nueva
              </IonButton>
            </div>
            {!playlists.length && (
              <p className="music-help">
                {tracks.length
                  ? 'Crea playlists para agrupar tus canciones: para relajarte, concentrarte o moverte.'
                  : 'Primero importa canciones; luego podrás crear playlists con ellas.'}
              </p>
            )}
            <ul className="playlist-rows">
              {playlists.map((p) => {
                const isActive = source.type === 'playlist' && source.id === p.id && Boolean(currentId);
                return (
                  <li key={p.id} className={isActive ? 'is-current' : ''}>
                    <button type="button" className="playlist-open" onClick={() => setOpenPlaylist(p)}>
                      <span className="playlist-cover" aria-hidden="true">
                        <IonIcon icon={albumsOutline} />
                      </span>
                      <span className="track-copy">
                        <strong>{p.name}</strong>
                        <span>
                          {p.trackIds.length} {p.trackIds.length === 1 ? 'canción' : 'canciones'}
                          {isActive ? ' · sonando' : ''}
                        </span>
                      </span>
                      <IonIcon icon={chevronForwardOutline} aria-hidden="true" className="playlist-chevron" />
                    </button>
                    <IonButton
                      fill="clear"
                      aria-label={`Reproducir ${p.name}`}
                      disabled={!p.trackIds.length}
                      onClick={() => void playSource({ type: 'playlist', id: p.id }, { shuffle: false })}
                    >
                      <IonIcon slot="icon-only" icon={play} />
                    </IonButton>
                    <IonButton
                      fill="clear"
                      aria-label={`Reproducir ${p.name} en orden aleatorio`}
                      disabled={!p.trackIds.length}
                      onClick={() => void playSource({ type: 'playlist', id: p.id }, { shuffle: true })}
                    >
                      <IonIcon slot="icon-only" icon={shuffle} />
                    </IonButton>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ------------------------------ Mis canciones ------------------------------ */}
          <section className="music-card" aria-labelledby="tracks-title">
            <div className="tracks-head">
              <h2 id="tracks-title">
                Mis canciones <span>({tracks.length})</span>
              </h2>
              <div className="tracks-head-actions">
              <IonButton
                fill="outline"
                disabled={!tracks.length}
                aria-label="Reproducir todas en orden aleatorio"
                onClick={() => void playSource({ type: 'all' }, { shuffle: true })}
              >
                <IonIcon slot="start" icon={shuffle} aria-hidden="true" />
                Aleatorio
              </IonButton>
              <IonButton disabled={importing} onClick={() => fileInput.current?.click()}>
                {importing ? (
                  <>
                    <IonSpinner name="dots" /> Importando
                  </>
                ) : (
                  <>
                    <IonIcon slot="start" icon={addCircleOutline} aria-hidden="true" />
                    Importar
                  </>
                )}
              </IonButton>
              </div>
            </div>
            <input
              ref={fileInput}
              className="visually-hidden"
              type="file"
              accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac"
              multiple
              aria-label="Elegir canciones del dispositivo"
              onChange={(e) => void handleImport(e.target.files)}
            />
            <p className="music-help">
              Elige archivos de música que ya tengas en tu celular (MP3, M4A, OGG, WAV…). Consejo: si el archivo se llama
              “Artista - Canción.mp3”, la app separa el artista y el título.
            </p>

            {!loaded && (
              <p className="music-empty" role="status">
                <IonSpinner name="dots" /> Cargando tu música...
              </p>
            )}
            {loaded && !tracks.length && (
              <div className="music-empty">
                <IonIcon icon={musicalNotesOutline} aria-hidden="true" />
                <p>Aún no tienes canciones. Toca “Importar” para agregar las tuyas.</p>
              </div>
            )}

            <ol className="track-list">
              {tracks.map((track, index) => {
                const isCurrent = track.id === currentId;
                return (
                  <li key={track.id} className={isCurrent ? 'is-current' : ''}>
                    <button
                      type="button"
                      className="track-main"
                      aria-label={`${isCurrent && isPlaying ? 'Pausar' : 'Reproducir'} ${track.title}`}
                      onClick={() => void (isCurrent ? togglePlay() : playTrack(track.id, { type: 'all' }))}
                    >
                      <span className="track-index" aria-hidden="true">
                        {isCurrent && isPlaying ? <IonIcon icon={pause} /> : isCurrent ? <IonIcon icon={play} /> : index + 1}
                      </span>
                      <span className="track-copy">
                        <strong>{track.title}</strong>
                        <span>
                          {track.artist || 'Artista desconocido'} · {formatTime(track.duration)}
                        </span>
                      </span>
                    </button>
                    <IonButton
                      fill="clear"
                      color="medium"
                      aria-label={`Agregar ${track.title} a una playlist`}
                      onClick={() => setAddTarget(track.id)}
                    >
                      <IonIcon slot="icon-only" icon={listOutline} />
                    </IonButton>
                    <IonButton
                      fill="clear"
                      color="medium"
                      aria-label={`Quitar ${track.title}`}
                      onClick={() => setConfirmDelete(track.id)}
                    >
                      <IonIcon slot="icon-only" icon={trashOutline} />
                    </IonButton>
                  </li>
                );
              })}
            </ol>

            {storage && (
              <p className="music-storage">
                Espacio usado por la app en este dispositivo: {formatBytes(storage.used)} de {formatBytes(storage.quota)}{' '}
                disponibles.
              </p>
            )}
          </section>
        </main>

        <IonAlert
          isOpen={Boolean(confirmDelete)}
          header="¿Quitar canción?"
          message="Se borrará solo de la app. El archivo original de tu celular no se toca."
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Quitar',
              role: 'destructive',
              handler: () => {
                if (confirmDelete) void remove(confirmDelete);
              },
            },
          ]}
          onDidDismiss={() => setConfirmDelete(null)}
        />

        <IonActionSheet
          isOpen={Boolean(addTarget)}
          header="Agregar a una playlist"
          buttons={[
            ...playlists.map((p) => ({
              text: p.trackIds.includes(addTarget ?? '') ? `${p.name} (ya está)` : p.name,
              handler: () => {
                const id = addTarget;
                if (!id || p.trackIds.includes(id)) return;
                void addToPlaylist(p.id, [id]).then(() =>
                  setToast({ message: `Agregada a “${p.name}”.`, color: 'secondary' }),
                );
              },
            })),
            { text: '+ Nueva playlist', handler: () => setNewPlaylistFor(addTarget ?? '') },
            { text: 'Cancelar', role: 'cancel' },
          ]}
          onDidDismiss={() => setAddTarget(null)}
        />

        <IonAlert
          isOpen={newPlaylistFor !== null}
          header="Nueva playlist"
          inputs={[{ name: 'name', type: 'text', placeholder: 'Ej.: Para relajarme', attributes: { maxlength: 60 } }]}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Crear',
              handler: (values: { name: string }) => {
                if (!values.name.trim()) return false;
                const withTrack = newPlaylistFor;
                void createPlaylist(values.name, withTrack ? [withTrack] : []).then((p) => {
                  if (!p) return;
                  setToast({ message: `Playlist “${p.name}” creada.`, color: 'secondary' });
                  if (!withTrack) setOpenPlaylist(p);
                });
                return true;
              },
            },
          ]}
          onDidDismiss={() => setNewPlaylistFor(null)}
        />

        <PlaylistModal playlist={openPlaylist} onClose={() => setOpenPlaylist(null)} />

        <IonToast
          isOpen={Boolean(toast)}
          message={toast?.message}
          color={toast?.color}
          duration={4000}
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default MusicPage;
