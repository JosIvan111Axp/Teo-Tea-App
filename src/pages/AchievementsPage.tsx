import { useMemo, useState } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  briefcaseOutline,
  calendarOutline,
  heartOutline,
  informationCircleOutline,
  libraryOutline,
  lockClosedOutline,
  musicalNotesOutline,
  peopleOutline,
  personOutline,
  scaleOutline,
  trophy,
} from 'ionicons/icons';
import {
  type Achievement,
  type AchievementCategory,
  useAchievementsStore,
} from '../store/useAchievementsStore';
import LevelCard from '../components/LevelCard';
import './AchievementsPage.css';

const CATEGORIES: Record<AchievementCategory, { label: string; icon: string }> = {
  biblioteca: { label: 'Biblioteca', icon: libraryOutline },
  musica: { label: 'Música', icon: musicalNotesOutline },
  comunidad: { label: 'Comunidad', icon: peopleOutline },
  derechos: { label: 'Leyes y Derechos', icon: scaleOutline },
  trabajo: { label: 'Trabajo', icon: briefcaseOutline },
  fundacion: { label: 'Fundación Sendero Azul', icon: heartOutline },
  informacion: { label: 'Información', icon: informationCircleOutline },
  perfil: { label: 'Perfil', icon: personOutline },
  constancia: { label: 'Constancia', icon: calendarOutline },
};

const AchievementItem: React.FC<{ item: Achievement }> = ({ item }) => {
  const pct = Math.round((item.value / item.goal) * 100);
  return (
    <li className={`ach-item${item.unlocked ? ' is-unlocked' : ''}`}>
      <span className="ach-icon" aria-hidden="true">
        <IonIcon icon={item.unlocked ? trophy : lockClosedOutline} />
      </span>
      <span className="ach-copy">
        <strong>{item.name}</strong>
        <span>{item.description}</span>
        {!item.unlocked && item.goal > 1 && (
          <span className="ach-progress">
            <span className="ach-bar" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </span>
            {item.value.toLocaleString('es')} / {item.goal.toLocaleString('es')}
          </span>
        )}
        {item.unlocked && item.unlockedAt && (
          <span className="ach-date">
            Logrado el {new Date(item.unlockedAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </span>
      <span className="ach-xp">+{item.xp} XP</span>
      <span className="visually-hidden">{item.unlocked ? 'Logro conseguido' : 'Logro bloqueado'}</span>
    </li>
  );
};

type Filter = 'todos' | 'logrados' | 'pendientes';

const AchievementsPage: React.FC = () => {
  const summary = useAchievementsStore((s) => s.summary);
  const loading = useAchievementsStore((s) => s.loading);
  const fetchSummary = useAchievementsStore((s) => s.fetchSummary);
  const [filter, setFilter] = useState<Filter>('todos');

  useIonViewWillEnter(() => {
    void fetchSummary();
  });

  const groups = useMemo(() => {
    if (!summary) return [];
    return (Object.keys(CATEGORIES) as AchievementCategory[])
      .map((category) => ({
        category,
        items: summary.achievements
          .filter((a) => a.category === category)
          .filter((a) => (filter === 'logrados' ? a.unlocked : filter === 'pendientes' ? !a.unlocked : true)),
        done: summary.achievements.filter((a) => a.category === category && a.unlocked).length,
        total: summary.achievements.filter((a) => a.category === category).length,
      }))
      .filter((g) => g.items.length);
  }, [summary, filter]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/perfil" text="" />
          </IonButtons>
          <IonTitle>Logros</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ach-content">
        <main className="ach-layout">
          {!summary && loading && (
            <p className="ach-empty" role="status">
              <IonSpinner name="dots" /> Cargando tus logros...
            </p>
          )}
          {summary && (
            <>
              <LevelCard summary={summary} />
              <p className="ach-help">
                Ganas experiencia (XP) usando la app: leyendo, escuchando música, participando en la comunidad y
                descubriendo cada sección. ¡Cada nivel requiere un poco más que el anterior, hasta el nivel 100!
              </p>
              <div className="ach-filters" role="radiogroup" aria-label="Mostrar">
                {(['todos', 'logrados', 'pendientes'] as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={filter === f}
                    className={`ach-filter${filter === f ? ' is-selected' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'todos' ? 'Todos' : f === 'logrados' ? 'Logrados' : 'Por lograr'}
                  </button>
                ))}
              </div>
              {groups.map((group) => (
                <section key={group.category} className="ach-group" aria-labelledby={`ach-${group.category}`}>
                  <h2 id={`ach-${group.category}`}>
                    <IonIcon icon={CATEGORIES[group.category].icon} aria-hidden="true" />
                    {CATEGORIES[group.category].label}
                    <span>
                      {group.done}/{group.total}
                    </span>
                  </h2>
                  <ul>
                    {group.items.map((item) => (
                      <AchievementItem key={item.id} item={item} />
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default AchievementsPage;
