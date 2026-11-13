import { useState, type FormEvent } from 'react';
import {
  IonButton,
  IonCard,
  IonContent,
  IonIcon,
  IonInput,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonText,
} from '@ionic/react';
import {
  accessibilityOutline,
  helpCircleOutline,
  heartOutline,
  peopleOutline,
  personOutline,
  businessOutline,
} from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import senderoAzulLogo from '../../assets/SenderoAzul Logo.png';
import welcomeBanner from '../../assets/TeoyTeaBienvenido.png';
import './AuthPage.css';

type AuthMode = 'welcome' | 'register' | 'login';

type AuthPageProps = {
  mode: AuthMode;
};

const identities = [
  { label: 'Persona TEA', icon: accessibilityOutline },
  { label: 'Otra discapacidad', icon: heartOutline },
  { label: 'Familia de persona con TEA', icon: peopleOutline },
  { label: 'Persona neurotípica', icon: personOutline },
  { label: 'Empleador', icon: businessOutline },
  { label: 'Sin diagnóstico', icon: helpCircleOutline },
];

const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const [registrationStep, setRegistrationStep] = useState(1);
  const [identity, setIdentity] = useState('');
  const [identityError, setIdentityError] = useState('');

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegistrationStep(2);
  };

  const submitRegistration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identity) {
      setIdentityError('Selecciona una opción para continuar.');
      return;
    }

    navigate('/inicio');
  };

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate('/inicio');
  };

  return (
    <IonPage>
      <IonContent className="auth-content" fullscreen>
        <main className="auth-shell">
          {mode === 'welcome' && (
            <section className="auth-panel" aria-labelledby="welcome-title">
              <img className="auth-logo" src={senderoAzulLogo} alt="Fundación Sendero Azul" />
              <p className="auth-eyebrow">Un espacio de Fundación Sendero Azul</p>
              <h1 id="welcome-title">TEO + TEA</h1>
              <p className="auth-intro">Explora, aprende y conecta a tu manera.</p>
              <img
                className="welcome-banner"
                src={welcomeBanner}
                alt="Personas compartiendo y aprendiendo en TEO + TEA"
              />
              <div className="auth-actions">
                <IonButton expand="block" onClick={() => navigate('/registro')}>
                  Registrarse
                </IonButton>
                <IonButton expand="block" fill="outline" onClick={() => navigate('/iniciar-sesion')}>
                  Iniciar sesión
                </IonButton>
              </div>
              <IonText color="medium">
                <p className="prototype-note">
                  Prototipo de demostración: no se envían datos a un servidor.
                </p>
              </IonText>
            </section>
          )}

          {mode === 'register' && (
            <section className="auth-panel" aria-labelledby="register-title">
              <button className="auth-back" type="button" onClick={() => navigate('/bienvenida')}>
                Volver a bienvenida
              </button>
              <p className="auth-eyebrow">Paso {registrationStep} de 2</p>
              <h1 id="register-title">
                {registrationStep === 1 ? 'Crea tu perfil' : '¿Cómo te identificas?'}
              </h1>
              <p className="auth-intro">
                {registrationStep === 1
                  ? 'Cuéntanos un poco sobre ti. Puedes completar tus datos con calma.'
                  : 'Elige la opción que mejor te represente. No hay respuestas incorrectas.'}
              </p>

              {registrationStep === 1 ? (
                <form className="auth-form" onSubmit={submitProfile}>
                  <IonInput
                    label="Nombre"
                    labelPlacement="stacked"
                    fill="outline"
                    autocomplete="name"
                    required
                  />
                  <IonInput
                    label="Nombre de usuario"
                    labelPlacement="stacked"
                    fill="outline"
                    autocomplete="username"
                    required
                  />
                  <IonSelect
                    label="País"
                    labelPlacement="stacked"
                    fill="outline"
                    interface="popover"
                    placeholder="Selecciona tu país"
                    required
                  >
                    <IonSelectOption value="argentina">Argentina</IonSelectOption>
                    <IonSelectOption value="chile">Chile</IonSelectOption>
                    <IonSelectOption value="colombia">Colombia</IonSelectOption>
                    <IonSelectOption value="espana">España</IonSelectOption>
                    <IonSelectOption value="mexico">México</IonSelectOption>
                    <IonSelectOption value="otro">Otro</IonSelectOption>
                  </IonSelect>
                  <IonInput
                    label="Ciudad"
                    labelPlacement="stacked"
                    fill="outline"
                    autocomplete="address-level2"
                    required
                  />
                  <IonInput
                    label="Fecha de nacimiento"
                    labelPlacement="stacked"
                    fill="outline"
                    type="date"
                    autocomplete="bday"
                    required
                  />
                  <IonButton expand="block" type="submit">
                    Continuar
                  </IonButton>
                </form>
              ) : (
                <form className="auth-form" onSubmit={submitRegistration}>
                  <div className="identity-grid" role="group" aria-label="Opciones de identidad">
                    {identities.map((option) => (
                      <button
                        key={option.label}
                        className={`identity-option${identity === option.label ? ' selected' : ''}`}
                        type="button"
                        aria-pressed={identity === option.label}
                        onClick={() => {
                          setIdentity(option.label);
                          setIdentityError('');
                        }}
                      >
                        <IonIcon aria-hidden="true" icon={option.icon} />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                  {identityError && (
                    <IonNote color="danger" role="alert">
                      {identityError}
                    </IonNote>
                  )}
                  <IonButton expand="block" type="submit">
                    Crear perfil
                  </IonButton>
                  <IonButton
                    expand="block"
                    fill="clear"
                    type="button"
                    onClick={() => setRegistrationStep(1)}
                  >
                    Volver a mis datos
                  </IonButton>
                </form>
              )}
            </section>
          )}

          {mode === 'login' && (
            <section className="auth-panel" aria-labelledby="login-title">
              <button className="auth-back" type="button" onClick={() => navigate('/bienvenida')}>
                Volver a bienvenida
              </button>
              <img className="auth-logo auth-logo-small" src={senderoAzulLogo} alt="" />
              <p className="auth-eyebrow">Qué bueno tenerte de vuelta</p>
              <h1 id="login-title">Iniciar sesión</h1>
              <p className="auth-intro">Ingresa tus datos para continuar.</p>
              <form className="auth-form" onSubmit={submitLogin}>
                <IonInput
                  label="Correo electrónico"
                  labelPlacement="stacked"
                  fill="outline"
                  type="email"
                  autocomplete="email"
                  required
                />
                <IonInput
                  label="Contraseña"
                  labelPlacement="stacked"
                  fill="outline"
                  type="password"
                  autocomplete="current-password"
                  required
                />
                <IonButton expand="block" type="submit">
                  Iniciar sesión
                </IonButton>
              </form>
              <IonCard className="prototype-card">
                <p>Este prototipo simula el acceso. No se validan ni almacenan credenciales.</p>
              </IonCard>
            </section>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default AuthPage;
