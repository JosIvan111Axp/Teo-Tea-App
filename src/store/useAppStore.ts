import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mockData, type CommunityPost, type UserProfile } from '../data/mockData';
import { createId, safeLocalStorage } from '../utils/helpers';

type Author = Pick<UserProfile, 'id' | 'name' | 'role'>;

type AppStore = {
  posts: CommunityPost[];
  toggleLike: (postId: string, userId: string) => void;
  addPost: (author: Author, body: string, image?: string) => void;
  editPost: (postId: string, userId: string, body: string) => void;
  deletePost: (postId: string, userId: string) => void;
  addComment: (postId: string, author: Author, text: string) => void;
  deleteComment: (postId: string, commentId: string, userId: string) => void;
  syncAuthor: (author: Author) => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      posts: mockData.posts,

      toggleLike: (postId, userId) =>
        set((state) => ({
          posts: state.posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likedBy: post.likedBy.includes(userId)
                    ? post.likedBy.filter((id) => id !== userId)
                    : [...post.likedBy, userId],
                }
              : post,
          ),
        })),

      addPost: (author, body, image) =>
        set((state) => ({
          posts: [
            {
              id: createId('post'),
              authorId: author.id,
              author: author.name,
              role: author.role,
              createdAt: Date.now(),
              body,
              likedBy: [],
              comments: [],
              ...(image ? { image } : {}),
            },
            ...state.posts,
          ],
        })),

      editPost: (postId, userId, body) =>
        set((state) => ({
          posts: state.posts.map((post) =>
            post.id === postId && post.authorId === userId ? { ...post, body } : post,
          ),
        })),

      deletePost: (postId, userId) =>
        set((state) => ({
          posts: state.posts.filter((post) => !(post.id === postId && post.authorId === userId)),
        })),

      addComment: (postId, author, text) =>
        set((state) => ({
          posts: state.posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  comments: [
                    ...post.comments,
                    {
                      id: createId('comment'),
                      authorId: author.id,
                      author: author.name,
                      text,
                      createdAt: Date.now(),
                    },
                  ],
                }
              : post,
          ),
        })),

      deleteComment: (postId, commentId, userId) =>
        set((state) => ({
          posts: state.posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  comments: post.comments.filter(
                    (comment) => !(comment.id === commentId && comment.authorId === userId),
                  ),
                }
              : post,
          ),
        })),

      // Mantiene nombre/rol actualizados en publicaciones propias si el perfil cambia.
      syncAuthor: (author) =>
        set((state) => ({
          posts: state.posts.map((post) => ({
            ...post,
            ...(post.authorId === author.id ? { author: author.name, role: author.role } : {}),
            comments: post.comments.map((comment) =>
              comment.authorId === author.id ? { ...comment, author: author.name } : comment,
            ),
          })),
        })),
    }),
    {
      name: 'teo-tea-community',
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
    },
  ),
);
