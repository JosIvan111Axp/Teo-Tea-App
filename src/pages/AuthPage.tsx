import { useEffect, useState, type FormEvent } from 'react';
import {
  IonButton,
  IonCard,
  IonContent,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
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
import welcomeBanner from '../../assets/BienvenidoArreglado.png';
import { DEMO_EMAIL, DEMO_PASSWORD, useAuthStore } from '../store/useAuthStore';
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

const countries = ['Argentina', 'Chile', 'Colombia', 'Ecuador', 'España', 'México', 'Perú', 'Otro'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

const emptyForm = {
  name: '',
  username: '',
  email: '',
  password: '',
  country: '',
  city: '',
  birthdate: '',
};

const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const login = useAuthStore((state) => state.login);

  const [registrationStep, setRegistrationStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [identity, setIdentity] = useState('');
  const [formError, setFormError] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Limpia mensajes al cambiar de pantalla.
  useEffect(() => {
    setFormError('');
    setRegistrationStep(1);
  }, [mode]);

  const updateField = (field: keyof typeof emptyForm) => (value: string | null | undefined) => {
    setForm((current) => ({ ...current, [field]: value ?? '' }));
    setFormError('');
  };

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const missing = Object.entries(form).find(([, value]) => !String(value).trim());
    if (missing) {
      setFormError('Completa todos los campos para continuar.');
      return;
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      setFormError('Escribe un correo electrónico válido.');
      return;
    }
    if (form.password.length < MIN_PASSWORD) {
      setFormError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (new Date(form.birthdate) > new Date()) {
      setFormError('La fecha de nacimiento no puede ser futura.');
      return;
    }
    setFormError('');
    setRegistrationStep(2);
  };

  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identity) {
      setFormError('Selecciona una opción para continuar.');
      return;
    }

    setIsSubmitting(true);
    const result = await register({ ...form, role: identity });
    setIsSubmitting(false);

    if (!result.ok) {
      setFormError(result.error);
      setRegistrationStep(1);
      return;
    }

    setForm(emptyForm);
    setIdentity('');
    // La redirección a /inicio la hace el guardia de rutas al detectar la sesión.
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setFormError('Escribe tu correo y tu contraseña.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setLoginPassword('');
    // La redirección a /inicio la hace el guardia de rutas al detectar la sesión.
  };

  const errorNote = formError && (
    <IonNote className="auth-error" color="danger" role="alert">
      {formError}
    </IonNote>
  );

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
                <IonButton
                  expand="block"
                  fill="outline"
                  color="secondary"
                  onClick={() => navigate('/iniciar-sesion')}
                >
                  Iniciar sesión
                </IonButton>
              </div>
              <IonText color="medium">
                <p className="prototype-note">
                  Prototipo: las cuentas se guardan solo en este navegador.
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
                <form className="auth-form" onSubmit={submitProfile} noValidate>
                  <IonInput
                    label="Nombre"
                    labelPlacement="stacked"
                    fill="outline"
                    autocomplete="name"
                    value={form.name}
                    onIonInput={(e) => updateField('name')(e.detail.value)}
                    required
                  />
                  <IonInput
                    label="Nombre de usuario"
                    labelPlacement="stacked"
                    fill="outline"
                    autocomplete="username"
                    placeholder="ej. alex.teo"
                    value={form.username}
                    onIonInput={(e) => updateField('username')(e.detail.value)}
                    required
                  />
                  <IonInput
                    label="Correo electrónico"
                    labelPlacement="stacked"
                    fill="outline"
                    type="email"
                    autocomplete="email"
                    value={form.email}
                    onIonInput={(e) => updateField('email')(e.detail.value)}
                    required
                  />
                  <IonInput
                    label="Contraseña"
                    labelPlacement="stacked"
                    fill="outline"
                    type="password"
                    autocomplete="new-password"
                    helperText={`Mínimo ${MIN_PASSWORD} caracteres`}
                    value={form.password}
                    onIonInput={(e) => updateField('password')(e.detail.value)}
                    required
                  >
                    <IonInputPasswordToggle slot="end" />
                  </IonInput>
                  <IonSelect
                    label="País"
                    labelPlacement="stacked"
                    fill="outline"
                    interface="popover"
                    placeholder="Selecciona tu país"
                    value={form.country}
                    onIonChange={(e) => updateField('country')(e.detail.value)}
                  >
                    {countries.map((country) => (
                      <IonSelectOption key={country} value={country}>
                        {country}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                  <IonInput
                    label="Ciudad"
                    labelPlacement="stacked"
                    fill="outline"
                    autocomplete="address-level2"
                    value={form.city}
                    onIonInput={(e) => updateField('city')(e.detail.value)}
                    required
                  />
                  <IonInput
                    label="Fecha de nacimiento"
                    labelPlacement="stacked"
                    fill="outline"
                    type="date"
                    autocomplete="bday"
                    value={form.birthdate}
                    onIonInput={(e) => updateField('birthdate')(e.detail.value)}
                    required
                  />
                  {errorNote}
                  <IonButton expand="block" type="submit">
                    Continuar
                  </IonButton>
                  <p className="auth-switch">
                    ¿Ya tienes cuenta?{' '}
                    <button type="button" onClick={() => navigate('/iniciar-sesion')}>
                      Inicia sesión
                    </button>
                  </p>
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
                          setFormError('');
                        }}
                      >
                        <IonIcon aria-hidden="true" icon={option.icon} />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                  {errorNote}
                  <IonButton expand="block" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <IonSpinner name="dots" /> : 'Crear perfil'}
                  </IonButton>
                  <IonButton
                    expand="block"
                    fill="clear"
                    type="button"
                    onClick={() => {
                      setFormError('');
                      setRegistrationStep(1);
                    }}
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
              <form className="auth-form" onSubmit={submitLogin} noValidate>
                <IonInput
                  label="Correo electrónico"
                  labelPlacement="stacked"
                  fill="outline"
                  type="email"
                  autocomplete="email"
                  value={loginEmail}
                  onIonInput={(e) => {
                    setLoginEmail(e.detail.value ?? '');
                    setFormError('');
                  }}
                  required
                />
                <IonInput
                  label="Contraseña"
                  labelPlacement="stacked"
                  fill="outline"
                  type="password"
                  autocomplete="current-password"
                  value={loginPassword}
                  onIonInput={(e) => {
                    setLoginPassword(e.detail.value ?? '');
                    setFormError('');
                  }}
                  required
                >
                  <IonInputPasswordToggle slot="end" />
                </IonInput>
                {errorNote}
                <IonButton expand="block" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <IonSpinner name="dots" /> : 'Iniciar sesión'}
                </IonButton>
                <p className="auth-switch">
                  ¿Aún no tienes cuenta?{' '}
                  <button type="button" onClick={() => navigate('/registro')}>
                    Regístrate
                  </button>
                </p>
              </form>
              <IonCard className="prototype-card">
                <p>
                  Cuenta de prueba: <strong>{DEMO_EMAIL}</strong> / <strong>{DEMO_PASSWORD}</strong>
                </p>
                <IonButton
                  size="small"
                  fill="outline"
                  color="secondary"
                  onClick={() => {
                    setLoginEmail(DEMO_EMAIL);
                    setLoginPassword(DEMO_PASSWORD);
                    setFormError('');
                  }}
                >
                  Usar cuenta de prueba
                </IonButton>
              </IonCard>
            </section>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default AuthPage;
