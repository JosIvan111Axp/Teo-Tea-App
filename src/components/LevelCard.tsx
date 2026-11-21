import type { AchievementsSummary } from '../store/useAchievementsStore';
import '../pages/AchievementsPage.css';

/** Tarjeta de nivel (Logros y resumen en el Perfil). */
const LevelCard: React.FC<{ summary: AchievementsSummary; compact?: boolean }> = ({ summary, compact }) => {
  const span = Math.max(1, summary.nextLevelXp - summary.levelXp);
  const inLevel = summary.xp - summary.levelXp;
  const pct = summary.level >= summary.maxLevel ? 100 : Math.min(100, Math.round((inLevel / span) * 100));
  return (
    <div className={`level-card${compact ? ' level-card-compact' : ''}`}>
      <div className="level-badge" aria-hidden="true">
        <span>{summary.level}</span>
      </div>
      <div className="level-copy">
        <span className="level-label">
          Nivel {summary.level} de {summary.maxLevel}
        </span>
        <strong>{summary.title}</strong>
        <div
          className="level-bar"
          role="progressbar"
          aria-label="Progreso al siguiente nivel"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <span className="level-xp">
          {summary.level >= summary.maxLevel
            ? `${summary.xp.toLocaleString('es')} XP · ¡Nivel máximo!`
            : `${summary.xp.toLocaleString('es')} XP · faltan ${(summary.nextLevelXp - summary.xp).toLocaleString('es')} para el nivel ${summary.level + 1}`}
        </span>
        <span className="level-xp">
          {summary.unlockedCount} de {summary.total} logros
        </span>
      </div>
    </div>
  );
};

export default LevelCard;
