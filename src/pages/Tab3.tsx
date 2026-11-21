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
  IonTextarea,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import {
  briefcaseOutline,
  checkmarkCircleOutline,
  createOutline,
  heartOutline,
  locationOutline,
  logOutOutline,
  mailOutline,
} from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore, useCurrentUser } from '../store/useAuthStore';
import { calculateAge, getInitials } from '../utils/helpers';
import './Tab3.css';

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
  const syncAuthor = useAppStore((state) => state.syncAuthor);
  const postCount = useAppStore(
    (state) => state.posts.filter((post) => post.authorId === profile?.id).length,
  );

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', profession: '', bio: '', skills: '', interests: '' });
  const [editError, setEditError] = useState('');
  const [toast, setToast] = useState('');

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

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = editForm.name.trim();
    if (!name) {
      setEditError('El nombre no puede quedar vacío.');
      return;
    }
    updateProfile({
      name,
      profession: editForm.profession.trim(),
      bio: editForm.bio.trim(),
      skills: toList(editForm.skills),
      interests: toList(editForm.interests),
    });
    syncAuthor({ id: profile.id, name, role: profile.role });
    setIsEditing(false);
    setToast('Perfil actualizado.');
  };

  const handleLogout = () => {
    logout();
    navigate('/bienvenida', { replace: true });
  };

  const field = (key: keyof typeof editForm) => (value: string | null | undefined) =>
    setEditForm((current) => ({ ...current, [key]: value ?? '' }));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Perfil</IonTitle>
          <IonButtons slot="end">
            <IonButton color="primary" onClick={() => setConfirmLogout(true)}>
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
            </IonCardContent>
          </IonCard>

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
              <IonButton expand="block" type="submit">
                Guardar cambios
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
