import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { AuthModalService } from './auth-modal.service';
import { WishItem } from '../models/memory.model';

const FALLBACK_WISHES: WishItem[] = [
  {
    id: 'f-1',
    user_id: 'system',
    author_nickname: 'Anonymous Local',
    content: 'May you find an unexpected reason to smile today, right around the corner.',
    created_at: new Date().toISOString()
  },
  {
    id: 'f-2',
    user_id: 'system',
    author_nickname: 'Warm Neighbor',
    content: 'Take a deep breath. You are exactly where you need to be right now.',
    created_at: new Date().toISOString()
  },
  {
    id: 'f-3',
    user_id: 'system',
    author_nickname: 'Quiet Wanderer',
    content: 'May the quiet streets bring you calm and your favorite warm drink taste extra sweet today.',
    created_at: new Date().toISOString()
  },
  {
    id: 'f-4',
    user_id: 'system',
    author_nickname: 'City Stargazer',
    content: 'Remember that someone once walked these same cobblestones with hopes just like yours.',
    created_at: new Date().toISOString()
  },
  {
    id: 'f-5',
    user_id: 'system',
    author_nickname: 'Old Friend',
    content: 'Sending warm courage for whichever silent battle or new step you are taking today.',
    created_at: new Date().toISOString()
  }
];

@Injectable({
  providedIn: 'root'
})
export class WishService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private authModal = inject(AuthModalService);

  readonly currentWish = signal<WishItem | null>(null);
  readonly isWishOpen = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly isPosting = signal<boolean>(false);

  private lastWishIndex = -1;

  async fetchRandomWish(): Promise<WishItem> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('wishes')
        .select('id, user_id, content, created_at, profiles(nickname)')
        .limit(40);

      if (!error && data && data.length > 0) {
        // Pick random item distinct from previous if possible
        const randomIndex = Math.floor(Math.random() * data.length);
        const item = data[randomIndex] as {
          id: string;
          user_id: string;
          content: string;
          created_at: string;
          profiles?: { nickname?: string } | null;
        };

        const wish: WishItem = {
          id: item.id,
          user_id: item.user_id,
          content: item.content,
          created_at: item.created_at,
          author_nickname: item.profiles?.nickname || 'Anonymous Neighbor'
        };
        this.currentWish.set(wish);
        this.isWishOpen.set(true);
        this.isLoading.set(false);
        return wish;
      }
    } catch {
      // Offline fallback
    }

    // Pick from curated fallback list
    let nextIndex = Math.floor(Math.random() * FALLBACK_WISHES.length);
    if (nextIndex === this.lastWishIndex && FALLBACK_WISHES.length > 1) {
      nextIndex = (nextIndex + 1) % FALLBACK_WISHES.length;
    }
    this.lastWishIndex = nextIndex;

    const fallback = FALLBACK_WISHES[nextIndex];
    this.currentWish.set(fallback);
    this.isWishOpen.set(true);
    this.isLoading.set(false);
    return fallback;
  }

  closeWish(): void {
    this.isWishOpen.set(false);
  }

  async addWish(content: string): Promise<{ success: boolean; error?: string }> {
    if (!this.auth.isAuthenticated()) {
      this.authModal.openModal('Sign in to leave a warm wish in the global pool.');
      return { success: false, error: 'Auth required' };
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return { success: false, error: 'Wish text cannot be empty' };
    }

    if (trimmed.length > 500) {
      return { success: false, error: 'Wish cannot exceed 500 characters' };
    }

    this.isPosting.set(true);
    try {
      const user = this.auth.currentUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await this.supabase.client
        .from('wishes')
        .insert({
          user_id: user.id,
          content: trimmed
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically display newly created wish
      const newWish: WishItem = {
        id: data.id,
        user_id: data.user_id,
        content: data.content,
        created_at: data.created_at,
        author_nickname: user.nickname || 'You'
      };
      this.currentWish.set(newWish);
      this.isWishOpen.set(true);
      this.isPosting.set(false);
      return { success: true };
    } catch (err: unknown) {
      this.isPosting.set(false);
      const message = err instanceof Error ? err.message : 'Failed to save wish';
      return { success: false, error: message };
    }
  }
}
