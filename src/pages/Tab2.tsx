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
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import {
  chatbubbleEllipsesOutline,
  closeCircle,
  ellipsisHorizontal,
  heart,
  heartOutline,
  imageOutline,
  paperPlaneOutline,
  shareSocialOutline,
  trashOutline,
} from 'ionicons/icons';
import type { CommunityPost } from '../data/mockData';
import { useAppStore } from '../store/useAppStore';
import { useCurrentUser } from '../store/useAuthStore';
import { compressImage, formatRelativeTime, getInitials } from '../utils/helpers';
import './Tab2.css';

const MAX_POST_LENGTH = 500;
const MAX_COMMENT_LENGTH = 300;

type Filter = 'todas' | 'mias' | 'gustan';

const Tab2: React.FC = () => {
  const user = useCurrentUser();
  const posts = useAppStore((state) => state.posts);
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
  const [shareMessage, setShareMessage] = useState('');
  const [toast, setToast] = useState('');

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

  const author = { id: user.id, name: user.name, role: user.role };

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

  const submitPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body && !image) {
      setPostError('Escribe algo o adjunta una imagen para publicar.');
      return;
    }
    addPost(author, body, image ?? undefined);
    resetComposer();
    setFilter('todas');
    setToast('Tu publicación se compartió con la comunidad.');
  };

  const submitComment = (event: FormEvent<HTMLFormElement>, postId: string) => {
    event.preventDefault();
    const text = (commentDrafts[postId] ?? '').trim();
    if (!text) return;
    addComment(postId, author, text);
    setCommentDrafts((current) => ({ ...current, [postId]: '' }));
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
        <main className="community-layout">
          <section className="community-intro" aria-labelledby="community-title">
            <p className="community-eyebrow">Un espacio para compartir con respeto</p>
            <h1 id="community-title">Comunidad</h1>
            <p>Lee experiencias, conversa y conecta a tu manera.</p>
          </section>

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
                  <IonButton type="submit" disabled={isProcessingImage}>
                    <IonIcon slot="start" icon={paperPlaneOutline} aria-hidden="true" />
                    Publicar
                  </IonButton>
                </div>
              </form>
            </IonCardContent>
          </IonCard>

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
            {visiblePosts.length === 0 && (
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
                        </strong>
                        <span>{post.role}</span>
                        <span>{formatRelativeTime(post.createdAt)}</span>
                      </div>
                      {isMine && (
                        <IonButton
                          className="post-menu"
                          fill="clear"
                          color="medium"
                          aria-label="Opciones de la publicación"
                          onClick={() => setMenuPost(post)}
                        >
                          <IonIcon slot="icon-only" icon={ellipsisHorizontal} aria-hidden="true" />
                        </IonButton>
                      )}
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
                        onClick={() => toggleLike(post.id, user.id)}
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
                                  <span>{formatRelativeTime(comment.createdAt)}</span>
                                  {comment.authorId === user.id && (
                                    <button
                                      type="button"
                                      className="comment-delete"
                                      aria-label="Eliminar mi comentario"
                                      onClick={() => deleteComment(post.id, comment.id, user.id)}
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
          header="Tu publicación"
          buttons={[
            { text: 'Editar', handler: () => setEditingPost(menuPost) },
            { text: 'Eliminar', role: 'destructive', handler: () => setConfirmDelete(menuPost) },
            { text: 'Cancelar', role: 'cancel' },
          ]}
          onDidDismiss={() => setMenuPost(null)}
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
                if (editingPost) editPost(editingPost.id, user.id, body);
                setToast('Publicación actualizada.');
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
                if (confirmDelete) deletePost(confirmDelete.id, user.id);
                setToast('Publicación eliminada.');
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
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
