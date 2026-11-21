import { IonToast } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { useAchievementsStore } from '../store/useAchievementsStore';

/** Avisos globales: "¡Logro desbloqueado!" y "¡Subiste de nivel!". */
const AchievementToast: React.FC = () => {
  const navigate = useNavigate();
  const queue = useAchievementsStore((s) => s.queue);
  const levelUp = useAchievementsStore((s) => s.levelUp);
  const dismiss = useAchievementsStore((s) => s.dismiss);
  const dismissLevelUp = useAchievementsStore((s) => s.dismissLevelUp);
  const current = queue[0];

  return (
    <>
      <IonToast
        isOpen={Boolean(current)}
        header="🏆 ¡Logro desbloqueado!"
        message={current ? `${current.name} · +${current.xp} XP` : undefined}
        position="top"
        duration={3200}
        cssClass="achievement-toast"
        buttons={[{ text: 'Ver', handler: () => navigate('/logros') }]}
        onDidDismiss={dismiss}
      />
      <IonToast
        isOpen={!current && levelUp !== null}
        header="⭐ ¡Subiste de nivel!"
        message={levelUp ? `Ahora eres nivel ${levelUp}.` : undefined}
        position="top"
        duration={3000}
        cssClass="achievement-toast"
        onDidDismiss={dismissLevelUp}
      />
    </>
  );
};

export default AchievementToast;
