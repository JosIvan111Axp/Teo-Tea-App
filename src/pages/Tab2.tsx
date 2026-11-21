import { useMemo, useRef, useState, type FormEvent } from 'react';
import {
  IonActionSheet,
  IonAlert,
  IonAvatar,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonNote,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToast,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  chatbubbleEllipsesOutline,
  closeCircle,
  ellipsisHorizontal,
  flagOutline,
  heart,
  heartOutline,
  imageOutline,
  paperPlaneOutline,
  shareSocialOutline,
  trashOutline,
} from 'ionicons/icons';
import { errorMessage } from '../api/client';
import { REPORT_REASONS, reportContent } from '../api/staff';
import type { AccountType, CommunityPost } from '../data/mockData';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore, useCurrentUser } from '../store/useAuthStore';
import { track } from '../store/useAchievementsStore';
import CommunityRulesModal from '../components/CommunityRulesModal';
import { compressImage, formatRelativeTime, getInitials } from '../utils/helpers';
import './Tab2.css';

const MAX_POST_LENGTH = 500;
const MAX_COMMENT_LENGTH = 300;

type Filter = 'todas' | 'mias' | 'gustan';

/** Insignia visible junto al nombre de moderadores y administradores. */
const StaffBadge: React.FC<{ type?: AccountType }> = ({ type }) =>
  type === 'moderator' || type === 'admin' ? (
    <span className={`staff-badge staff-badge-${type}`}>{type === 'admin' ? 'Administración' : 'Moderación'}</span>
  ) : null;

const Tab2: React.FC = () => {
  const user = useCurrentUser();
  const posts = useAppStore((state) => state.posts);
  const isLoading = useAppStore((state) => state.isLoading);
  const loadError = useAppStore((state) => state.loadError);
  const hasLoaded = useAppStore((state) => state.hasLoaded);
  const fetchPosts = useAppStore((state) => state.fetchPosts);
  const toggleLike = useAppStore((state) => state.toggleLike);
  const addPost = useAppStore((state) => state.addPost);
  const editPost = useAppStore((state) => state.editPost);
  const deletePost = useAppStore((state) => state.deletePost);
  const addComment = useAppStore((state) => state.addComment);
  const deleteComment = useAppStore((state) => state.deleteComment);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [postError, setPostError] = useState('');
  const [filter, setFilter] = useState<Filter>('todas');
  const [search, setSearch] = useState('');
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [menuPost, setMenuPost] = useState<CommunityPost | null>(null);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CommunityPost | null>(null);
  const [reportTarget, setReportTarget] = useState<{ postId: string; commentId: string | null } | null>(null);
  const [shareMessage, setShareMessage] = useState('');
  const [toast, setToast] = useState('');
  const [errorToast, setErrorToast] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Carga las publicaciones desde el servidor cada vez que se entra a la Comunidad.
  const acceptCommunityRules = useAuthStore((state) => state.acceptCommunityRules);
  const [showRules, setShowRules] = useState(false);
  const pendingAction = useRef<(() => Promise<void>) | null>(null);

  useIonViewWillEnter(() => {
    void fetchPosts();
    void track('visit', 'comunidad');
  });

  const visiblePosts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return [...posts]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((post) => {
        if (filter === 'mias' && post.authorId !== user?.id) return false;
        if (filter === 'gustan' && !(user && post.likedBy.includes(user.id))) return false;
        if (!term) return true;
        return `${post.author} ${post.role} ${post.body}`.toLocaleLowerCase().includes(term);
      });
  }, [posts, filter, search, user]);

  if (!user) return null;

  const isStaff = user.accountType === 'moderator' || user.accountType === 'admin';
  const isFrozen = Boolean(user.communityFrozenUntil && user.communityFrozenUntil > Date.now());

  /** Ejecuta una acción y muestra el error del servidor si falla. */
  const run = async (action: Promise<{ ok: boolean; error?: string }>, successMessage?: string) => {
    const result = await action;
    if (!result.ok) setErrorToast(result.error ?? 'No se pudo completar la acción.');
    else if (successMessage) setToast(successMessage);
    return result.ok;
  };

  const resetComposer = () => {
    setDraft('');
    setImage(null);
    setPostError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImage = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPostError('El archivo debe ser una imagen.');
      return;
    }
    setIsProcessingImage(true);
    try {
      setImage(await compressImage(file));
      setPostError('');
    } catch {
      setPostError('No pudimos cargar la imagen. Prueba con otra.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  /** Antes de la primera publicación o comentario se piden aceptar las normas. */
  const withRules = (action: () => Promise<void>) => {
    if (user.communityRulesAccepted) {
      void action();
      return;
    }
    pendingAction.current = action;
    setShowRules(true);
  };

  const doPublish = async () => {
    const body = draft.trim();
    setIsPublishing(true);
    const result = await addPost(body, image ?? undefined);
    setIsPublishing(false);
    if (!result.ok) {
      setPostError(result.error);
      return;
    }
    resetComposer();
    setFilter('todas');
    setToast('Tu publicación se compartió con la comunidad.');
    void track('check');
  };

  const submitPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim() && !image) {
      setPostError('Escribe algo o adjunta una imagen para publicar.');
      return;
    }
    withRules(doPublish);
  };

  const submitComment = (event: FormEvent<HTMLFormElement>, postId: string) => {
    event.preventDefault();
    const text = (commentDrafts[postId] ?? '').trim();
    if (!text) return;
    withRules(async () => {
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      const ok = await run(addComment(postId, text));
      if (!ok) setCommentDrafts((current) => ({ ...current, [postId]: text }));
      else void track('check');
    });
  };

  const acceptRules = async () => {
    const result = await acceptCommunityRules();
    if (!result.ok) {
      setErrorToast(result.error);
      return false;
    }
    setShowRules(false);
    void track('check');
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) await action();
    return true;
  };

  const sharePost = async (post: CommunityPost) => {
    const text = `${post.author} comparte en TEO + TEA: ${post.body}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'TEO + TEA', text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast('Texto copiado. Ya puedes pegarlo donde quieras compartirlo.');
    } catch {
      setShareMessage(`Puedes copiar este texto para compartirlo:\n\n${text}`);
    }
  };

  const emptyMessage =
    search.trim()
      ? `No encontramos publicaciones que coincidan con “${search.trim()}”.`
      : filter === 'mias'
        ? 'Todavía no has publicado nada. ¡Comparte tu primera idea!'
        : filter === 'gustan'
          ? 'Aún no has marcado publicaciones con “Me gusta”.'
          : 'Aún no hay publicaciones. Puedes ser la primera persona en compartir.';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Comunidad</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="community-content" fullscreen>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (event) => {
            await fetchPosts();
            event.detail.complete();
          }}
        >
          <IonRefresherContent pullingText="Desliza para actualizar" refreshingSpinner="dots" />
        </IonRefresher>
        <main className="community-layout">
          <section className="community-intro" aria-labelledby="community-title">
            <p className="community-eyebrow">Un espacio para compartir con respeto</p>
            <h1 id="community-title">Comunidad</h1>
            <p>Lee experiencias, conversa y conecta a tu manera.</p>
            <button type="button" className="rules-link" onClick={() => setShowRules(true)}>
              Ver las normas de la comunidad
            </button>
          </section>

          {isFrozen && (
            <section className="frozen-banner" role="status">
              <strong>Tu participación está en pausa</strong>
              <p>
                {user.communityFreezeReason ? `Motivo: ${user.communityFreezeReason}. ` : ''}
                Hasta el{' '}
                {new Date(user.communityFrozenUntil ?? 0).getFullYear() >= 9000
                  ? 'aviso del equipo'
                  : new Date(user.communityFrozenUntil ?? 0).toLocaleDateString('es', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                podrás leer la comunidad, pero no publicar, comentar ni reaccionar.
              </p>
          </section>

          )}

          {!isFrozen && (
          <IonCard className="composer-card">
            <IonCardContent>
              <div className="composer-heading">
                <IonAvatar aria-hidden="true">
                  <span className="avatar-fallback">{getInitials(user.name)}</span>
                </IonAvatar>
                <div>
                  <strong>¿Qué estás pensando hoy, {user.name.split(' ')[0]}?</strong>
                  <span>Comparte solo lo que te resulte cómodo.</span>
                </div>
              </div>
              <form className="composer-form" onSubmit={submitPost}>
                <IonTextarea
                  aria-label="Escribe una publicación"
                  placeholder="Escribe tu publicación..."
                  autoGrow
                  rows={3}
                  maxlength={MAX_POST_LENGTH}
                  counter
                  value={draft}
                  onIonInput={(event) => {
                    setDraft(event.detail.value ?? '');
                    setPostError('');
                  }}
                />
                <input
                  ref={fileInputRef}
                  className="visually-hidden"
                  type="file"
                  accept="image/*"
                  aria-label="Selecciona una imagen para adjuntar"
                  onChange={(event) => void handleImage(event.target.files?.[0])}
                />
                {isProcessingImage && (
                  <p className="attachment-name" role="status">
                    <IonSpinner name="dots" /> Preparando imagen...
                  </p>
                )}
                {image && (
                  <div className="composer-preview">
                    <img src={image} alt="Vista previa de la imagen adjunta" />
                    <button
                      type="button"
                      className="composer-preview-remove"
                      aria-label="Quitar imagen"
                      onClick={() => {
                        setImage(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <IonIcon icon={closeCircle} aria-hidden="true" />
                    </button>
                  </div>
                )}
                {postError && (
                  <IonNote color="danger" role="alert">
                    {postError}
                  </IonNote>
                )}
                <div className="composer-actions">
                  <IonButton
                    fill="clear"
                    color="secondary"
                    type="button"
                    disabled={isProcessingImage}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IonIcon slot="start" icon={imageOutline} aria-hidden="true" />
                    {image ? 'Cambiar imagen' : 'Adjuntar imagen'}
                  </IonButton>
                  <IonButton type="submit" disabled={isProcessingImage || isPublishing}>
                    {isPublishing ? (
                      <IonSpinner name="dots" />
                    ) : (
                      <>
                        <IonIcon slot="start" icon={paperPlaneOutline} aria-hidden="true" />
                        Publicar
                      </>
                    )}
                  </IonButton>
                </div>
              </form>
            </IonCardContent>
          </IonCard>
          )}

          <div className="community-tools">
            <IonSegment
              value={filter}
              onIonChange={(event) => setFilter((event.detail.value as Filter) ?? 'todas')}
              aria-label="Filtrar publicaciones"
            >
              <IonSegmentButton value="todas">
                <IonLabel>Todas</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="mias">
                <IonLabel>Mías</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="gustan">
                <IonLabel>Me gustan</IonLabel>
              </IonSegmentButton>
            </IonSegment>
            <IonSearchbar
              className="community-search"
              placeholder="Buscar en la comunidad"
              aria-label="Buscar en la comunidad"
              value={search}
              onIonInput={(event) => setSearch(event.detail.value ?? '')}
            />
          </div>

          <section className="community-feed" aria-label="Publicaciones de la comunidad">
            {isLoading && !hasLoaded && (
              <p className="community-empty" role="status">
                <IonSpinner name="dots" /> Cargando publicaciones...
              </p>
            )}
            {loadError && (
              <div className="community-empty community-error" role="alert">
                <p>{loadError}</p>
                <IonButton fill="outline" onClick={() => void fetchPosts()}>
                  Reintentar
                </IonButton>
              </div>
            )}
            {hasLoaded && !loadError && visiblePosts.length === 0 && (
              <p className="community-empty" role="status">
                {emptyMessage}
              </p>
            )}
            {visiblePosts.map((post) => {
              const isLiked = post.likedBy.includes(user.id);
              const isMine = post.authorId === user.id;
              const commentsOpen = Boolean(openComments[post.id]);
              const commentDraft = commentDrafts[post.id] ?? '';

              return (
                <IonCard className={`post-card${isMine ? ' post-card-mine' : ''}`} key={post.id}>
                  <IonCardContent>
                    <header className="post-header">
                      <IonAvatar aria-hidden="true">
                        <span className="avatar-fallback">{getInitials(post.author)}</span>
                      </IonAvatar>
                      <div className="post-author">
                        <strong>
                          {post.author}
                          {isMine && <span className="post-badge">Tú</span>}
                          <StaffBadge type={post.authorType} />
                        </strong>
                        <span>{post.role}</span>
                        <span>{formatRelativeTime(post.createdAt)}</span>
                      </div>
                      <IonButton
                        className="post-menu"
                        fill="clear"
                        color="medium"
                        aria-label="Opciones de la publicación"
                        onClick={() => setMenuPost(post)}
                      >
                        <IonIcon slot="icon-only" icon={ellipsisHorizontal} aria-hidden="true" />
                      </IonButton>
                    </header>
                    {post.body && <p className="post-body">{post.body}</p>}
                    {post.image && (
                      <img
                        className="post-image"
                        src={post.image}
                        alt={`Imagen compartida por ${post.author}`}
                        loading="lazy"
                      />
                    )}
                    <div className="post-actions" aria-label={`Acciones de la publicación de ${post.author}`}>
                      <IonButton
                        fill="clear"
                        className={isLiked ? 'is-liked' : ''}
                        aria-label={isLiked ? 'Quitar Me gusta' : 'Me gusta'}
                        aria-pressed={isLiked}
                        disabled={isFrozen}
                        onClick={() =>
                          void run(toggleLike(post.id)).then((ok) => {
                            if (ok) void track('check');
                          })
                        }
                      >
                        <IonIcon slot="start" icon={isLiked ? heart : heartOutline} aria-hidden="true" />
                        {post.likedBy.length}
                      </IonButton>
                      <IonButton
                        fill="clear"
                        aria-expanded={commentsOpen}
                        onClick={() =>
                          setOpenComments((current) => ({ ...current, [post.id]: !commentsOpen }))
                        }
                      >
                        <IonIcon slot="start" icon={chatbubbleEllipsesOutline} aria-hidden="true" />
                        Comentarios · {post.comments.length}
                      </IonButton>
                      <IonButton fill="clear" onClick={() => void sharePost(post)}>
                        <IonIcon slot="start" icon={shareSocialOutline} aria-hidden="true" />
                        Compartir
                      </IonButton>
                    </div>

                    {commentsOpen && (
                      <div className="post-comments">
                        {post.comments.length > 0 ? (
                          <ul className="comment-list">
                            {post.comments.map((comment) => (
                              <li key={comment.id}>
                                <div className="comment-head">
                                  <strong>{comment.author}</strong>
                                  <StaffBadge type={comment.authorType} />
                                  <span>{formatRelativeTime(comment.createdAt)}</span>
                                  {comment.authorId !== user.id && (
                                    <button
                                      type="button"
                                      className="comment-delete comment-report"
                                      aria-label={`Reportar comentario de ${comment.author}`}
                                      onClick={() => setReportTarget({ postId: post.id, commentId: comment.id })}
                                    >
                                      <IonIcon icon={flagOutline} aria-hidden="true" />
                                    </button>
                                  )}
                                  {(comment.authorId === user.id || isStaff) && (
                                    <button
                                      type="button"
                                      className="comment-delete"
                                      aria-label={
                                        comment.authorId === user.id
                                          ? 'Eliminar mi comentario'
                                          : `Eliminar comentario de ${comment.author} (moderación)`
                                      }
                                      onClick={() => void run(deleteComment(post.id, comment.id))}
                                    >
                                      <IonIcon icon={trashOutline} aria-hidden="true" />
                                    </button>
                                  )}
                                </div>
                                <p>{comment.text}</p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="no-comments">Aún no hay comentarios. Puedes iniciar la conversación.</p>
                        )}
                        <form className="comment-form" onSubmit={(event) => submitComment(event, post.id)}>
                          <IonTextarea
                            aria-label={`Escribe un comentario para ${post.author}`}
                            placeholder="Escribe un comentario..."
                            autoGrow
                            rows={1}
                            maxlength={MAX_COMMENT_LENGTH}
                            value={commentDraft}
                            onIonInput={(event) =>
                              setCommentDrafts((current) => ({
                                ...current,
                                [post.id]: event.detail.value ?? '',
                              }))
                            }
                          />
                          <IonButton type="submit" aria-label="Enviar comentario" disabled={!commentDraft.trim()}>
                            <IonIcon icon={paperPlaneOutline} aria-hidden="true" />
                          </IonButton>
                        </form>
                      </div>
                    )}
                  </IonCardContent>
                </IonCard>
              );
            })}
          </section>
        </main>

        <IonActionSheet
          isOpen={Boolean(menuPost)}
          header={menuPost?.authorId === user.id ? 'Tu publicación' : `Publicación de ${menuPost?.author ?? ''}`}
          buttons={[
            ...(menuPost?.authorId === user.id
              ? [
                  { text: 'Editar', handler: () => setEditingPost(menuPost) },
                  { text: 'Eliminar', role: 'destructive', handler: () => setConfirmDelete(menuPost) },
                ]
              : [
                  {
                    text: 'Reportar publicación',
                    handler: () => menuPost && setReportTarget({ postId: menuPost.id, commentId: null }),
                  },
                  ...(isStaff
                    ? [{ text: 'Eliminar (moderación)', role: 'destructive', handler: () => setConfirmDelete(menuPost) }]
                    : []),
                ]),
            { text: 'Cancelar', role: 'cancel' },
          ]}
          onDidDismiss={() => setMenuPost(null)}
        />

        <IonAlert
          isOpen={Boolean(reportTarget)}
          header={reportTarget?.commentId ? 'Reportar comentario' : 'Reportar publicación'}
          subHeader="¿Por qué quieres reportarlo? El equipo de moderación lo revisará."
          inputs={REPORT_REASONS.map((reason, index) => ({
            type: 'radio' as const,
            label: reason,
            value: reason,
            checked: index === 0,
          }))}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Enviar reporte',
              handler: (reason: string) => {
                if (!reportTarget) return;
                void reportContent(reportTarget.postId, reportTarget.commentId, reason)
                  .then(() => setToast('Gracias. El equipo de moderación revisará el reporte.'))
                  .catch((error: unknown) => setErrorToast(errorMessage(error)));
              },
            },
          ]}
          onDidDismiss={() => setReportTarget(null)}
        />

        <IonAlert
          isOpen={Boolean(editingPost)}
          header="Editar publicación"
          inputs={[
            {
              name: 'body',
              type: 'textarea',
              value: editingPost?.body ?? '',
              attributes: { maxlength: MAX_POST_LENGTH, 'aria-label': 'Texto de la publicación' },
            },
          ]}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Guardar',
              handler: (values: { body: string }) => {
                const body = values.body.trim();
                if (!body && !editingPost?.image) return false;
                if (editingPost) void run(editPost(editingPost.id, body), 'Publicación actualizada.');
                return true;
              },
            },
          ]}
          onDidDismiss={() => setEditingPost(null)}
        />

        <IonAlert
          isOpen={Boolean(confirmDelete)}
          header="¿Eliminar publicación?"
          message="Esta acción no se puede deshacer."
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Eliminar',
              role: 'destructive',
              handler: () => {
                if (confirmDelete) void run(deletePost(confirmDelete.id), 'Publicación eliminada.');
              },
            },
          ]}
          onDidDismiss={() => setConfirmDelete(null)}
        />

        <IonAlert
          isOpen={Boolean(shareMessage)}
          header="Compartir publicación"
          message={shareMessage}
          buttons={['Cerrar']}
          onDidDismiss={() => setShareMessage('')}
        />

        <IonToast
          isOpen={Boolean(toast)}
          message={toast}
          duration={2200}
          color="secondary"
          position="bottom"
          onDidDismiss={() => setToast('')}
        />

        <IonToast
          isOpen={Boolean(errorToast)}
          message={errorToast}
          duration={3500}
          color="danger"
          position="bottom"
          onDidDismiss={() => setErrorToast('')}
        />
        <CommunityRulesModal
          isOpen={showRules}
          readOnly={Boolean(user.communityRulesAccepted)}
          onAccept={acceptRules}
          onClose={() => {
            setShowRules(false);
            pendingAction.current = null;
          }}
        />
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
