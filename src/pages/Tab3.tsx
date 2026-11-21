import { useState, type FormEvent } from 'react';
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonModal,
  IonNote,
  IonPage,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToast,
  IonToggle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  briefcaseOutline,
  checkmarkCircleOutline,
  createOutline,
  heartOutline,
  locationOutline,
  logOutOutline,
  shieldHalfOutline,
  homeOutline,
  libraryOutline,
  musicalNotesOutline,
  peopleOutline,
  trophyOutline,
  brushOutline,
  extensionPuzzleOutline,
  languageOutline,
  moonOutline,
  openOutline,
  rocketOutline,
  schoolOutline,
  sunnyOutline,
  mailOutline,
} from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore, useCurrentUser } from '../store/useAuthStore';
import { ACCOUNT_TYPE_LABELS } from '../api/staff';
import { ExternalLinkButton } from '../components/ExternalLink';
import { useThemeStore } from '../store/useThemeStore';
import { calculateAge, getInitials } from '../utils/helpers';
import chessComLogo from '../../assets/logos/chess-com.png';
import duolingoLogo from '../../assets/logos/duolingo.png';
import ibispaintLogo from '../../assets/logos/ibispaint.png';
import khanAcademyLogo from '../../assets/logos/khan-academy.png';
import lichessLogo from '../../assets/logos/lichess.png';
import { track, useAchievementsStore } from '../store/useAchievementsStore';
import LevelCard from '../components/LevelCard';
import type { StartPage } from '../data/mockData';
import './Tab3.css';

/** Apps recomendadas para aprender, conectar y ampliar habilidades. */
const RECOMMENDED_APPS = [
  {
    name: 'Chess.com',
    logo: chessComLogo,
    category: 'Ajedrez',
    description: 'Juega, resuelve problemas y aprende ajedrez con lecciones guiadas.',
    url: 'https://www.chess.com/es',
    icon: extensionPuzzleOutline,
    color: '#5d9948',
  },
  {
    name: 'Lichess',
    logo: lichessLogo,
    category: 'Ajedrez',
    description: 'Ajedrez gratuito, sin anuncios y de código abierto, con prácticas y estudios.',
    url: 'https://lichess.org',
    icon: extensionPuzzleOutline,
    color: '#4a4a4a',
  },
  {
    name: 'Khan Academy',
    logo: khanAcademyLogo,
    category: 'Aprendizaje',
    description: 'Cursos gratuitos de matemáticas, ciencias, programación y más, a tu ritmo.',
    url: 'https://es.khanacademy.org',
    icon: schoolOutline,
    color: '#14a585',
  },
  {
    name: 'ibisPaint X',
    logo: ibispaintLogo,
    category: 'Dibujo',
    description: 'App de dibujo digital para celular y tablet, con pinceles y capas.',
    url: 'https://ibispaint.com',
    icon: brushOutline,
    color: '#d94a8c',
  },
  {
    name: 'Duolingo',
    logo: duolingoLogo,
    category: 'Idiomas',
    description: 'Aprende idiomas con lecciones cortas y juegos diarios.',
    url: 'https://www.duolingo.com',
    icon: languageOutline,
    color: '#58a700',
  },
];

/** Opciones de "Al abrir la app, empezar en". */
const START_PAGES: { value: StartPage; label: string; icon: string }[] = [
  { value: 'inicio', label: 'Inicio', icon: homeOutline },
  { value: 'biblioteca', label: 'Biblioteca', icon: libraryOutline },
  { value: 'musica', label: 'Música', icon: musicalNotesOutline },
  { value: 'comunidad', label: 'Comunidad', icon: peopleOutline },
];

const toList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);

const Tab3: React.FC = () => {
  const navigate = useNavigate();
  const profile = useCurrentUser();
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const fetchPosts = useAppStore((state) => state.fetchPosts);
  const hasLoadedPosts = useAppStore((state) => state.hasLoaded);
  const postCount = useAppStore(
    (state) => state.posts.filter((post) => post.authorId === profile?.id).length,
  );
  const [isSaving, setIsSaving] = useState(false);

  useIonViewWillEnter(() => {
    void track('visit', 'perfil');
    void fetchAchievements();
    if (!hasLoadedPosts) void fetchPosts();
  });

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', profession: '', bio: '', skills: '', interests: '' });
  const [editError, setEditError] = useState('');
  const [toast, setToast] = useState('');
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const setStartPage = useAuthStore((state) => state.setStartPage);
  const iconStyle = useThemeStore((state) => state.iconStyle);
  const setIconStyle = useThemeStore((state) => state.setIconStyle);
  const achievements = useAchievementsStore((state) => state.summary);
  const fetchAchievements = useAchievementsStore((state) => state.fetchSummary);

  if (!profile) return null;

  const age = calculateAge(profile.birthdate);

  const openEditor = () => {
    setEditForm({
      name: profile.name,
      profession: profile.profession,
      bio: profile.bio,
      skills: profile.skills.join(', '),
      interests: profile.interests.join(', '),
    });
    setEditError('');
    setIsEditing(true);
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = editForm.name.trim();
    if (!name) {
      setEditError('El nombre no puede quedar vacío.');
      return;
    }
    setIsSaving(true);
    const result = await updateProfile({
      name,
      profession: editForm.profession.trim(),
      bio: editForm.bio.trim(),
      skills: toList(editForm.skills),
      interests: toList(editForm.interests),
    });
    setIsSaving(false);
    if (!result.ok) {
      setEditError(result.error);
      return;
    }
    // Las publicaciones muestran el nombre desde la base de datos: se recargan para reflejar el cambio.
    void fetchPosts();
    setIsEditing(false);
    setToast('Perfil actualizado.');
    void track('check');
  };

  const handleLogout = () => {
    logout();
    // La redirección a /bienvenida la hace el guardia de rutas al cerrar la sesión.
  };

  const field = (key: keyof typeof editForm) => (value: string | null | undefined) =>
    setEditForm((current) => ({ ...current, [key]: value ?? '' }));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Perfil</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setConfirmLogout(true)}>
              <IonIcon slot="start" icon={logOutOutline} aria-hidden="true" />
              Salir
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="profile-content" fullscreen>
        <main className="profile-layout">
          <IonCard className="profile-hero">
            <IonCardContent>
              <div className="profile-avatar" role="img" aria-label={`Iniciales de ${profile.name}`}>
                {getInitials(profile.name)}
              </div>
              <h1>{profile.name}</h1>
              <p className="profile-username">{profile.username}</p>
              <div className="profile-meta">
                {profile.profession && (
                  <span>
                    <IonIcon aria-hidden="true" icon={briefcaseOutline} />
                    {profile.profession}
                  </span>
                )}
                <span>
                  <IonIcon aria-hidden="true" icon={locationOutline} />
                  {profile.city}, {profile.country}
                </span>
                <span>
                  <IonIcon aria-hidden="true" icon={mailOutline} />
                  {profile.email}
                </span>
              </div>
              <div className="profile-tags">
                <IonChip color="primary">
                  <IonLabel>{profile.role}</IonLabel>
                </IonChip>
                {age !== null && (
                  <IonChip color="secondary">
                    <IonLabel>{age} años</IonLabel>
                  </IonChip>
                )}
                <IonChip color="secondary">
                  <IonLabel>
                    {postCount} {postCount === 1 ? 'publicación' : 'publicaciones'}
                  </IonLabel>
                </IonChip>
              </div>
              <IonButton className="profile-edit" fill="outline" color="secondary" onClick={openEditor}>
                <IonIcon slot="start" icon={createOutline} aria-hidden="true" />
                Editar perfil
              </IonButton>
              {(profile.accountType === 'moderator' || profile.accountType === 'admin') && (
                <div className="profile-staff">
                  <span className="profile-staff-label">
                    <IonIcon icon={shieldHalfOutline} aria-hidden="true" />
                    Cuenta de {ACCOUNT_TYPE_LABELS[profile.accountType].toLowerCase()}
                  </span>
                  <IonButton onClick={() => navigate('/equipo')}>
                    {profile.accountType === 'admin' ? 'Panel de administración' : 'Panel de moderación'}
                  </IonButton>
                </div>
              )}
            </IonCardContent>
          </IonCard>

          <section aria-labelledby="profile-achievements-title" className="profile-achievements">
            <div className="profile-achievements-head">
              <h2 id="profile-achievements-title">
                <IonIcon aria-hidden="true" icon={trophyOutline} /> Mis logros
              </h2>
              <IonButton fill="clear" size="small" onClick={() => navigate('/logros')}>
                Ver todos
              </IonButton>
            </div>
            {achievements ? (
              <button type="button" className="profile-level-link" onClick={() => navigate('/logros')}>
                <LevelCard summary={achievements} compact />
              </button>
            ) : (
              <p className="profile-empty">Cargando tu nivel...</p>
            )}
            {achievements && (
              <ul className="recent-achievements" aria-label="Logros recientes">
                {achievements.achievements
                  .filter((a) => a.unlocked)
                  .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))
                  .slice(0, 3)
                  .map((a) => (
                    <li key={a.id}>
                      <IonIcon icon={trophyOutline} aria-hidden="true" /> {a.name}
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="profile-bio-title">
            <IonCard className="profile-section">
              <IonCardContent>
                <h2 id="profile-bio-title">Biografía</h2>
                <p className={profile.bio ? '' : 'profile-empty'}>
                  {profile.bio || 'Aún no has escrito tu biografía. Cuéntale a la comunidad sobre ti.'}
                </p>
              </IonCardContent>
            </IonCard>
          </section>

          <section aria-labelledby="profile-skills-title">
            <IonCard className="profile-section">
              <IonCardContent>
                <div className="profile-section-heading">
                  <IonIcon aria-hidden="true" icon={checkmarkCircleOutline} />
                  <h2 id="profile-skills-title">Habilidades</h2>
                </div>
                {profile.skills.length > 0 ? (
                  <div className="profile-chip-list">
                    {profile.skills.map((skill) => (
                      <IonChip key={skill}>
                        <IonLabel>{skill}</IonLabel>
                      </IonChip>
                    ))}
                  </div>
                ) : (
                  <p className="profile-empty">Agrega tus habilidades desde “Editar perfil”.</p>
                )}
              </IonCardContent>
            </IonCard>
          </section>

          <section aria-labelledby="profile-interests-title">
            <IonCard className="profile-section">
              <IonCardContent>
                <div className="profile-section-heading">
                  <IonIcon aria-hidden="true" icon={heartOutline} />
                  <h2 id="profile-interests-title">Gustos</h2>
                </div>
                {profile.interests.length > 0 ? (
                  <div className="profile-chip-list">
                    {profile.interests.map((interest) => (
                      <IonChip key={interest}>
                        <IonLabel>{interest}</IonLabel>
                      </IonChip>
                    ))}
                  </div>
                ) : (
                  <p className="profile-empty">Agrega tus gustos desde “Editar perfil”.</p>
                )}
              </IonCardContent>
            </IonCard>
          </section>

          <section aria-labelledby="profile-apps-title">
            <IonCard className="profile-section">
              <IonCardContent>
                <div className="profile-section-heading">
                  <IonIcon aria-hidden="true" icon={rocketOutline} />
                  <h2 id="profile-apps-title">Apps recomendadas</h2>
                </div>
                <p className="profile-apps-intro">Para aprender, conectar y ampliar tus habilidades.</p>
                <ul className="app-list">
                  {RECOMMENDED_APPS.map((app) => (
                    <li key={app.name}>
                      <ExternalLinkButton
                        url={app.url}
                        label={app.name}
                        className="app-item"
                        onOpen={() => void track('app_open', app.name)}
                      >
                        <span className="site-logo" aria-hidden="true">
                          <img src={app.logo} alt="" />
                        </span>
                        <span className="app-copy">
                          <strong>{app.name}</strong>
                          <span className="app-category">{app.category}</span>
                          <span>{app.description}</span>
                        </span>
                        <IonIcon icon={openOutline} aria-hidden="true" className="app-open" />
                      </ExternalLinkButton>
                    </li>
                  ))}
                </ul>
              </IonCardContent>
            </IonCard>
          </section>

          <section aria-labelledby="profile-appearance-title">
            <IonCard className="profile-section">
              <IonCardContent>
                <div className="profile-section-heading">
                  <IonIcon aria-hidden="true" icon={themeMode === 'dark' ? moonOutline : sunnyOutline} />
                  <h2 id="profile-appearance-title">Apariencia</h2>
                </div>
                <IonToggle
                  className="theme-toggle"
                  checked={themeMode === 'dark'}
                  onIonChange={(e) => {
                    setThemeMode(e.detail.checked ? 'dark' : 'light');
                    if (e.detail.checked) void track('dark_mode');
                  }}
                  justify="space-between"
                >
                  Modo oscuro
                </IonToggle>
                <p className="profile-apps-intro">Se recuerda en este dispositivo.</p>

                <h3 className="start-page-title" id="icon-style-title">
                  Estilo de íconos del Inicio
                </h3>
                <div className="start-page-options" role="radiogroup" aria-labelledby="icon-style-title">
                  {(
                    [
                      { value: 'ilustrado', label: 'Ilustrado' },
                      { value: 'lineas', label: 'Líneas' },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={iconStyle === option.value}
                      className={`start-page-option${iconStyle === option.value ? ' is-selected' : ''}`}
                      onClick={() => setIconStyle(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <h3 className="start-page-title" id="start-page-title">
                  Al abrir la app, empezar en
                </h3>
                <p className="profile-apps-intro">Ve directo a lo que más usas cada vez que inicias sesión.</p>
                <div className="start-page-options" role="radiogroup" aria-labelledby="start-page-title">
                  {START_PAGES.map((option) => {
                    const selected = (profile.startPage ?? 'inicio') === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`start-page-option${selected ? ' is-selected' : ''}`}
                        onClick={async () => {
                          if (selected) return;
                          const result = await setStartPage(option.value);
                          if (result.ok) {
                            setToast(`La app se abrirá en ${option.label}.`);
                            void track('start_page_set');
                          }
                        }}
                      >
                        <IonIcon icon={option.icon} aria-hidden="true" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </IonCardContent>
            </IonCard>
          </section>

          <IonButton
            className="profile-logout"
            expand="block"
            fill="outline"
            color="danger"
            onClick={() => setConfirmLogout(true)}
          >
            <IonIcon slot="start" icon={logOutOutline} aria-hidden="true" />
            Cerrar sesión
          </IonButton>
        </main>

        <IonModal isOpen={isEditing} onDidDismiss={() => setIsEditing(false)}>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setIsEditing(false)}>Cancelar</IonButton>
              </IonButtons>
              <IonTitle>Editar perfil</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="profile-content">
            <form className="profile-edit-form" onSubmit={saveProfile}>
              <IonInput
                label="Nombre"
                labelPlacement="stacked"
                fill="outline"
                value={editForm.name}
                onIonInput={(e) => field('name')(e.detail.value)}
              />
              <IonInput
                label="Profesión u ocupación"
                labelPlacement="stacked"
                fill="outline"
                value={editForm.profession}
                onIonInput={(e) => field('profession')(e.detail.value)}
              />
              <IonTextarea
                label="Biografía"
                labelPlacement="stacked"
                fill="outline"
                autoGrow
                rows={3}
                maxlength={300}
                counter
                value={editForm.bio}
                onIonInput={(e) => field('bio')(e.detail.value)}
              />
              <IonInput
                label="Habilidades"
                labelPlacement="stacked"
                fill="outline"
                helperText="Sepáralas con comas. Ej: Dibujo, Programación"
                value={editForm.skills}
                onIonInput={(e) => field('skills')(e.detail.value)}
              />
              <IonInput
                label="Gustos"
                labelPlacement="stacked"
                fill="outline"
                helperText="Sepáralos con comas. Ej: Música, Naturaleza"
                value={editForm.interests}
                onIonInput={(e) => field('interests')(e.detail.value)}
              />
              {editError && (
                <IonNote color="danger" role="alert">
                  {editError}
                </IonNote>
              )}
              <IonButton expand="block" type="submit" disabled={isSaving}>
                {isSaving ? <IonSpinner name="dots" /> : 'Guardar cambios'}
              </IonButton>
            </form>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={confirmLogout}
          header="¿Cerrar sesión?"
          message="Podrás volver a entrar con tu correo y contraseña."
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Cerrar sesión', role: 'destructive', handler: handleLogout },
          ]}
          onDidDismiss={() => setConfirmLogout(false)}
        />

        <IonToast
          isOpen={Boolean(toast)}
          message={toast}
          duration={2000}
          color="secondary"
          onDidDismiss={() => setToast('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default Tab3;
