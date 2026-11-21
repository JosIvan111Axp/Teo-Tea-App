import { useCallback, useEffect, useState } from 'react';
import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import {
  barChartOutline,
  checkmarkCircleOutline,
  flagOutline,
  listOutline,
  peopleOutline,
  trashOutline,
} from 'ionicons/icons';
import { errorMessage } from '../api/client';
import {
  ACCOUNT_TYPE_LABELS,
  ACTION_LABELS,
  type LogEntry,
  type ReportItem,
  type StaffUser,
  type Stats,
  staffApi,
} from '../api/staff';
import type { AccountType } from '../data/mockData';
import { useCurrentUser } from '../store/useAuthStore';
import { formatRelativeTime } from '../utils/helpers';
import './TeamPage.css';

type Tab = 'reportes' | 'usuarios' | 'resumen' | 'registro';
type SuspendTarget = { id: string; name: string };

const MODERATOR_DAYS = [1, 3, 7, 30];
const ADMIN_DAYS = [1, 3, 7, 30, 90, 0]; // 0 = indefinida

const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });

const suspensionLabel = (until: number | null) =>
  !until ? null : new Date(until).getFullYear() >= 9000 ? 'Suspendida indefinidamente' : `Suspendida hasta ${formatDate(until)}`;

const TeamPage: React.FC = () => {
  const me = useCurrentUser();
  const isAdmin = me?.accountType === 'admin';
  const [tab, setTab] = useState<Tab>('reportes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ReportItem | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<SuspendTarget | null>(null);
  const [suspendDays, setSuspendDays] = useState(7);
  const [suspendReason, setSuspendReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'reportes') setReports((await staffApi.reports()).items);
      if (tab === 'usuarios') setUsers((await staffApi.users(userQuery)).users);
      if (tab === 'resumen') setStats(await staffApi.stats());
      if (tab === 'registro') setLog((await staffApi.log()).entries);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab, userQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), tab === 'usuarios' ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [load, tab]);

  const act = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      setToast({ message: success, color: 'secondary' });
      await load();
      return true;
    } catch (err) {
      setToast({ message: errorMessage(err), color: 'danger' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openSuspend = (target: SuspendTarget) => {
    setSuspendDays(7);
    setSuspendReason('');
    setSuspendTarget(target);
  };

  const submitSuspend = async () => {
    if (!suspendTarget || !suspendReason.trim()) return;
    const ok = await act(
      () => staffApi.suspend(suspendTarget.id, suspendDays, suspendReason.trim()),
      `${suspendTarget.name} fue suspendido/a.`,
    );
    if (ok) setSuspendTarget(null);
  };

  const title = isAdmin ? 'Panel de administración' : 'Panel de moderación';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/perfil" text="" />
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
        {isAdmin && (
          <IonToolbar className="toolbar-light team-segment-toolbar">
            <IonSegment value={tab} scrollable onIonChange={(e) => setTab((e.detail.value as Tab) ?? 'reportes')}>
              <IonSegmentButton value="reportes">
                <IonIcon icon={flagOutline} aria-hidden="true" />
                <IonLabel>Reportes</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="usuarios">
                <IonIcon icon={peopleOutline} aria-hidden="true" />
                <IonLabel>Usuarios</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="resumen">
                <IonIcon icon={barChartOutline} aria-hidden="true" />
                <IonLabel>Resumen</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="registro">
                <IonIcon icon={listOutline} aria-hidden="true" />
                <IonLabel>Registro</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </IonToolbar>
        )}
      </IonHeader>

      <IonContent className="team-content">
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (event) => {
            await load();
            event.detail.complete();
          }}
        >
          <IonRefresherContent pullingText="Desliza para actualizar" refreshingSpinner="dots" />
        </IonRefresher>

        <main className="team-layout">
          {error && (
            <div className="team-empty" role="alert">
              <p>{error}</p>
              <IonButton fill="outline" onClick={() => void load()}>
                Reintentar
              </IonButton>
            </div>
          )}

          {/* ------------------------------ Reportes ------------------------------ */}
          {tab === 'reportes' && !error && (
            <>
              <p className="team-help">
                Revisa el contenido reportado por la comunidad. Descarta los reportes si el contenido respeta las
                normas, o elimínalo y, si es necesario, suspende temporalmente a la persona autora.
              </p>
              {loading && !reports.length && (
                <p className="team-empty" role="status">
                  <IonSpinner name="dots" /> Cargando reportes...
                </p>
              )}
              {!loading && !reports.length && (
                <div className="team-empty">
                  <IonIcon icon={checkmarkCircleOutline} className="team-empty-icon" aria-hidden="true" />
                  <p>No hay reportes pendientes. ¡Todo en orden!</p>
                </div>
              )}
              <ul className="team-list">
                {reports.map((item) => (
                  <li key={item.key} className="report-card">
                    <div className="report-top">
                      <span className="team-chip">{item.type === 'post' ? 'Publicación' : 'Comentario'}</span>
                      <span className="report-count">
                        {item.reports.length} {item.reports.length === 1 ? 'reporte' : 'reportes'}
                      </span>
                    </div>
                    <blockquote className="report-content">
                      {item.text || <em>(Sin texto)</em>}
                      {item.image && <img src={item.image} alt="Imagen de la publicación reportada" />}
                    </blockquote>
                    <p className="report-author">
                      Autor/a: <strong>{item.author.name}</strong>
                      {item.author.strikes > 0 && (
                        <span className="team-chip team-chip-warn">{item.author.strikes} antecedente(s)</span>
                      )}
                      {item.author.suspendedUntil && (
                        <span className="team-chip team-chip-danger">{suspensionLabel(item.author.suspendedUntil)}</span>
                      )}
                    </p>
                    <ul className="report-reasons">
                      {item.reports.map((r) => (
                        <li key={r.id}>
                          <strong>{r.reason}</strong> · {r.reporterName} · {formatRelativeTime(r.createdAt)}
                          {r.details && <span className="report-details">“{r.details}”</span>}
                        </li>
                      ))}
                    </ul>
                    <div className="team-actions">
                      <IonButton
                        size="small"
                        fill="outline"
                        color="secondary"
                        disabled={busy}
                        onClick={() =>
                          void act(() => staffApi.dismiss(item.postId, item.commentId), 'Reporte descartado.')
                        }
                      >
                        Descartar
                      </IonButton>
                      <IonButton size="small" color="danger" disabled={busy} onClick={() => setConfirmRemove(item)}>
                        <IonIcon slot="start" icon={trashOutline} aria-hidden="true" />
                        Eliminar contenido
                      </IonButton>
                      {item.author.accountType === 'user' || isAdmin ? (
                        item.author.accountType !== 'admin' &&
                        !item.author.suspendedUntil && (
                          <IonButton
                            size="small"
                            fill="clear"
                            color="danger"
                            disabled={busy}
                            onClick={() => openSuspend({ id: item.author.id, name: item.author.name })}
                          >
                            Suspender autor/a
                          </IonButton>
                        )
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* ------------------------------ Usuarios ------------------------------ */}
          {tab === 'usuarios' && isAdmin && !error && (
            <>
              <IonSearchbar
                className="team-search"
                placeholder="Buscar por nombre, correo o usuario"
                value={userQuery}
                onIonInput={(e) => setUserQuery(e.detail.value ?? '')}
              />
              {loading && !users.length && (
                <p className="team-empty" role="status">
                  <IonSpinner name="dots" /> Cargando usuarios...
                </p>
              )}
              <ul className="team-list">
                {users.map((u) => {
                  const isMe = u.id === me?.id;
                  return (
                    <li key={u.id} className="user-row">
                      <div className="user-main">
                        <strong>
                          {u.name} {isMe && <span className="team-chip">Tú</span>}
                        </strong>
                        <span>
                          {u.email} · {u.username}
                        </span>
                        <span>
                          {u.role} · {u.posts} publicación(es) · desde {formatDate(u.createdAt)}
                        </span>
                        {u.suspendedUntil && (
                          <span className="team-chip team-chip-danger">
                            {suspensionLabel(u.suspendedUntil)}
                            {u.suspensionReason ? ` — ${u.suspensionReason}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="user-controls">
                        <IonSelect
                          aria-label={`Tipo de cuenta de ${u.name}`}
                          interface="popover"
                          value={u.accountType}
                          disabled={isMe || busy}
                          onIonChange={(e) => {
                            const next = e.detail.value as AccountType;
                            if (next !== u.accountType) {
                              void act(
                                () => staffApi.setAccountType(u.id, next),
                                `${u.name} ahora es ${ACCOUNT_TYPE_LABELS[next].toLowerCase()}.`,
                              );
                            }
                          }}
                        >
                          {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => (
                            <IonSelectOption key={type} value={type}>
                              {ACCOUNT_TYPE_LABELS[type]}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                        {!isMe && u.accountType !== 'admin' &&
                          (u.suspendedUntil ? (
                            <IonButton
                              size="small"
                              fill="outline"
                              color="secondary"
                              disabled={busy}
                              onClick={() => void act(() => staffApi.reactivate(u.id), `${u.name} fue reactivado/a.`)}
                            >
                              Reactivar
                            </IonButton>
                          ) : (
                            <IonButton
                              size="small"
                              fill="clear"
                              color="danger"
                              disabled={busy}
                              onClick={() => openSuspend({ id: u.id, name: u.name })}
                            >
                              Suspender
                            </IonButton>
                          ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* ------------------------------ Resumen ------------------------------ */}
          {tab === 'resumen' && isAdmin && !error && stats && (
            <>
              <div className="stat-grid">
                {[
                  ['Usuarios', stats.stats.users, `+${stats.stats.users_week} esta semana`],
                  ['Publicaciones', stats.stats.posts, `+${stats.stats.posts_week} esta semana`],
                  ['Comentarios', stats.stats.comments, ''],
                  ['Reportes pendientes', stats.stats.pending_reports, ''],
                  ['Cuentas suspendidas', stats.stats.suspended, ''],
                  ['Equipo', stats.stats.moderators + stats.stats.admins, `${stats.stats.moderators} mod. · ${stats.stats.admins} admin.`],
                  ['Libros descargados', stats.stats.books_downloaded, `${(stats.stats.books_bytes / 1024 / 1024).toFixed(1)} MB en disco`],
                  ['Libros en bibliotecas', stats.stats.library_entries, `${stats.stats.catalog_size.toLocaleString('es')} en el catálogo`],
                ].map(([label, value, note]) => (
                  <div key={label as string} className="stat-tile">
                    <span className="stat-label">{label}</span>
                    <strong className="stat-value">{Number(value).toLocaleString('es')}</strong>
                    {note && <span className="stat-note">{note}</span>}
                  </div>
                ))}
              </div>
              <section className="team-card">
                <h2>Usuarios por identidad</h2>
                <ul className="bar-list">
                  {stats.byRole.map((r) => (
                    <li key={r.role}>
                      <span>{r.role}</span>
                      <span className="bar-track">
                        <span style={{ width: `${(r.total / Math.max(1, stats.stats.users)) * 100}%` }} />
                      </span>
                      <strong>{r.total}</strong>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="team-card">
                <h2>Libros más agregados</h2>
                {stats.topBooks.length ? (
                  <ol className="top-books">
                    {stats.topBooks.map((b) => (
                      <li key={b.title}>
                        {b.title} <span>· {b.readers} lector(es)</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="team-help">Aún nadie ha agregado libros.</p>
                )}
              </section>
            </>
          )}

          {/* ------------------------------ Registro ------------------------------ */}
          {tab === 'registro' && isAdmin && !error && (
            <>
              <p className="team-help">Historial de acciones del equipo de moderación y administración.</p>
              {!loading && !log.length && <p className="team-empty">Todavía no hay acciones registradas.</p>}
              <ul className="team-list log-list">
                {log.map((entry) => (
                  <li key={entry.id}>
                    <span className="log-time">{formatRelativeTime(entry.createdAt)}</span>
                    <p>
                      <strong>{entry.actorName}</strong>{' '}
                      {entry.actorType && entry.actorType !== 'user' && (
                        <span className="team-chip">{ACCOUNT_TYPE_LABELS[entry.actorType]}</span>
                      )}{' '}
                      {ACTION_LABELS[entry.action] ?? entry.action}
                      {entry.targetName && (
                        <>
                          {' '}
                          <strong>{entry.targetName}</strong>
                        </>
                      )}
                    </p>
                    {entry.details && <span className="log-details">{entry.details}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </main>

        <IonAlert
          isOpen={Boolean(confirmRemove)}
          header="¿Eliminar contenido?"
          message="Se eliminará de la comunidad y quedará registrado. Esta acción no se puede deshacer."
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Eliminar',
              role: 'destructive',
              handler: () => {
                const item = confirmRemove;
                if (item) void act(() => staffApi.removeContent(item.postId, item.commentId), 'Contenido eliminado.');
              },
            },
          ]}
          onDidDismiss={() => setConfirmRemove(null)}
        />

        <IonModal
          isOpen={Boolean(suspendTarget)}
          onDidDismiss={() => setSuspendTarget(null)}
          initialBreakpoint={0.7}
          breakpoints={[0, 0.7, 0.95]}
        >
          <IonContent className="suspend-sheet">
            <h2>Suspender a {suspendTarget?.name}</h2>
            <p className="team-help">
              La persona no podrá iniciar sesión mientras dure la suspensión y verá el motivo al intentarlo.
            </p>
            <h3>Duración</h3>
            <div className="duration-options" role="radiogroup" aria-label="Duración">
              {(isAdmin ? ADMIN_DAYS : MODERATOR_DAYS).map((days) => (
                <button
                  key={days}
                  type="button"
                  role="radio"
                  aria-checked={suspendDays === days}
                  className={`duration-option${suspendDays === days ? ' is-selected' : ''}`}
                  onClick={() => setSuspendDays(days)}
                >
                  {days === 0 ? 'Indefinida' : `${days} ${days === 1 ? 'día' : 'días'}`}
                </button>
              ))}
            </div>
            <h3>Motivo (lo verá la persona)</h3>
            <IonTextarea
              fill="outline"
              rows={3}
              maxlength={300}
              counter
              placeholder="Ej.: Publicaciones repetidas de publicidad."
              value={suspendReason}
              onIonInput={(e) => setSuspendReason(e.detail.value ?? '')}
            />
            <IonButton
              expand="block"
              color="danger"
              disabled={!suspendReason.trim() || busy}
              onClick={() => void submitSuspend()}
            >
              {busy ? <IonSpinner name="dots" /> : 'Confirmar suspensión'}
            </IonButton>
            <IonButton expand="block" fill="clear" onClick={() => setSuspendTarget(null)}>
              Cancelar
            </IonButton>
          </IonContent>
        </IonModal>

        <IonToast
          isOpen={Boolean(toast)}
          message={toast?.message}
          color={toast?.color}
          duration={2600}
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default TeamPage;
