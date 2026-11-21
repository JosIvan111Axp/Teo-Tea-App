import { useCallback, useState, type ReactNode } from 'react';
import { globeOutline, openOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import { ExternalLinkContext, type OpenExternal, useExternalLink } from './externalLinkContext';
import ConfirmDialog from './ConfirmDialog';
import { usePreferencesStore } from '../store/usePreferencesStore';

/**
 * Enlaces externos con confirmación: antes de salir de la app se pregunta
 * "¿Quieres ir a …?" mostrando el destino exacto. Se puede desactivar en Perfil.
 */
type LinkTarget = { url: string; label: string; onOpen?: () => void };
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const go = (target: LinkTarget) => {
  window.open(target.url, '_blank', 'noopener,noreferrer');
  target.onOpen?.();
};

export const ExternalLinkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [target, setTarget] = useState<LinkTarget | null>(null);
  // Lo que se muestra se conserva durante la animación de cierre.
  const [shown, setShown] = useState<LinkTarget | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const confirmLinks = usePreferencesStore((state) => state.confirmExternalLinks);
  const setConfirmLinks = usePreferencesStore((state) => state.setConfirmExternalLinks);

  const open = useCallback<OpenExternal>(
    (url, label, onOpen) => {
      if (!confirmLinks) {
        go({ url, label, onOpen });
        return;
      }
      setDontAskAgain(false);
      setTarget({ url, label, onOpen });
      setShown({ url, label, onOpen });
    },
    [confirmLinks],
  );

  return (
    <ExternalLinkContext.Provider value={open}>
      {children}
      <ConfirmDialog
        isOpen={Boolean(target)}
        onClose={() => setTarget(null)}
        onConfirm={() => {
          if (!target) return;
          if (dontAskAgain) setConfirmLinks(false);
          go(target);
          setTarget(null);
        }}
        icon={openOutline}
        title="Vas a salir de TEO + TEA"
        confirmText="Ir al sitio"
      >
        {shown && (
          <>
            <p>
              ¿Quieres abrir <strong>{shown.label}</strong>?
            </p>
            <div className="teo-dialog-pill">
              <IonIcon icon={globeOutline} aria-hidden="true" />
              {hostOf(shown.url)}
            </div>
            <p className="teo-dialog-note">Se abrirá en una pestaña nueva. TEO + TEA seguirá abierta.</p>
            <label className="teo-dialog-check">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(e) => setDontAskAgain(e.target.checked)}
              />
              No volver a preguntar
            </label>
          </>
        )}
      </ConfirmDialog>
    </ExternalLinkContext.Provider>
  );
};

/** Botón/enlace que abre un sitio externo (con confirmación si está activada). */
export const ExternalLinkButton: React.FC<{
  url: string;
  label: string;
  className?: string;
  onOpen?: () => void;
  children: ReactNode;
}> = ({ url, label, className, onOpen, children }) => {
  const open = useExternalLink();
  return (
    <a
      href={url}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        open(url, label, onOpen);
      }}
    >
      {children}
    </a>
  );
};
