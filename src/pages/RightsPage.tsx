import { useState } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { briefcaseOutline, callOutline, documentTextOutline, shieldCheckmarkOutline, warningOutline } from 'ionicons/icons';
import {
  AREAS,
  COUNTRIES,
  REVIEWED_AT,
  countryFromProfile,
  rights,
  type CountryCode,
  type RightsArea,
} from '../data/rights';
import { useCurrentUser } from '../store/useAuthStore';
import './RightsPage.css';

const RightsPage: React.FC = () => {
  const user = useCurrentUser();
  const [area, setArea] = useState<RightsArea>('laboral');
  // Por defecto se muestra el país del perfil si está disponible.
  const [country, setCountry] = useState<CountryCode>(() => countryFromProfile(user?.country) ?? 'ecuador');

  const content = rights[area][country];
  const areaInfo = AREAS.find((a) => a.code === area)!;
  const countryLabel = COUNTRIES.find((c) => c.code === country)!.label;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/inicio" text="" />
          </IonButtons>
          <IonTitle>Leyes y Derechos</IonTitle>
        </IonToolbar>
        <IonToolbar className="toolbar-light rights-segment-toolbar">
          <IonSegment value={area} onIonChange={(e) => setArea((e.detail.value as RightsArea) ?? 'laboral')}>
            <IonSegmentButton value="laboral">
              <IonIcon icon={briefcaseOutline} aria-hidden="true" />
              <IonLabel>Laborales</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="ciudadano">
              <IonIcon icon={shieldCheckmarkOutline} aria-hidden="true" />
              <IonLabel>Protección al ciudadano</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="rights-content">
        <main className="rights-layout">
          <p className="rights-area-description">{areaInfo.description}</p>

          <div className="rights-countries" role="tablist" aria-label="País">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                role="tab"
                aria-selected={country === c.code}
                className={`rights-country${country === c.code ? ' is-selected' : ''}`}
                onClick={() => setCountry(c.code)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <section aria-labelledby="rights-country-title" className="rights-panel">
            <h1 id="rights-country-title">
              {areaInfo.label} · {countryLabel}
            </h1>
            <p className="rights-intro">{content.intro}</p>

            <ul className="law-list">
              {content.laws.map((law) => (
                <li key={law.name} className="law-card">
                  <div className="law-heading">
                    <span className="law-icon" aria-hidden="true">
                      <IonIcon icon={documentTextOutline} />
                    </span>
                    <div>
                      <h2>{law.name}</h2>
                      {law.tag && <span className="law-tag">{law.tag}</span>}
                    </div>
                  </div>
                  <p className="law-summary">{law.summary}</p>
                  <ul className="law-points">
                    {law.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            <section className="help-card" aria-labelledby="help-title">
              <h2 id="help-title">
                <IonIcon icon={callOutline} aria-hidden="true" /> ¿A dónde acudir en {countryLabel}?
              </h2>
              <ul>
                {content.help.map((item) => (
                  <li key={item.name}>
                    <strong>{item.name}</strong>
                    <span>{item.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          </section>

          <aside className="rights-disclaimer">
            <IonIcon icon={warningOutline} aria-hidden="true" />
            <p>
              Este es un resumen informativo y no reemplaza la asesoría legal. Las leyes cambian: confirma la versión
              vigente en la fuente oficial o con la Defensoría del Pueblo de tu país. Revisado en {REVIEWED_AT}.
            </p>
          </aside>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default RightsPage;
