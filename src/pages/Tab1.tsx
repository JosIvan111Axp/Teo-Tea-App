import { useState } from 'react';
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { ExternalLinkButton } from '../components/ExternalLink';
import { useThemeStore } from '../store/useThemeStore';
import type { FoundationLink } from '../data/mockData';
import {
  globeOutline,
  heartOutline,
  informationCircleOutline,
  logoFacebook,
  logoInstagram,
  logoTiktok,
  logoWhatsapp,
  logoYoutube,
  moonOutline,
  sunnyOutline,
  libraryOutline,
  briefcaseOutline,
  chevronForwardOutline,
  peopleOutline,
  scaleOutline,
} from 'ionicons/icons';
import senderoAzulLogo from '../../assets/SenderoAzul Logo.png';
import welcomeBanner from '../../assets/TeoyTeaBienvenido.png';
import { mockData } from '../data/mockData';
import { useCurrentUser } from '../store/useAuthStore';
import { getGreeting } from '../utils/helpers';
import './Tab1.css';

const quickLinks = [
  {
    title: 'Biblioteca',
    description: 'Lee gratis clásicos de dominio público, a tu ritmo.',
    icon: libraryOutline,
    path: '/biblioteca',
  },
  {
    title: 'Comunidad',
    description: 'Conoce experiencias y conecta con otras personas.',
    icon: peopleOutline,
    path: '/comunidad',
  },
  {
    title: 'Trabajo',
    description: 'Explora oportunidades y entornos laborales inclusivos.',
    icon: briefcaseOutline,
    path: '/trabajo',
  },
  {
    title: 'Leyes y Derechos',
    description: 'Encuentra orientación sobre derechos y apoyos.',
    icon: scaleOutline,
    path: '/derechos',
  },
  {
    title: 'Información',
    description: 'Información clara sobre el TEA y la neurodiversidad.',
    icon: informationCircleOutline,
    path: '/informacion',
  },
];

const LINK_ICONS: Record<FoundationLink['kind'], string> = {
  web: globeOutline,
  whatsapp: logoWhatsapp,
  facebook: logoFacebook,
  instagram: logoInstagram,
  tiktok: logoTiktok,
  youtube: logoYoutube,
  donar: heartOutline,
};

const Tab1: React.FC = () => {
  const themeMode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggle);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [pendingSection, setPendingSection] = useState('');
  const user = useCurrentUser();
  const { foundation } = mockData;
  const firstName = user?.name.split(' ')[0] ?? '';

  const filteredLinks = quickLinks.filter((link) =>
    `${link.title} ${link.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  const openSection = (section: string) => {
    const link = quickLinks.find((item) => item.title === section);
    if (link?.path) {
      navigate(link.path);
      return;
    }

    setPendingSection(section);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Inicio</IonTitle>
          <IonButtons slot="end">
            <IonButton
              className="theme-toggle-button"
              aria-label={themeMode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              onClick={toggleTheme}
            >
              <IonIcon slot="icon-only" icon={themeMode === 'dark' ? sunnyOutline : moonOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="home-content" fullscreen>
        <main className="home-layout">
          <section className="home-intro" aria-labelledby="home-greeting">
            <p className="home-eyebrow">Tu espacio para explorar y conectar</p>
            <h1 id="home-greeting">
              {getGreeting()}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p>Un paso a la vez. Encuentra lo que necesitas, a tu ritmo.</p>
          </section>

          <IonSearchbar
            className="home-search"
            placeholder="Buscar temas y espacios"
            aria-label="Buscar temas y espacios"
            value={query}
            onIonInput={(event) => setQuery(event.detail.value ?? '')}
          />

          <IonCard className="welcome-card">
            <img
              src={welcomeBanner}
              alt="Ilustración de bienvenida de TEO + TEA: explora, aprende y conecta"
            />
            <IonCardContent>
              <h2>Bienvenido a TEO + TEA</h2>
              <p>Un espacio inclusivo para aprender, compartir y descubrir oportunidades.</p>
            </IonCardContent>
          </IonCard>


          <section className="foundation-card" aria-labelledby="foundation-title">
            <div className="foundation-header">
              <img className="foundation-logo" src={senderoAzulLogo} alt="Logo de Fundación Sendero Azul" />
              <div>
                <p className="foundation-eyebrow">Quiénes nos acompañan</p>
                <h2 id="foundation-title">{foundation.name}</h2>
                <p className="foundation-tagline">{foundation.tagline}</p>
              </div>
            </div>
            <p className="foundation-description">{foundation.description}</p>
            <ul className="foundation-pillars">
              {foundation.pillars.map((pillar) => (
                <li key={pillar.title}>
                  <span className="foundation-pillar-icon">
                    <IonIcon aria-hidden="true" icon={pillar.icon} />
                  </span>
                  <span>
                    <strong>{pillar.title}</strong>
                    <span>{pillar.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <IonCard className="weekly-quote">
            <IonCardContent>
              <p className="quote-label">Una idea para esta semana</p>
              <blockquote>
                “Cada persona tiene su propio ritmo. Avanzar a tu manera también es avanzar.”
              </blockquote>
            </IonCardContent>
          </IonCard>

          <section className="quick-access" aria-labelledby="quick-access-title">
            <div className="quick-access-heading">
              <h2 id="quick-access-title">Explora TEO + TEA</h2>
              <p>Elige por dónde quieres empezar.</p>
            </div>
            {filteredLinks.length > 0 ? (
              <div className="quick-link-grid">
                {filteredLinks.map((link) => (
                  <IonCard
                    key={link.title}
                    className="quick-link-card"
                    button
                    onClick={() => openSection(link.title)}
                  >
                    <IonCardContent>
                      <span className="quick-link-icon">
                        <IonIcon aria-hidden="true" icon={link.icon} />
                      </span>
                      <span className="quick-link-copy">
                        <strong>{link.title}</strong>
                        <span>{link.description}</span>
                      </span>
                      <IonIcon
                        className="quick-link-arrow"
                        aria-hidden="true"
                        icon={chevronForwardOutline}
                      />
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            ) : (
              <p className="search-empty" role="status">
                No encontramos secciones que coincidan con “{query}”.
              </p>
            )}
          </section>

          <section className="foundation-mini" aria-labelledby="foundation-mini-title">
            <div className="foundation-mini-head">
              <img src={senderoAzulLogo} alt="" aria-hidden="true" />
              <div>
                <h2 id="foundation-mini-title">Conoce a la Fundación Sendero Azul</h2>
                <p>TEO + TEA es un espacio de la fundación.</p>
              </div>
            </div>
            <p className="foundation-mini-mission">
              <strong>Su misión:</strong> {foundation.mission}
            </p>
            <div className="foundation-links">
              {foundation.links.map((link) => (
                <ExternalLinkButton
                  key={link.kind}
                  url={link.url}
                  label={`${link.label} de la Fundación Sendero Azul`}
                  className={`foundation-link foundation-link-${link.kind}`}
                >
                  <IonIcon icon={LINK_ICONS[link.kind]} aria-hidden="true" />
                  {link.label}
                </ExternalLinkButton>
              ))}
            </div>
          </section>
        </main>
        <IonAlert
          isOpen={Boolean(pendingSection)}
          header={pendingSection}
          message={`La sección ${pendingSection} estará disponible próximamente.`}
          buttons={['Entendido']}
          onDidDismiss={() => setPendingSection('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
