import { createContext, useContext } from 'react';

export type OpenExternal = (url: string, label: string) => void;

export const ExternalLinkContext = createContext<OpenExternal>(() => undefined);

/** Abre un enlace externo pidiendo confirmación primero (ver ExternalLinkProvider). */
export const useExternalLink = () => useContext(ExternalLinkContext);
