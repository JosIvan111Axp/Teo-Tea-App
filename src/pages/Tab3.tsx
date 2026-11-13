import {
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  briefcaseOutline,
  checkmarkCircleOutline,
  heartOutline,
  locationOutline,
} from 'ionicons/icons';
import { mockData } from '../data/mockData';
import './Tab3.css';

const Tab3: React.FC = () => {
  const { profile } = mockData;
  const initials = profile.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="profile-content" fullscreen>
        <main className="profile-layout">
          <IonCard className="profile-hero">
            <IonCardContent>
              <div className="profile-avatar" role="img" aria-label={`Iniciales de ${profile.name}`}>
                {initials}
              </div>
              <h1>{profile.name}</h1>
              <p className="profile-username">{profile.username}</p>
              <div className="profile-meta">
                <span>
                  <IonIcon aria-hidden="true" icon={briefcaseOutline} />
                  {profile.profession}
                </span>
                <span>
                  <IonIcon aria-hidden="true" icon={locationOutline} />
                  {profile.city}, {profile.country}
                </span>
              </div>
              <div className="profile-tags">
                <IonChip color="primary">
                  <IonLabel>{profile.role}</IonLabel>
                </IonChip>
                <IonChip>
                  <IonLabel>{profile.age} años</IonLabel>
                </IonChip>
              </div>
            </IonCardContent>
          </IonCard>

          <section aria-labelledby="profile-bio-title">
            <IonCard className="profile-section">
              <IonCardContent>
                <h2 id="profile-bio-title">Biografía</h2>
                <p>{profile.bio}</p>
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
                <div className="profile-chip-list">
                  {profile.skills.map((skill) => (
                    <IonChip key={skill}>
                      <IonLabel>{skill}</IonLabel>
                    </IonChip>
                  ))}
                </div>
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
                <div className="profile-chip-list">
                  {profile.interests.map((interest) => (
                    <IonChip key={interest}>
                      <IonLabel>{interest}</IonLabel>
                    </IonChip>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Tab3;
