import { create } from 'zustand';
import type { CommunityPost } from '../data/mockData';
import { api, errorMessage } from '../api/client';

type ActionResult = { ok: true } | { ok: false; error: string };
type PostResponse = { post: CommunityPost };

type AppStore = {
  posts: CommunityPost[];
  isLoading: boolean;
  loadError: string;
  hasLoaded: boolean;
  fetchPosts: () => Promise<void>;
  toggleLike: (postId: string) => Promise<ActionResult>;
  addPost: (body: string, image?: string) => Promise<ActionResult>;
  editPost: (postId: string, body: string) => Promise<ActionResult>;
  deletePost: (postId: string) => Promise<ActionResult>;
  addComment: (postId: string, text: string) => Promise<ActionResult>;
  deleteComment: (postId: string, commentId: string) => Promise<ActionResult>;
  reset: () => void;
};

export const useAppStore = create<AppStore>((set) => {
  /** Ejecuta una acción de la API y reemplaza la publicación devuelta en la lista. */
  const runPostAction = async (request: () => Promise<PostResponse>): Promise<ActionResult> => {
    try {
      const { post } = await request();
      set((state) => ({ posts: state.posts.map((item) => (item.id === post.id ? post : item)) }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  return {
    posts: [],
    isLoading: false,
    loadError: '',
    hasLoaded: false,

    fetchPosts: async () => {
      set({ isLoading: true, loadError: '' });
      try {
        const { posts } = await api<{ posts: CommunityPost[] }>('/posts');
        set({ posts, hasLoaded: true });
      } catch (error) {
        set({ loadError: errorMessage(error) });
      } finally {
        set({ isLoading: false });
      }
    },

    toggleLike: (postId) =>
      runPostAction(() => api<PostResponse>(`/posts/${postId}/like`, { method: 'POST' })),

    addPost: async (body, image) => {
      try {
        const { post } = await api<PostResponse>('/posts', { method: 'POST', body: { body, image } });
        set((state) => ({ posts: [post, ...state.posts] }));
        return { ok: true };
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },

    editPost: (postId, body) =>
      runPostAction(() => api<PostResponse>(`/posts/${postId}`, { method: 'PATCH', body: { body } })),

    deletePost: async (postId) => {
      try {
        await api(`/posts/${postId}`, { method: 'DELETE' });
        set((state) => ({ posts: state.posts.filter((post) => post.id !== postId) }));
        return { ok: true };
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },

    addComment: (postId, text) =>
      runPostAction(() => api<PostResponse>(`/posts/${postId}/comments`, { method: 'POST', body: { text } })),

    deleteComment: (postId, commentId) =>
      runPostAction(() =>
        api<PostResponse>(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }),
      ),

    reset: () => set({ posts: [], hasLoaded: false, loadError: '' }),
  };
});
