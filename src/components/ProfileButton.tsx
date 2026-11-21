import { IonButton, IonButtons } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../store/useAuthStore';
import UserAvatar from './UserAvatar';

/** Acceso al Perfil desde la esquina superior derecha (reemplaza la pestaña inferior). */
const ProfileButton: React.FC = () => {
  const navigate = useNavigate();
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <IonButtons slot="end">
      <IonButton
        className="profile-header-button"
        aria-label={`Abrir mi perfil (${user.name})`}
        onClick={() => navigate('/perfil')}
      >
        <UserAvatar name={user.name} avatar={user.avatar} size={36} />
      </IonButton>
    </IonButtons>
  );
};

export default ProfileButton;
