import type { ReactNode } from 'react';
import { IonButton, IonIcon, IonModal, IonSpinner } from '@ionic/react';
import './ConfirmDialog.css';

type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  icon: string;
  title: string;
  children?: ReactNode;
  confirmText: string;
  cancelText?: string;
  /** 'danger' para acciones que no se pueden deshacer. */
  tone?: 'primary' | 'danger';
  confirmDisabled?: boolean;
  busy?: boolean;
};

/**
 * Ventana de confirmación con el estilo de TEO + TEA: tarjeta centrada de bordes
 * redondeados, ícono destacado, texto claro y botones grandes.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  icon,
  title,
  children,
  confirmText,
  cancelText = 'Cancelar',
  tone = 'primary',
  confirmDisabled = false,
  busy = false,
}) => (
  <IonModal
    className={`teo-dialog teo-dialog-${tone}`}
    isOpen={isOpen}
    onDidDismiss={onClose}
    backdropDismiss={!busy}
  >
    <div className="teo-dialog-card" role="alertdialog" aria-labelledby="teo-dialog-title">
      <span className="teo-dialog-icon" aria-hidden="true">
        <IonIcon icon={icon} />
      </span>
      <h2 id="teo-dialog-title" className="teo-dialog-title">{title}</h2>
      <div className="teo-dialog-body">{children}</div>
      <div className="teo-dialog-actions">
        <IonButton fill="outline" color="medium" disabled={busy} onClick={onClose}>
          {cancelText}
        </IonButton>
        <IonButton
          color={tone === 'danger' ? 'danger' : 'primary'}
          disabled={confirmDisabled || busy}
          onClick={onConfirm}
        >
          {busy ? <IonSpinner name="dots" /> : confirmText}
        </IonButton>
      </div>
    </div>
  </IonModal>
);

export default ConfirmDialog;
