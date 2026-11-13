import { create } from 'zustand';
import { mockData, type CommunityPost } from '../data/mockData';

type AppStore = {
  posts: CommunityPost[];
  toggleLike: (postId: string) => void;
  addPost: (body: string, attachmentName?: string) => void;
  addComment: (postId: string, text: string) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  posts: mockData.posts,
  toggleLike: (postId) =>
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.likes + (post.isLiked ? -1 : 1),
            }
          : post,
      ),
    })),
  addPost: (body, attachmentName) =>
    set((state) => ({
      posts: [
        {
          id: `post-${Date.now()}`,
          author: mockData.profile.name,
          role: mockData.profile.role,
          time: 'Ahora',
          body,
          likes: 0,
          isLiked: false,
          comments: [],
          ...(attachmentName ? { attachmentName } : {}),
        },
        ...state.posts,
      ],
    })),
  addComment: (postId, text) =>
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [
                ...post.comments,
                {
                  id: `comment-${Date.now()}`,
                  author: mockData.profile.name,
                  text,
                },
              ],
            }
          : post,
      ),
    })),
}));
