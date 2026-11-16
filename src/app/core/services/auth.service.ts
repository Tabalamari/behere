import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserProfile } from '../models/memory.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService);

  readonly currentUser = signal<UserProfile | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isLoading = signal<boolean>(true);

  constructor() {
    this.initSession();
  }

  private async initSession(): Promise<void> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (session?.user && !error) {
        await this.loadUserProfile(session.user.id);
      }
    } catch {
      // Offline or mock environment fallback
    } finally {
      this.isLoading.set(false);
    }

    this.supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await this.loadUserProfile(session.user.id);
      } else {
        this.currentUser.set(null);
      }
      this.isLoading.set(false);
    });
  }

  async loadUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    const profile: UserProfile = {
      id: data.id,
      nickname: data.nickname,
      created_at: data.created_at
    };

    this.currentUser.set(profile);
    return profile;
  }

  async signUp(email: string, password: string, nickname: string): Promise<{ user: UserProfile | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname
          }
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const profile = await this.loadUserProfile(data.user.id);
        if (!profile) {
          const fallbackProfile: UserProfile = {
            id: data.user.id,
            nickname,
            created_at: new Date().toISOString()
          };
          this.currentUser.set(fallbackProfile);
          return { user: fallbackProfile, error: null };
        }
        return { user: profile, error: null };
      }

      return { user: null, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      return { user: null, error: message };
    }
  }

  async signIn(email: string, password: string): Promise<{ user: UserProfile | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const profile = await this.loadUserProfile(data.user.id);
        return { user: profile, error: null };
      }

      return { user: null, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      return { user: null, error: message };
    }
  }

  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.signOut();
      this.currentUser.set(null);
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      return { error: message };
    }
  }

  async updateNickname(newNickname: string): Promise<{ success: boolean; error: string | null }> {
    const user = this.currentUser();
    if (!user) {
      return { success: false, error: 'User is not authenticated' };
    }

    try {
      const { error } = await this.supabase.client
        .from('profiles')
        .update({ nickname: newNickname })
        .eq('id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      this.currentUser.update(u => u ? { ...u, nickname: newNickname } : null);
      return { success: true, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Nickname update failed';
      return { success: false, error: message };
    }
  }
}
