import { Injectable, computed, inject, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { AuthModalService } from './auth-modal.service';
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
  private modalService = inject(AuthModalService);

  readonly authUser = signal<User | null>(null);
  readonly currentUser = signal<UserProfile | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isLoading = signal<boolean>(true);
  readonly isRecoveryMode = signal<boolean>(false);

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

    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        this.isRecoveryMode.set(true);
        this.modalService.open('update-password', undefined, 'Please enter your new password to complete recovery.');
      }

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
    const cleanEmail = email.trim().toLowerCase();
    const cleanNickname = nickname.trim();
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            nickname: cleanNickname
          }
        }
      });

      if (error) {
        return { user: null, needsConfirmation: false, error: error.message };
      }

      this.justSignedUpEmail.set(cleanEmail);

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
            nickname: cleanNickname,
            email: data.user.email,
            email_confirmed_at: data.user.email_confirmed_at,
            created_at: new Date().toISOString()
          };
          this.currentUser.set(fallbackProfile);
          return { user: fallbackProfile, needsConfirmation, email: cleanEmail, error: null };
        }
        return { user: profile, needsConfirmation, email: cleanEmail, error: null };
      }

      return { user: null, needsConfirmation: true, email: cleanEmail, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      return { user: null, needsConfirmation: false, error: message };
    }
  }

  async signIn(email: string, password: string): Promise<{ user: UserProfile | null; error: string | null }> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        this.authUser.set(data.user);
        this.justSignedUpEmail.set(null);
        let profile = await this.loadUserProfile(data.user.id, data.user);
        if (!profile) {
          profile = {
            id: data.user.id,
            nickname: (data.user.user_metadata?.['nickname'] as string) || data.user.email?.split('@')[0] || 'Neighbor',
            email: data.user.email,
            email_confirmed_at: data.user.email_confirmed_at,
            created_at: data.user.created_at || new Date().toISOString()
          };
          this.currentUser.set(profile);
        }
        return { user: profile, error: null };
      }

      return { user: null, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      return { user: null, error: message };
    }
  }

  async resetPasswordForEmail(email: string): Promise<{ success: boolean; error: string | null }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Email address is required.' };
    }

    try {
      // Use window.location.origin so reset callback works on any host (pages.dev or localhost)
      const redirectTo = `${window.location.origin}/#recovery`;
      const { error } = await this.supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to request password reset';
      return { success: false, error: message };
    }
  }

  async updatePassword(newPassword: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        this.authUser.set(data.user);
        await this.loadUserProfile(data.user.id, data.user);
      }
      this.isRecoveryMode.set(false);
      return { success: true, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      return { success: false, error: message };
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
    const rawEmail = email || this.userEmail();
    const targetEmail = rawEmail ? rawEmail.trim().toLowerCase() : '';
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
