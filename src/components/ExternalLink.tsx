import { useCallback, useState, type ReactNode } from 'react';
import { IonAlert } from '@ionic/react';
import { ExternalLinkContext, type OpenExternal, useExternalLink } from './externalLinkContext';

/**
 * Enlaces externos con confirmación: antes de salir de la app se pregunta
 * "¿Seguro que quieres ir a …?" mostrando el destino exacto.
 */
type LinkTarget = { url: string; label: string };
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const ExternalLinkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [target, setTarget] = useState<LinkTarget | null>(null);
  const open = useCallback<OpenExternal>((url, label) => setTarget({ url, label }), []);

  return (
    <ExternalLinkContext.Provider value={open}>
      {children}
      <IonAlert
        isOpen={Boolean(target)}
        header="Vas a salir de TEO + TEA"
        subHeader={target ? `¿Seguro que quieres ir a: ${target.label}?` : undefined}
        message={target ? `Se abrirá ${hostOf(target.url)} en una pestaña nueva.` : undefined}
        cssClass="external-link-alert"
        buttons={[
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Sí, ir al sitio',
            handler: () => {
              if (target) window.open(target.url, '_blank', 'noopener,noreferrer');
            },
          },
        ]}
        onDidDismiss={() => setTarget(null)}
      />
    </ExternalLinkContext.Provider>
  );
};

/** Botón/enlace que abre un sitio externo tras confirmar. */
export const ExternalLinkButton: React.FC<{
  url: string;
  label: string;
  className?: string;
  children: ReactNode;
}> = ({ url, label, className, children }) => {
  const open = useExternalLink();
  return (
    <a
      href={url}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        open(url, label);
      }}
    >
      {children}
    </a>
  );
};
