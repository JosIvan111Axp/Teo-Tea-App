import { useEffect } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { musicalNotesOutline, pause, play, playSkipForward } from 'ionicons/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMusicStore } from '../store/useMusicStore';
import '../pages/MusicPage.css';

/** Reproductor compacto sobre la barra de pestañas: la música sigue al navegar por la app. */
const MiniPlayer: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tracks = useMusicStore((s) => s.tracks);
  const currentId = useMusicStore((s) => s.currentId);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const position = useMusicStore((s) => s.position);
  const duration = useMusicStore((s) => s.duration);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);

  const current = tracks.find((t) => t.id === currentId);
  // No se muestra en la pantalla de Música (ya tiene el reproductor grande), en el lector ni sin sesión.
  const hiddenHere = pathname === '/musica' || pathname.startsWith('/leer') || ['/bienvenida', '/registro', '/iniciar-sesion'].includes(pathname);
  const visible = Boolean(current) && !hiddenHere;

  useEffect(() => {
    document.body.classList.toggle('has-mini-player', visible);
    return () => document.body.classList.remove('has-mini-player');
  }, [visible]);

  if (!visible || !current) return null;

  return (
    <div className="mini-player" role="region" aria-label="Reproductor de música">
      <button type="button" className="mini-player-open" onClick={() => navigate('/musica')} aria-label="Abrir Música">
        <IonIcon icon={musicalNotesOutline} aria-hidden="true" />
        <span className="mini-player-copy">
          <strong>{current.title}</strong>
          <span>{current.artist || 'Artista desconocido'}</span>
        </span>
      </button>
      <IonButton fill="clear" aria-label={isPlaying ? 'Pausar' : 'Reproducir'} onClick={() => void togglePlay()}>
        <IonIcon slot="icon-only" icon={isPlaying ? pause : play} />
      </IonButton>
      <IonButton fill="clear" aria-label="Siguiente canción" onClick={() => void next()}>
        <IonIcon slot="icon-only" icon={playSkipForward} />
      </IonButton>
      <div className="mini-player-progress" aria-hidden="true">
        <span style={{ width: `${duration ? (position / duration) * 100 : 0}%` }} />
      </div>
    </div>
  );
};

export default MiniPlayer;
