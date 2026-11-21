import { useState } from 'react';
import {
  IonAccordion,
  IonAccordionGroup,
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  briefcaseOutline,
  bulbOutline,
  logoLinkedin,
  openOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { ExternalLinkButton } from '../components/ExternalLink';
import { COUNTRIES, countryFromProfile, type CountryCode } from '../data/rights';
import { useCurrentUser } from '../store/useAuthStore';
import './WorkPage.css';

/* Frases para empezar el día con ánimo (cambia cada día). */
const QUOTES = [
  'Tu forma de ver el mundo es un talento: el trabajo correcto sabrá valorarlo.',
  'Cada postulación es un paso. No tienes que llegar hoy, solo seguir avanzando a tu ritmo.',
  'Lo que te hace diferente también es lo que te hace valioso.',
  'Pedir apoyos no es una debilidad: es saber cómo trabajas mejor.',
  'Un "no" hoy no define tu camino. Aprende, ajusta y vuelve a intentarlo.',
];
const todayQuote = QUOTES[Math.floor(Date.now() / 86_400_000) % QUOTES.length];

type JobSite = {
  name: string;
  url: string;
  description: string;
  scope: 'todos' | CountryCode;
  inclusive?: boolean;
};

const JOB_SITES: JobSite[] = [
  {
    name: 'Incluyeme.com',
    url: 'https://www.incluyeme.com',
    description: 'Portal latinoamericano de empleo para personas con discapacidad, con empresas comprometidas con la inclusión.',
    scope: 'todos',
    inclusive: true,
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/jobs/',
    description: 'La red profesional más usada: perfil, contactos y ofertas de empleo en todo el mundo.',
    scope: 'todos',
  },
  {
    name: 'Computrabajo',
    url: 'https://www.computrabajo.com',
    description: 'Uno de los portales de empleo más grandes de Latinoamérica, con secciones por país.',
    scope: 'todos',
  },
  {
    name: 'Indeed',
    url: 'https://www.indeed.com',
    description: 'Buscador que reúne ofertas de muchos sitios de empleo.',
    scope: 'todos',
  },
  {
    name: 'Encuentra Empleo',
    url: 'https://encuentraempleo.trabajo.gob.ec',
    description: 'Bolsa de empleo pública del Ministerio del Trabajo de Ecuador.',
    scope: 'ecuador',
  },
  {
    name: 'Multitrabajos',
    url: 'https://www.multitrabajos.com',
    description: 'Portal de empleo privado muy usado en Ecuador.',
    scope: 'ecuador',
  },
  {
    name: 'Servicio Público de Empleo',
    url: 'https://www.serviciodeempleo.gov.co',
    description: 'Red pública de empleo de Colombia, con orientación y ofertas gratuitas.',
    scope: 'colombia',
  },
  {
    name: 'elempleo.com',
    url: 'https://www.elempleo.com',
    description: 'Portal de empleo privado de Colombia.',
    scope: 'colombia',
  },
  {
    name: 'Bumeran Perú',
    url: 'https://www.bumeran.com.pe',
    description: 'Portal de empleo privado con ofertas en Perú.',
    scope: 'peru',
  },
];

const LINKEDIN_STEPS = [
  {
    title: '1. Crea tu cuenta',
    text: 'Entra a linkedin.com o descarga la app y regístrate con tu correo. Usa tu nombre real: así las empresas te encuentran.',
  },
  {
    title: '2. Foto y titular',
    text: 'Usa una foto clara de tu rostro con fondo simple. En el titular escribe qué haces o qué buscas, por ejemplo: "Diseñadora gráfica | Ilustración y organización visual".',
  },
  {
    title: '3. Sección "Acerca de"',
    text: 'Cuenta en 3 o 4 frases quién eres, qué sabes hacer y qué tipo de trabajo te interesa. Escribe con tus palabras; no necesitas sonar "perfecto".',
  },
  {
    title: '4. Experiencia y educación',
    text: 'Agrega trabajos, prácticas, voluntariados y cursos. Los proyectos personales también cuentan: describe qué hiciste y qué lograste.',
  },
  {
    title: '5. Aptitudes',
    text: 'Agrega tus habilidades (por ejemplo: atención al detalle, Excel, dibujo digital). Puedes pedir a otras personas que las validen.',
  },
  {
    title: '6. Indica que buscas empleo',
    text: 'En tu perfil activa "Disponible para trabajar" (Open to Work) y elige los puestos y lugares que te interesan. Puedes hacerlo visible solo para reclutadores.',
  },
  {
    title: '7. Busca y postula',
    text: 'En la pestaña "Empleos" escribe el puesto y usa los filtros (ubicación, remoto, nivel). "Solicitud sencilla" te permite postular con tu perfil en pocos pasos.',
  },
  {
    title: '8. Conecta con calma',
    text: 'Conecta con compañeros, profesores y personas del área que te interesa. Un mensaje corto y amable es suficiente; no hay prisa.',
  },
];

const TIPS = [
  'Tú decides si quieres contar tu diagnóstico, cuándo y a quién. No es obligatorio.',
  'Puedes pedir ajustes razonables en la entrevista: preguntas por escrito, más tiempo o una entrevista en línea.',
  'Antes de la entrevista, prepara respuestas sobre tus fortalezas con ejemplos concretos.',
  'Revisa la sección Leyes y Derechos para conocer las cuotas de inclusión de tu país.',
];

const WorkPage: React.FC = () => {
  const user = useCurrentUser();
  const [country, setCountry] = useState<CountryCode | 'todos'>(() => countryFromProfile(user?.country) ?? 'todos');
  const sites = JOB_SITES.filter((site) => site.scope === 'todos' || country === 'todos' || site.scope === country);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/inicio" text="" />
          </IonButtons>
          <IonTitle>Trabajo</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="work-content">
        <main className="work-layout">
          <section className="work-quote" aria-label="Frase motivacional">
            <IonIcon icon={sparklesOutline} aria-hidden="true" />
            <blockquote>“{todayQuote}”</blockquote>
          </section>

          <section aria-labelledby="work-sites-title">
            <div className="work-heading">
              <IonIcon icon={briefcaseOutline} aria-hidden="true" />
              <h1 id="work-sites-title">Portales de empleo</h1>
            </div>
            <div className="work-countries" role="radiogroup" aria-label="País">
              {[{ code: 'todos' as const, label: 'Todos' }, ...COUNTRIES].map((c) => (
                <button
                  key={c.code}
                  type="button"
                  role="radio"
                  aria-checked={country === c.code}
                  className={`work-country${country === c.code ? ' is-selected' : ''}`}
                  onClick={() => setCountry(c.code)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <ul className="work-sites">
              {sites.map((site) => (
                <li key={site.name}>
                  <ExternalLinkButton url={site.url} label={site.name} className="work-site">
                    <span className="work-site-copy">
                      <strong>
                        {site.name}
                        {site.inclusive && <span className="work-badge">Empleo inclusivo</span>}
                      </strong>
                      <span>{site.description}</span>
                    </span>
                    <IonIcon icon={openOutline} aria-hidden="true" />
                  </ExternalLinkButton>
                </li>
              ))}
            </ul>
            {country === 'venezuela' && (
              <p className="work-note">
                Para Venezuela, los portales regionales (LinkedIn, Computrabajo, Indeed) también publican ofertas locales.
              </p>
            )}
          </section>

          <section aria-labelledby="linkedin-title" className="linkedin-card">
            <div className="work-heading">
              <IonIcon icon={logoLinkedin} aria-hidden="true" className="linkedin-icon" />
              <h2 id="linkedin-title">Tutorial: tu perfil de LinkedIn paso a paso</h2>
            </div>
            <p className="work-help">Toca cada paso para ver el detalle. Puedes avanzar uno por día.</p>
            <IonAccordionGroup>
              {LINKEDIN_STEPS.map((step) => (
                <IonAccordion key={step.title} value={step.title}>
                  <IonItem slot="header" lines="full">
                    <IonLabel className="ion-text-wrap">{step.title}</IonLabel>
                  </IonItem>
                  <div className="linkedin-step" slot="content">
                    {step.text}
                  </div>
                </IonAccordion>
              ))}
            </IonAccordionGroup>
            <ExternalLinkButton
              url="https://www.linkedin.com/help/linkedin"
              label="Centro de ayuda de LinkedIn"
              className="work-link"
            >
              Ver el centro de ayuda oficial de LinkedIn <IonIcon icon={openOutline} aria-hidden="true" />
            </ExternalLinkButton>
          </section>

          <section aria-labelledby="tips-title" className="tips-card">
            <div className="work-heading">
              <IonIcon icon={bulbOutline} aria-hidden="true" />
              <h2 id="tips-title">Consejos para tu búsqueda</h2>
            </div>
            <ul>
              {TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default WorkPage;
