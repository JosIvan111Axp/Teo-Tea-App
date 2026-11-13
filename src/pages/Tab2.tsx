import { useRef, useState, type FormEvent } from 'react';
import {
  IonAlert,
  IonAvatar,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonNote,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  chatbubbleEllipsesOutline,
  heart,
  heartOutline,
  imageOutline,
  paperPlaneOutline,
  shareSocialOutline,
} from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import './Tab2.css';

const Tab2: React.FC = () => {
  const posts = useAppStore((state) => state.posts);
  const toggleLike = useAppStore((state) => state.toggleLike);
  const addPost = useAppStore((state) => state.addPost);
  const addComment = useAppStore((state) => state.addComment);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [postError, setPostError] = useState('');
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  const submitPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();

    if (!body && !attachment) {
      setPostError('Escribe algo o adjunta una imagen para publicar.');
      return;
    }

    addPost(body || 'Compartió una imagen.', attachment?.name);
    setDraft('');
    setAttachment(null);
    setPostError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const submitComment = (event: FormEvent<HTMLFormElement>, postId: string) => {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!text) {
      return;
    }

    addComment(postId, text);
    setCommentDraft('');
  };

  const sharePost = async (author: string, body: string) => {
    const text = `${author} comparte en TEO + TEA: ${body}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'TEO + TEA', text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setShareMessage(`No se pudo abrir la opción de compartir. Puedes copiar este texto:\n\n${text}`);
        return;
      }
    }

    setShareMessage(`Puedes compartir este texto:\n\n${text}`);
  };

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
                  <span className="avatar-fallback">A</span>
                </IonAvatar>
                <div>
                  <strong>¿Qué estás pensando hoy?</strong>
                  <span>Comparte solo lo que te resulte cómodo.</span>
                </div>
              </div>
              <form className="composer-form" onSubmit={submitPost}>
                <IonTextarea
                  aria-label="Escribe una publicación"
                  placeholder="Escribe tu publicación..."
                  autoGrow
                  rows={3}
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
                  onChange={(event) => {
                    setAttachment(event.target.files?.[0] ?? null);
                    setPostError('');
                  }}
                />
                {attachment && (
                  <p className="attachment-name" role="status">
                    Imagen seleccionada: {attachment.name}
                  </p>
                )}
                {postError && (
                  <IonNote color="danger" role="alert">
                    {postError}
                  </IonNote>
                )}
                <div className="composer-actions">
                  <IonButton
                    fill="clear"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IonIcon slot="start" icon={imageOutline} aria-hidden="true" />
                    Adjuntar imagen
                  </IonButton>
                  <IonButton type="submit">
                    <IonIcon slot="start" icon={paperPlaneOutline} aria-hidden="true" />
                    Publicar
                  </IonButton>
                </div>
              </form>
            </IonCardContent>
          </IonCard>

          <section className="community-feed" aria-label="Publicaciones de la comunidad">
            {posts.map((post) => (
              <IonCard className="post-card" key={post.id}>
                <IonCardContent>
                  <header className="post-header">
                    <IonAvatar aria-hidden="true">
                      <span className="avatar-fallback">
                        {post.author.slice(0, 1).toLocaleUpperCase()}
                      </span>
                    </IonAvatar>
                    <div className="post-author">
                      <strong>{post.author}</strong>
                      <span>{post.role}</span>
                      <span>{post.time}</span>
                    </div>
                  </header>
                  <p className="post-body">{post.body}</p>
                  {post.attachmentName && (
                    <p className="post-attachment" role="status">
                      <IonIcon aria-hidden="true" icon={imageOutline} />
                      Imagen adjunta: {post.attachmentName}
                    </p>
                  )}
                  <div className="post-actions" aria-label={`Acciones de la publicación de ${post.author}`}>
                    <IonButton
                      fill="clear"
                      aria-label={post.isLiked ? 'Quitar Me gusta' : 'Me gusta'}
                      aria-pressed={post.isLiked}
                      onClick={() => toggleLike(post.id)}
                    >
                      <IonIcon
                        slot="start"
                        icon={post.isLiked ? heart : heartOutline}
                        aria-hidden="true"
                      />
                      {post.isLiked ? 'Te gusta' : 'Me gusta'} · {post.likes}
                    </IonButton>
                    <IonButton
                      fill="clear"
                      aria-expanded={activeCommentPost === post.id}
                      onClick={() => {
                        setActiveCommentPost(activeCommentPost === post.id ? null : post.id);
                        setCommentDraft('');
                      }}
                    >
                      <IonIcon slot="start" icon={chatbubbleEllipsesOutline} aria-hidden="true" />
                      Comentarios · {post.comments.length}
                    </IonButton>
                    <IonButton
                      fill="clear"
                      onClick={() => void sharePost(post.author, post.body)}
                    >
                      <IonIcon slot="start" icon={shareSocialOutline} aria-hidden="true" />
                      Compartir
                    </IonButton>
                  </div>

                  {activeCommentPost === post.id && (
                    <div className="post-comments">
                      {post.comments.length > 0 ? (
                        <ul className="comment-list">
                          {post.comments.map((comment) => (
                            <li key={comment.id}>
                              <strong>{comment.author}</strong>
                              <p>{comment.text}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="no-comments">Aún no hay comentarios. Puedes iniciar la conversación.</p>
                      )}
                      <form
                        className="comment-form"
                        onSubmit={(event) => submitComment(event, post.id)}
                      >
                        <IonTextarea
                          aria-label={`Escribe un comentario para ${post.author}`}
                          placeholder="Escribe un comentario..."
                          autoGrow
                          rows={1}
                          value={commentDraft}
                          onIonInput={(event) => setCommentDraft(event.detail.value ?? '')}
                        />
                        <IonButton
                          type="submit"
                          aria-label="Enviar comentario"
                          disabled={!commentDraft.trim()}
                        >
                          <IonIcon icon={paperPlaneOutline} aria-hidden="true" />
                        </IonButton>
                      </form>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            ))}
          </section>
        </main>
        <IonAlert
          isOpen={Boolean(shareMessage)}
          header="Compartir publicación"
          message={shareMessage}
          buttons={['Cerrar']}
          onDidDismiss={() => setShareMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
