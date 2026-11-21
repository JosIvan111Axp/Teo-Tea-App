import { Suspense, lazy, useEffect, type ReactElement } from 'react';
import { Navigate, Route, useLocation } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonSpinner,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { homeOutline, libraryOutline, peopleOutline, personCircleOutline } from 'ionicons/icons';
import AuthPage from './pages/AuthPage';
import BooksPage from './pages/BooksPage';
import InfoPage from './pages/InfoPage';
import RightsPage from './pages/RightsPage';
import TeamPage from './pages/TeamPage';
// El lector (epub.js) se carga solo al abrir un libro, para no pesar en el resto de la app.
const ReaderPage = lazy(() => import('./pages/ReaderPage'));
import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import Tab3 from './pages/Tab3';
import { useAppStore } from './store/useAppStore';
import { useBooksStore } from './store/useBooksStore';
import { useAuthStore, useCurrentUser, useIsLoggedIn } from './store/useAuthStore';

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

/** Solo moderadores y administradores. */
const RequireStaff: React.FC<{ children: ReactElement }> = ({ children }) => {
  const user = useCurrentUser();
  const isStaff = user?.accountType === 'moderator' || user?.accountType === 'admin';
  return isStaff ? children : <Navigate to="/perfil" replace />;
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
    (['/inicio', '/comunidad', '/perfil', '/biblioteca', '/derechos', '/equipo'].includes(pathname) ||
      pathname.startsWith('/informacion'));

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route path="/bienvenida" element={<GuestOnly><AuthPage mode="welcome" /></GuestOnly>} />
        <Route path="/registro" element={<GuestOnly><AuthPage mode="register" /></GuestOnly>} />
        <Route path="/iniciar-sesion" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
        <Route path="/inicio" element={<RequireAuth><Tab1 /></RequireAuth>} />
        <Route path="/comunidad" element={<RequireAuth><Tab2 /></RequireAuth>} />
        <Route path="/perfil" element={<RequireAuth><Tab3 /></RequireAuth>} />
        <Route path="/informacion/:articleId" element={<RequireAuth><InfoPage /></RequireAuth>} />
        <Route path="/informacion" element={<RequireAuth><InfoPage /></RequireAuth>} />
        <Route path="/biblioteca" element={<RequireAuth><BooksPage /></RequireAuth>} />
        <Route path="/derechos" element={<RequireAuth><RightsPage /></RequireAuth>} />
        <Route
          path="/equipo"
          element={
            <RequireAuth>
              <RequireStaff>
                <TeamPage />
              </RequireStaff>
            </RequireAuth>
          }
        />
        <Route
          path="/leer/:bookId"
          element={
            <RequireAuth>
              <Suspense fallback={<div className="route-loading"><IonSpinner name="crescent" /></div>}>
                <ReaderPage />
              </Suspense>
            </RequireAuth>
          }
        />
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
          <IonTabButton tab="biblioteca" href="/biblioteca">
            <IonIcon aria-hidden="true" icon={libraryOutline} />
            <IonLabel>Biblioteca</IonLabel>
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
  const token = useAuthStore((state) => state.token);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const resetPosts = useAppStore((state) => state.reset);
  const resetBooks = useBooksStore((state) => state.reset);

  // Al abrir la app con sesión guardada, valida el token y trae el perfil actualizado.
  // Al cerrar sesión, limpia las publicaciones en memoria.
  useEffect(() => {
    if (token) void refreshUser();
    else {
      resetPosts();
      resetBooks();
    }
  }, [token, refreshUser, resetPosts, resetBooks]);

  return (
    <IonApp>
      <IonReactRouter>
        <AppRoutes />
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
