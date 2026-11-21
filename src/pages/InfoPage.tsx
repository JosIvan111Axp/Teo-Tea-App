import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useNavigate, useParams } from 'react-router-dom';
import { chevronForwardOutline } from 'ionicons/icons';
import { mockData } from '../data/mockData';
import './InfoPage.css';

const InfoPage: React.FC = () => {
  const navigate = useNavigate();
  const { articleId } = useParams<{ articleId: string }>();
  const article = mockData.articles.find((item) => item.id === articleId);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          {articleId && (
            <IonButtons slot="start">
              <IonBackButton defaultHref="/informacion" text="Información" />
            </IonButtons>
          )}
          <IonTitle>{article?.title ?? 'Información'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="library-content" fullscreen>
        {article ? (
          <main className="library-layout">
            <article className="article-detail">
              <div className="article-detail-icon">
                <IonIcon aria-hidden="true" icon={article.icon} />
              </div>
              <p className="article-summary">{article.summary}</p>
              {article.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <aside className="article-note">
                Esta información es general y no sustituye la orientación profesional
                individualizada.
              </aside>
            </article>
          </main>
        ) : articleId ? (
          <main className="library-layout">
            <section className="library-empty" role="status">
              <h1>No encontramos ese artículo</h1>
              <p>Vuelve a Información para explorar los temas disponibles.</p>
              <IonButton onClick={() => navigate('/informacion')}>Ir a Información</IonButton>
            </section>
          </main>
        ) : (
          <main className="library-layout">
            <section className="library-intro">
              <p className="library-eyebrow">Información clara y accesible</p>
              <h1>Aprende a tu ritmo</h1>
              <p>Explora temas sobre autismo, experiencias sensoriales y apoyos.</p>
            </section>
            <div className="article-list">
              {mockData.articles.map((item) => (
                <IonCard
                  key={item.id}
                  className="article-card"
                  button
                  onClick={() => navigate(`/informacion/${item.id}`)}
                >
                  <IonCardContent>
                    <span className="article-card-icon">
                      <IonIcon aria-hidden="true" icon={item.icon} />
                    </span>
                    <span className="article-card-copy">
                      <strong>{item.title}</strong>
                      <span>{item.summary}</span>
                    </span>
                    <IonIcon
                      className="article-card-arrow"
                      aria-hidden="true"
                      icon={chevronForwardOutline}
                    />
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          </main>
        )}
      </IonContent>
    </IonPage>
  );
};

export default InfoPage;
