import { useEffect, type ReactElement } from 'react';
import { Navigate, Route, useLocation } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { homeOutline, peopleOutline, personCircleOutline } from 'ionicons/icons';
import AuthPage from './pages/AuthPage';
import LibraryPage from './pages/LibraryPage';
import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import Tab3 from './pages/Tab3';
import { useAuthStore, useIsLoggedIn } from './store/useAuthStore';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const RequireAuth: React.FC<{ children: ReactElement }> = ({ children }) => {
  const isLoggedIn = useIsLoggedIn();
  return isLoggedIn ? children : <Navigate to="/bienvenida" replace />;
};

const GuestOnly: React.FC<{ children: ReactElement }> = ({ children }) => {
  const isLoggedIn = useIsLoggedIn();
  return isLoggedIn ? <Navigate to="/inicio" replace /> : children;
};

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();
  const isLoggedIn = useIsLoggedIn();
  const showTabBar =
    isLoggedIn &&
    (['/inicio', '/comunidad', '/perfil'].includes(pathname) || pathname.startsWith('/biblioteca'));

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route path="/bienvenida" element={<GuestOnly><AuthPage mode="welcome" /></GuestOnly>} />
        <Route path="/registro" element={<GuestOnly><AuthPage mode="register" /></GuestOnly>} />
        <Route path="/iniciar-sesion" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
        <Route path="/inicio" element={<RequireAuth><Tab1 /></RequireAuth>} />
        <Route path="/comunidad" element={<RequireAuth><Tab2 /></RequireAuth>} />
        <Route path="/perfil" element={<RequireAuth><Tab3 /></RequireAuth>} />
        <Route path="/biblioteca/:articleId" element={<RequireAuth><LibraryPage /></RequireAuth>} />
        <Route path="/biblioteca" element={<RequireAuth><LibraryPage /></RequireAuth>} />
        <Route
          path="/"
          element={<Navigate to={isLoggedIn ? '/inicio' : '/bienvenida'} replace />}
        />
      </IonRouterOutlet>
      {showTabBar && (
        <IonTabBar slot="bottom">
          <IonTabButton tab="inicio" href="/inicio">
            <IonIcon aria-hidden="true" icon={homeOutline} />
            <IonLabel>Inicio</IonLabel>
          </IonTabButton>
          <IonTabButton tab="comunidad" href="/comunidad">
            <IonIcon aria-hidden="true" icon={peopleOutline} />
            <IonLabel>Comunidad</IonLabel>
          </IonTabButton>
          <IonTabButton tab="perfil" href="/perfil">
            <IonIcon aria-hidden="true" icon={personCircleOutline} />
            <IonLabel>Perfil</IonLabel>
          </IonTabButton>
        </IonTabBar>
      )}
    </IonTabs>
  );
};

const App: React.FC = () => {
  const seedDemoUser = useAuthStore((state) => state.seedDemoUser);

  useEffect(() => {
    void seedDemoUser();
  }, [seedDemoUser]);

  return (
    <IonApp>
      <IonReactRouter>
        <AppRoutes />
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
