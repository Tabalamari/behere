import { Injectable, computed, inject, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { UserProfile } from '../models/memory.model';

export interface SignUpResult {
  user: UserProfile | null;
  needsConfirmation: boolean;
  email?: string;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService);

  readonly authUser = signal<User | null>(null);
  readonly currentUser = signal<UserProfile | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isLoading = signal<boolean>(true);

  // Email verification state
  readonly justSignedUpEmail = signal<string | null>(null);
  readonly userEmail = computed(() => {
    return this.authUser()?.email || this.currentUser()?.email || this.justSignedUpEmail() || '';
  });

  readonly isEmailConfirmed = computed(() => {
    const user = this.authUser();
    if (!user) return false;
    return Boolean(user.email_confirmed_at || (user as unknown as { confirmed_at?: string }).confirmed_at);
  });

  readonly needsEmailConfirmation = computed(() => {
    return this.isAuthenticated() && !this.isEmailConfirmed();
  });

  constructor() {
    this.initSession();
  }

  private async initSession(): Promise<void> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (session?.user && !error) {
        this.authUser.set(session.user);
        await this.loadUserProfile(session.user.id, session.user);
      }
    } catch {
      // Offline or mock environment fallback
    } finally {
      this.isLoading.set(false);
    }

    this.supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        this.authUser.set(session.user);
        await this.loadUserProfile(session.user.id, session.user);
        if (session.user.email_confirmed_at) {
          this.justSignedUpEmail.set(null);
        }
      } else {
        this.authUser.set(null);
        this.currentUser.set(null);
      }
      this.isLoading.set(false);
    });
  }

  async loadUserProfile(userId: string, authUser?: User | null): Promise<UserProfile | null> {
    const user = authUser || this.authUser();
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      if (user) {
        const fallbackProfile: UserProfile = {
          id: user.id,
          nickname: (user.user_metadata?.['nickname'] as string) || user.email?.split('@')[0] || 'Citizen',
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at
        };
        this.currentUser.set(fallbackProfile);
        return fallbackProfile;
      }
      return null;
    }

    const profile: UserProfile = {
      id: data.id,
      nickname: data.nickname,
      email: user?.email,
      email_confirmed_at: user?.email_confirmed_at,
      created_at: data.created_at
    };

    this.currentUser.set(profile);
    return profile;
  }

  async signUp(email: string, password: string, nickname: string): Promise<SignUpResult> {
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
        return { user: null, needsConfirmation: false, error: error.message };
      }

      this.justSignedUpEmail.set(email);

      if (data.user) {
        this.authUser.set(data.user);
        const isConfirmed = Boolean(
          data.user.email_confirmed_at || (data.user as unknown as { confirmed_at?: string }).confirmed_at
        );
        const needsConfirmation = !isConfirmed;

        const profile = await this.loadUserProfile(data.user.id, data.user);
        if (!profile) {
          const fallbackProfile: UserProfile = {
            id: data.user.id,
            nickname,
            email: data.user.email,
            email_confirmed_at: data.user.email_confirmed_at,
            created_at: new Date().toISOString()
          };
          this.currentUser.set(fallbackProfile);
          return { user: fallbackProfile, needsConfirmation, email, error: null };
        }
        return { user: profile, needsConfirmation, email, error: null };
      }

      return { user: null, needsConfirmation: true, email, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      return { user: null, needsConfirmation: false, error: message };
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
        this.authUser.set(data.user);
        this.justSignedUpEmail.set(null);
        const profile = await this.loadUserProfile(data.user.id, data.user);
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
      this.authUser.set(null);
      this.currentUser.set(null);
      this.justSignedUpEmail.set(null);
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      return { error: message };
    }
  }

  async resendConfirmationEmail(email?: string): Promise<{ success: boolean; error: string | null }> {
    const targetEmail = email || this.userEmail();
    if (!targetEmail) {
      return { success: false, error: 'Email address is required to resend confirmation' };
    }

    try {
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email: targetEmail
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend confirmation email';
      return { success: false, error: message };
    }
  }

  async refreshSession(): Promise<boolean> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (user && !error) {
        this.authUser.set(user);
        await this.loadUserProfile(user.id, user);
        if (user.email_confirmed_at) {
          this.justSignedUpEmail.set(null);
        }
        return Boolean(user.email_confirmed_at);
      }
    } catch {
      // ignore
    }
    return false;
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

  dismissNotice(): void {
    this.justSignedUpEmail.set(null);
  }
}
