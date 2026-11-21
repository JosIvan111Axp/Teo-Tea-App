// Llamadas del panel del equipo (moderación y administración).
import type { AccountType } from '../data/mockData';
import { api } from './client';

export const REPORT_REASONS = [
  'Acoso u ofensas',
  'Información falsa o peligrosa',
  'Spam o publicidad',
  'Contenido inapropiado',
  'Otro motivo',
];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  user: 'Usuario',
  moderator: 'Moderador',
  admin: 'Administrador',
};

export type ReportItem = {
  key: string;
  postId: string;
  commentId: string | null;
  type: 'post' | 'comment';
  text: string;
  image: string | null;
  contentCreatedAt: number | null;
  author: {
    id: string;
    name: string;
    accountType: AccountType;
    suspendedUntil: number | null;
    communityFrozenUntil: number | null;
    strikes: number;
  };
  reports: { id: string; reason: string; details: string; reporterName: string; createdAt: number }[];
};

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  accountType: AccountType;
  suspendedUntil: number | null;
  suspensionReason: string | null;
  communityFrozenUntil: number | null;
  communityFreezeReason: string | null;
  createdAt: number;
  posts: number;
};

export type Stats = {
  stats: Record<string, number>;
  byRole: { role: string; total: number }[];
  topBooks: { title: string; readers: number }[];
};

export type LogEntry = {
  id: string;
  action: string;
  details: string;
  actorName: string;
  actorType: AccountType | null;
  targetName: string | null;
  createdAt: number;
};

export const reportContent = (postId: string, commentId: string | null, reason: string, details = '') =>
  api(commentId ? `/posts/${postId}/comments/${commentId}/report` : `/posts/${postId}/report`, {
    method: 'POST',
    body: { reason, details },
  });

export const staffApi = {
  reports: () => api<{ items: ReportItem[] }>('/staff/reports'),
  dismiss: (postId: string, commentId: string | null) =>
    api('/staff/reports/dismiss', { method: 'POST', body: { postId, commentId } }),
  removeContent: (postId: string, commentId: string | null, note = '') =>
    api('/staff/reports/remove', { method: 'POST', body: { postId, commentId, note } }),
  suspend: (userId: string, days: number, reason: string) =>
    api(`/staff/users/${userId}/suspend`, { method: 'POST', body: { days, reason } }),
  reactivate: (userId: string) => api(`/staff/users/${userId}/reactivate`, { method: 'POST' }),
  freezeCommunity: (userId: string, days: number, reason: string) =>
    api(`/staff/users/${userId}/freeze-community`, { method: 'POST', body: { days, reason } }),
  unfreezeCommunity: (userId: string) => api(`/staff/users/${userId}/unfreeze-community`, { method: 'POST' }),
  stats: () => api<Stats>('/staff/stats'),
  users: (q = '') => api<{ users: StaffUser[] }>(`/staff/users?q=${encodeURIComponent(q)}`),
  setAccountType: (userId: string, accountType: AccountType) =>
    api(`/staff/users/${userId}/account-type`, { method: 'PATCH', body: { accountType } }),
  log: () => api<{ entries: LogEntry[] }>('/staff/log'),
};

export const ACTION_LABELS: Record<string, string> = {
  delete_post: 'Eliminó una publicación',
  delete_comment: 'Eliminó un comentario',
  dismiss_reports: 'Descartó reportes',
  suspend_user: 'Suspendió a',
  reactivate_user: 'Reactivó a',
  change_account_type: 'Cambió el tipo de cuenta de',
  freeze_community: 'Congeló la participación en la comunidad de',
  unfreeze_community: 'Descongeló la participación en la comunidad de',
};
