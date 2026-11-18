import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPass = control.get('newPassword')?.value;
  const confirmPass = control.get('confirmPassword')?.value;
  if (!newPass || !confirmPass) return null;
  return newPass === confirmPass ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[#FAF7F2] flex flex-col justify-between p-4 sm:p-6 text-[#231F20]">
      <!-- Brand Top Header -->
      <header class="max-w-md w-full mx-auto flex items-center justify-between py-4">
        <a routerLink="/" class="flex items-center gap-2 group">
          <span class="text-2xl sm:text-3xl font-serif-display font-bold tracking-tight text-[#231F20] group-hover:text-[#C85A32] transition">
            Be HERE
          </span>
          <span class="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full bg-stone-200/70 text-[#6E665F]">
            Archive
          </span>
        </a>

        <a routerLink="/" class="text-xs font-semibold text-[#6E665F] hover:text-[#231F20] transition">
          ← Back to Board
        </a>
      </header>

      <!-- Main Center Card -->
      <main class="max-w-md w-full mx-auto my-auto bg-white rounded-3xl p-6 sm:p-8 border border-[#E5DDD3] shadow-sm space-y-6">
        @if (isLoading()) {
          <div class="py-12 text-center space-y-3">
            <span class="animate-spin text-3xl inline-block">⏳</span>
            <p class="text-xs text-[#6E665F]">Verifying your security credentials...</p>
          </div>
        } @else if (tokenError()) {
          <!-- Invalid or Expired Token State -->
          <div class="text-center space-y-4">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl shadow-xs">
              ⚠️
            </div>
            <h1 class="font-serif-display text-xl sm:text-2xl font-bold text-[#231F20]">
              Reset Link Expired or Invalid
            </h1>
            <p class="text-xs text-[#6E665F] leading-relaxed">
              {{ tokenError() }}
            </p>
            <div class="pt-3 flex flex-col gap-2">
              <a 
                routerLink="/" 
                class="w-full py-3 rounded-xl bg-[#231F20] hover:bg-[#3A3537] text-white font-semibold text-xs transition text-center shadow-xs">
                Request a New Reset Link on Board
              </a>
              <a 
                routerLink="/" 
                class="w-full py-2.5 rounded-xl border border-[#D8CEC2] text-xs font-semibold text-[#6E665F] hover:bg-stone-50 transition text-center">
                Return to Home
              </a>
            </div>
          </div>
        } @else if (isSuccess()) {
          <!-- Success State -->
          <div class="text-center space-y-4 animate-fadeIn">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-3xl shadow-xs">
              🎉
            </div>
            <h1 class="font-serif-display text-xl sm:text-2xl font-bold text-[#231F20]">
              Password Updated Successfully
            </h1>
            <p class="text-xs text-[#6E665F] leading-relaxed">
              Your password has been securely updated. You are now signed in to your account.
            </p>
            <div class="pt-3">
              <button 
                type="button"
                (click)="continueToBoard()"
                class="w-full py-3 rounded-xl bg-[#C85A32] hover:bg-[#B34E2A] text-white font-bold text-xs transition shadow-xs cursor-pointer">
                Enter Be HERE Living Board →
              </button>
            </div>
          </div>
        } @else {
          <!-- Set New Password Form -->
          <div class="space-y-5">
            <div class="text-center space-y-1">
              <div class="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl shadow-2xs mb-2">
                🛡️
              </div>
              <h1 class="font-serif-display text-2xl font-bold text-[#231F20]">
                Set New Password
              </h1>
              <p class="text-xs text-[#6E665F] leading-relaxed">
                Choose a strong new password for your Be HERE account.
              </p>
            </div>

            @if (errorMessage()) {
              <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="space-y-4">
              <!-- New Password Input -->
              <div>
                <label class="block text-xs font-semibold text-[#231F20] mb-1">
                  New Password <span class="text-[#C85A32]">*</span>
                </label>
                <div class="relative">
                  <input 
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="newPassword"
                    placeholder="At least 8 characters"
                    class="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-[#D8CEC2] bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#C85A32] transition"
                  />
                  <button 
                    type="button" 
                    (click)="toggleShowPassword()" 
                    class="absolute right-3 top-2.5 text-[#6E665F] hover:text-[#231F20] text-sm cursor-pointer select-none">
                    {{ showPassword() ? '🙈' : '👁️' }}
                  </button>
                </div>

                <!-- Password Requirements Checklist -->
                <div class="mt-2.5 p-2.5 bg-[#FAF7F2] rounded-xl border border-[#E5DDD3] text-[11px] space-y-1">
                  <div [class.text-emerald-700]="criteria().hasMinLength" [class.text-stone-400]="!criteria().hasMinLength" class="flex items-center gap-1.5 font-medium">
                    <span>{{ criteria().hasMinLength ? '✓' : '○' }}</span>
                    <span>At least 8 characters</span>
                  </div>
                  <div [class.text-emerald-700]="criteria().hasUpper && criteria().hasLower" [class.text-stone-400]="!(criteria().hasUpper && criteria().hasLower)" class="flex items-center gap-1.5 font-medium">
                    <span>{{ criteria().hasUpper && criteria().hasLower ? '✓' : '○' }}</span>
                    <span>Upper & lowercase letters (A-Z, a-z)</span>
                  </div>
                  <div [class.text-emerald-700]="criteria().hasNumber" [class.text-stone-400]="!criteria().hasNumber" class="flex items-center gap-1.5 font-medium">
                    <span>{{ criteria().hasNumber ? '✓' : '○' }}</span>
                    <span>At least one number (0-9)</span>
                  </div>
                </div>
              </div>

              <!-- Confirm Password Input -->
              <div>
                <label class="block text-xs font-semibold text-[#231F20] mb-1">
                  Confirm New Password <span class="text-[#C85A32]">*</span>
                </label>
                <input 
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="confirmPassword"
                  placeholder="Re-enter your password"
                  class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D8CEC2] bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#C85A32] transition"
                />
                @if (resetForm.errors?.['passwordMismatch'] && resetForm.get('confirmPassword')?.touched) {
                  <p class="text-rose-600 text-[11px] mt-1 font-semibold">Passwords do not match</p>
                }
              </div>

              <button 
                type="submit"
                [disabled]="isSubmitting() || resetForm.invalid"
                class="w-full py-3 rounded-xl bg-[#C85A32] hover:bg-[#B34E2A] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer">
                @if (isSubmitting()) {
                  <span class="animate-spin text-sm">⏳</span>
                  <span>Updating Password...</span>
                } @else {
                  <span>Update Password & Sign In</span>
                }
              </button>
            </form>
          </div>
        }
      </main>

      <!-- Footer Info -->
      <footer class="max-w-md w-full mx-auto text-center py-4 text-[11px] text-[#6E665F]">
        <p>Encrypted & secured by Be HERE Platform</p>
      </footer>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  readonly isLoading = signal<boolean>(true);
  readonly tokenError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly isSuccess = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);

  resetForm = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordMatchValidator }
  );

  async ngOnInit(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Check for errors returned in query params or hash (e.g. otp_expired)
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');
    const errorCode = searchParams.get('error_code') || hashParams.get('error_code');

    if (errorDesc || errorCode) {
      this.tokenError.set(
        errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : 'The password reset link is invalid or has expired.'
      );
      this.isLoading.set(false);
      return;
    }

    // Check for PKCE code in query parameters
    const code = searchParams.get('code');
    if (code) {
      try {
        const { error } = await this.supabase.client.auth.exchangeCodeForSession(code);
        if (error) {
          this.tokenError.set(error.message || 'Failed to exchange security token.');
          this.isLoading.set(false);
          return;
        }
      } catch (err: unknown) {
        this.tokenError.set((err as Error).message || 'Failed to verify reset credentials.');
        this.isLoading.set(false);
        return;
      }
    }

    // Check if an active session or recovery session exists
    try {
      const { data: { session } } = await this.supabase.client.auth.getSession();
      if (!session) {
        // If there's neither a code nor an active session, link may be expired
        if (!window.location.hash.includes('access_token')) {
          this.tokenError.set('No active password recovery session found. Please request a fresh reset link.');
        }
      }
    } catch {
      // Fallback
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleShowPassword(): void {
    this.showPassword.update((val) => !val);
  }

  criteria = () => {
    const val = this.resetForm.get('newPassword')?.value || '';
    return {
      hasMinLength: val.length >= 8,
      hasUpper: /[A-Z]/.test(val),
      hasLower: /[a-z]/.test(val),
      hasNumber: /[0-9]/.test(val)
    };
  };

  async onSubmit(): Promise<void> {
    if (this.resetForm.invalid) return;

    const newPass = this.resetForm.get('newPassword')?.value;
    if (!newPass) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const res = await this.authService.updatePassword(newPass);
    this.isSubmitting.set(false);

    if (res.success) {
      this.isSuccess.set(true);
    } else {
      this.errorMessage.set(res.error || 'Failed to update password. Please try again.');
    }
  }

  continueToBoard(): void {
    this.router.navigate(['/']);
  }
}
