import { useState } from 'react';
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonReorder,
  IonReorderGroup,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { addOutline, createOutline, play, removeCircleOutline, shuffle, trashOutline } from 'ionicons/icons';
import type { Playlist, TrackMeta } from '../music/musicDb';
import { formatTime, useMusicStore } from '../store/useMusicStore';
import '../pages/MusicPage.css';

type Props = { playlist: Playlist | null; onClose: () => void };

/** Ver y editar una playlist: renombrar, reordenar, quitar/agregar canciones, reproducir. */
const PlaylistModal: React.FC<Props> = ({ playlist, onClose }) => {
  const tracks = useMusicStore((s) => s.tracks);
  const live = useMusicStore((s) => s.playlists.find((p) => p.id === playlist?.id) ?? null);
  const playSource = useMusicStore((s) => s.playSource);
  const playTrack = useMusicStore((s) => s.playTrack);
  const renamePlaylist = useMusicStore((s) => s.renamePlaylist);
  const setPlaylistTracks = useMusicStore((s) => s.setPlaylistTracks);
  const removePlaylist = useMusicStore((s) => s.removePlaylist);

  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const current = live ?? playlist;
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const items = (current?.trackIds ?? []).map((id) => byId.get(id)).filter(Boolean) as TrackMeta[];
  const available = tracks.filter((t) => !current?.trackIds.includes(t.id));
  const source = current ? ({ type: 'playlist', id: current.id } as const) : null;

  return (
    <IonModal isOpen={Boolean(playlist)} onDidDismiss={onClose} className="playlist-modal">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>Cerrar</IonButton>
          </IonButtons>
          <IonTitle>{current?.name}</IonTitle>
          <IonButtons slot="end">
            <IonButton aria-label="Cambiar nombre" onClick={() => setRenaming(true)}>
              <IonIcon slot="icon-only" icon={createOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="playlist-content">
        {current && !picking && (
          <>
            <div className="playlist-actions">
              <IonButton disabled={!items.length} onClick={() => source && void playSource(source, { shuffle: false })}>
                <IonIcon slot="start" icon={play} aria-hidden="true" />
                Reproducir
              </IonButton>
              <IonButton
                fill="outline"
                disabled={!items.length}
                onClick={() => source && void playSource(source, { shuffle: true })}
              >
                <IonIcon slot="start" icon={shuffle} aria-hidden="true" />
                Aleatorio
              </IonButton>
            </div>

            <p className="music-help playlist-help">
              {items.length
                ? 'Mantén presionado ≡ y arrastra para cambiar el orden.'
                : 'Esta playlist está vacía. Agrega canciones para empezar.'}
            </p>

            <IonList className="playlist-list" lines="full">
              <IonReorderGroup
                disabled={items.length < 2}
                onIonItemReorder={(e) => {
                  const ids = [...current.trackIds];
                  const [moved] = ids.splice(e.detail.from, 1);
                  ids.splice(e.detail.to, 0, moved);
                  e.detail.complete(false);
                  void setPlaylistTracks(current.id, ids);
                }}
              >
                {items.map((t) => (
                  <IonItem key={t.id}>
                    <IonButton
                      slot="start"
                      fill="clear"
                      aria-label={`Reproducir ${t.title}`}
                      onClick={() => source && void playTrack(t.id, source)}
                    >
                      <IonIcon slot="icon-only" icon={play} />
                    </IonButton>
                    <IonLabel>
                      <h3>{t.title}</h3>
                      <p>
                        {t.artist || 'Artista desconocido'} · {formatTime(t.duration)}
                      </p>
                    </IonLabel>
                    <IonButton
                      slot="end"
                      fill="clear"
                      color="medium"
                      aria-label={`Quitar ${t.title} de la playlist`}
                      onClick={() => void setPlaylistTracks(current.id, current.trackIds.filter((id) => id !== t.id))}
                    >
                      <IonIcon slot="icon-only" icon={removeCircleOutline} />
                    </IonButton>
                    <IonReorder slot="end" />
                  </IonItem>
                ))}
              </IonReorderGroup>
            </IonList>

            <IonButton
              expand="block"
              fill="outline"
              disabled={!available.length}
              onClick={() => {
                setSelected([]);
                setPicking(true);
              }}
            >
              <IonIcon slot="start" icon={addOutline} aria-hidden="true" />
              {available.length ? 'Agregar canciones' : 'Ya están todas tus canciones'}
            </IonButton>
            <IonButton expand="block" fill="clear" color="danger" onClick={() => setConfirmDelete(true)}>
              <IonIcon slot="start" icon={trashOutline} aria-hidden="true" />
              Eliminar playlist
            </IonButton>
          </>
        )}

        {current && picking && (
          <>
            <p className="music-help playlist-help">Elige las canciones que quieres agregar:</p>
            <IonList lines="full">
              {available.map((t) => (
                <IonItem key={t.id}>
                  <IonCheckbox
                    checked={selected.includes(t.id)}
                    justify="space-between"
                    onIonChange={(e) =>
                      setSelected((prev) => (e.detail.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)))
                    }
                  >
                    <span className="pick-title">{t.title}</span>
                    <span className="pick-artist">{t.artist || 'Artista desconocido'}</span>
                  </IonCheckbox>
                </IonItem>
              ))}
            </IonList>
            <div className="playlist-actions">
              <IonButton fill="clear" onClick={() => setPicking(false)}>
                Cancelar
              </IonButton>
              <IonButton
                disabled={!selected.length}
                onClick={async () => {
                  // Se agregan en el orden de la lista de canciones.
                  const ordered = available.map((t) => t.id).filter((id) => selected.includes(id));
                  await setPlaylistTracks(current.id, [...current.trackIds, ...ordered]);
                  setPicking(false);
                }}
              >
                Agregar {selected.length || ''}
              </IonButton>
            </div>
          </>
        )}
      </IonContent>

      <IonAlert
        isOpen={renaming}
        header="Nombre de la playlist"
        inputs={[{ name: 'name', type: 'text', value: current?.name ?? '', attributes: { maxlength: 60 } }]}
        buttons={[
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Guardar',
            handler: (values: { name: string }) => {
              if (!values.name.trim()) return false;
              if (current) void renamePlaylist(current.id, values.name);
              return true;
            },
          },
        ]}
        onDidDismiss={() => setRenaming(false)}
      />
      <IonAlert
        isOpen={confirmDelete}
        header="¿Eliminar playlist?"
        message="Las canciones no se borran: siguen en Mis canciones."
        buttons={[
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Eliminar',
            role: 'destructive',
            handler: () => {
              if (current) void removePlaylist(current.id);
              onClose();
            },
          },
        ]}
        onDidDismiss={() => setConfirmDelete(false)}
      />
    </IonModal>
  );
};

export default PlaylistModal;
