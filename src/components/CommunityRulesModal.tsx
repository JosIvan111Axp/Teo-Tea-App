import { useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  alertCircleOutline,
  chatbubblesOutline,
  eyeOffOutline,
  flagOutline,
  heartOutline,
  linkOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import './CommunityRulesModal.css';

const COMMUNITY_RULES = [
  {
    icon: heartOutline,
    title: 'Respeto siempre',
    text: 'Sin insultos, burlas, discriminación ni acoso. Aquí cada persona tiene su propio ritmo y forma de ser.',
  },
  {
    icon: linkOutline,
    title: 'Sin enlaces',
    text: 'No compartas links ni invites a entrar a otras páginas: pueden ser engañosos o peligrosos.',
  },
  {
    icon: chatbubblesOutline,
    title: 'Sin contactos fuera de la app',
    text: 'No pidas ni compartas teléfonos, correos o redes para hablar fuera de TEO + TEA. Tu seguridad es primero.',
  },
  {
    icon: eyeOffOutline,
    title: 'Cuida la privacidad',
    text: 'No publiques direcciones, datos personales ni fotos de otras personas sin su permiso.',
  },
  {
    icon: alertCircleOutline,
    title: 'Contenido apropiado',
    text: 'Nada violento, sexual, engañoso, spam ni publicidad.',
  },
  {
    icon: flagOutline,
    title: 'Si ves algo que no está bien, repórtalo',
    text: 'Usa el botón ⋯ de la publicación o la bandera del comentario. El equipo lo revisará.',
  },
];

type Props = {
  isOpen: boolean;
  /** Solo lectura (para volver a consultar las normas ya aceptadas). */
  readOnly?: boolean;
  onAccept?: () => Promise<boolean>;
  onClose: () => void;
};

const CommunityRulesModal: React.FC<Props> = ({ isOpen, readOnly, onAccept, onClose }) => {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={() => { setChecked(false); onClose(); }} className="rules-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Normas de la comunidad</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>{readOnly ? 'Cerrar' : 'Ahora no'}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="rules-content">
        <div className="rules-intro">
          <IonIcon icon={shieldCheckmarkOutline} aria-hidden="true" />
          <p>
            La comunidad de TEO + TEA es un espacio seguro. {readOnly ? 'Estas son' : 'Antes de publicar por primera vez, lee y acepta'} las
            normas de uso:
          </p>
        </div>
        <ol className="rules-list">
          {COMMUNITY_RULES.map((rule) => (
            <li key={rule.title}>
              <span className="rules-icon" aria-hidden="true">
                <IonIcon icon={rule.icon} />
              </span>
              <span>
                <strong>{rule.title}</strong>
                <span>{rule.text}</span>
              </span>
            </li>
          ))}
        </ol>

        <section className="rules-moderation" aria-labelledby="rules-mod-title">
          <h2 id="rules-mod-title">Moderación</h2>
          <p>Si no se respetan las normas, el equipo de moderación puede:</p>
          <ul>
            <li>Eliminar publicaciones o comentarios.</li>
            <li>
              <strong>Congelar tu participación</strong> en la comunidad por un tiempo: podrás leer, pero no publicar,
              comentar ni reaccionar.
            </li>
            <li>En casos graves, suspender la cuenta.</li>
          </ul>
          <p className="rules-note">
            Por seguridad, la app no permite publicar enlaces, correos ni números de teléfono.
          </p>
        </section>

        {!readOnly && (
          <div className="rules-accept">
            <IonCheckbox
              checked={checked}
              labelPlacement="end"
              justify="start"
              onIonChange={(e) => setChecked(e.detail.checked)}
            >
              He leído y acepto las normas de la comunidad
            </IonCheckbox>
            <IonButton
              expand="block"
              disabled={!checked || saving}
              onClick={async () => {
                if (!onAccept) return;
                setSaving(true);
                const ok = await onAccept();
                setSaving(false);
                if (ok) setChecked(false);
              }}
            >
              {saving ? <IonSpinner name="dots" /> : 'Aceptar y continuar'}
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};

export default CommunityRulesModal;
