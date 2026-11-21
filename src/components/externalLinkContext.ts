import { createContext, useContext } from 'react';

/** onOpen: se ejecuta solo si la persona confirma ir al sitio (p. ej. para logros). */
export type OpenExternal = (url: string, label: string, onOpen?: () => void) => void;

export const ExternalLinkContext = createContext<OpenExternal>(() => undefined);

/** Abre un enlace externo pidiendo confirmación primero (ver ExternalLinkProvider). */
export const useExternalLink = () => useContext(ExternalLinkContext);
