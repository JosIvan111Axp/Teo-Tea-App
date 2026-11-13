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

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();
  const showTabBar = ['/inicio', '/comunidad', '/perfil'].includes(pathname) ||
    pathname.startsWith('/biblioteca');

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route path="/bienvenida" element={<AuthPage mode="welcome" />} />
        <Route path="/registro" element={<AuthPage mode="register" />} />
        <Route path="/iniciar-sesion" element={<AuthPage mode="login" />} />
        <Route path="/inicio" element={<Tab1 />} />
        <Route path="/comunidad" element={<Tab2 />} />
        <Route path="/perfil" element={<Tab3 />} />
        <Route path="/biblioteca/:articleId" element={<LibraryPage />} />
        <Route path="/biblioteca" element={<LibraryPage />} />
        <Route path="/" element={<Navigate to="/bienvenida" replace />} />
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

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <AppRoutes />
    </IonReactRouter>
  </IonApp>
);

export default App;
