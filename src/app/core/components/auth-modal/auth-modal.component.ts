import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthModalService, AuthModalMode } from '../../services/auth-modal.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    @if (modalService.isOpen()) {
      <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fadeIn"
        (click)="onBackdropClick($event)"
      >
        <div 
          class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-border-custom p-6 sm:p-8 animate-scaleUp"
          (click)="$event.stopPropagation()"
        >
          <!-- Close button -->
          <button 
            type="button"
            class="absolute top-4 right-4 text-muted hover:text-ink text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-paper transition cursor-pointer"
            (click)="closeModal()"
            aria-label="Close modal"
          >
            ✕
          </button>

          <!-- CASE 1: EMAIL CONFIRMATION SENT VIEW -->
          @if (confirmationSentEmail(); as sentEmail) {
            <div class="text-center py-2 space-y-4 animate-scaleUp">
              <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-3xl shadow-xs">
                ✉️
              </div>
              <div>
                <h3 class="font-serif text-2xl font-bold text-ink">
                  Verify Your Email
                </h3>
                <p class="text-xs text-muted mt-1 leading-relaxed">
                  We sent a confirmation email to your email address:
                </p>
                <div class="mt-2">
                  <span class="font-mono text-xs font-semibold text-accent bg-accent-soft px-3 py-1 rounded-full border border-accent/20 break-all">
                    {{ sentEmail }}
                  </span>
                </div>
              </div>

              <div class="p-4 bg-amber-50/80 rounded-xl border border-amber-200/90 text-xs text-amber-950 text-left space-y-1.5">
                <div class="font-semibold flex items-center gap-1.5 text-amber-900">
                  <span>📬</span>
                  <span>Next steps:</span>
                </div>
                <ol class="list-decimal list-inside text-[11px] leading-relaxed text-amber-900/90 space-y-1">
                  <li>Check your email inbox (and spam/junk folder if needed).</li>
                  <li>Click the confirmation link from <strong>Be HERE</strong>.</li>
                  <li>Enjoy full access to preserve neighborhood memories.</li>
                </ol>
              </div>

              <div class="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  [disabled]="isResendingInModal()"
                  (click)="onResendInModal(sentEmail)"
                  class="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border-custom bg-white hover:bg-stone-50 text-xs font-semibold text-ink transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  @if (isResendingInModal()) {
                    <span class="w-3 h-3 border-2 border-ink border-t-transparent rounded-full animate-spin"></span>
                    <span>Sending...</span>
                  } @else if (resendModalSuccess()) {
                    <span class="text-emerald-700 font-bold">✓ Link resent!</span>
                  } @else {
                    <span>Resend confirmation email</span>
                  }
                </button>

                <button
                  type="button"
                  (click)="closeModal()"
                  class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent hover:bg-[#b04d29] text-xs font-semibold text-white transition shadow cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </div>
          } @else {
            <!-- CASE 2: REGULAR SIGN IN / SIGN UP FORM -->

            <!-- Header -->
            <div class="text-center mb-6">
              <h2 class="font-serif text-2xl font-bold text-ink">
                {{ isSignUp() ? 'Join Be HERE' : 'Sign In to Be HERE' }}
              </h2>
              <p class="text-sm text-muted mt-1">
                {{ isSignUp() ? 'Create an account to share memories and seal time capsules' : 'Sign in to access your personal cabinet and preserved memories' }}
              </p>
            </div>

            @if (modalService.promptMessage()) {
              <div class="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <span>🔒</span>
                <span>{{ modalService.promptMessage() }}</span>
              </div>
            }

            <!-- Mode Toggle Tabs -->
            <div class="flex rounded-lg bg-bg-paper p-1 mb-6 border border-border-custom">
              <button 
                type="button"
                class="flex-1 py-2 text-xs font-semibold rounded-md transition cursor-pointer"
                [class.bg-white]="!isSignUp()"
                [class.shadow-sm]="!isSignUp()"
                [class.text-ink]="!isSignUp()"
                [class.text-muted]="isSignUp()"
                (click)="switchMode('signin')"
              >
                Sign In
              </button>
              <button 
                type="button"
                class="flex-1 py-2 text-xs font-semibold rounded-md transition cursor-pointer"
                [class.bg-white]="isSignUp()"
                [class.shadow-sm]="isSignUp()"
                [class.text-ink]="isSignUp()"
                [class.text-muted]="!isSignUp()"
                (click)="switchMode('signup')"
              >
                Sign Up
              </button>
            </div>

            <!-- Error Alert -->
            @if (errorMessage()) {
              <div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <span>⚠️</span>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <!-- Auth Form -->
            <form [formGroup]="authForm" (ngSubmit)="onSubmit()" class="space-y-4">
              @if (isSignUp()) {
                <div>
                  <label class="block text-xs font-medium text-ink mb-1">
                    Nickname <span class="text-accent">*</span>
                  </label>
                  <input 
                    type="text"
                    formControlName="nickname"
                    placeholder="Your nickname (e.g. BrightonExplorer)"
                    class="w-full px-3.5 py-2.5 text-sm bg-bg-paper border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
                  />
                  @if (authForm.get('nickname')?.touched && authForm.get('nickname')?.errors?.['required']) {
                    <p class="text-red-500 text-xs mt-1">Nickname is required</p>
                  }
                  @if (authForm.get('nickname')?.touched && authForm.get('nickname')?.errors?.['minlength']) {
                    <p class="text-red-500 text-xs mt-1">Minimum 2 characters</p>
                  }
                </div>
              }

              <div>
                <label class="block text-xs font-medium text-ink mb-1">
                  Email <span class="text-accent">*</span>
                </label>
                <input 
                  type="email"
                  formControlName="email"
                  placeholder="name@example.com"
                  autocomplete="email"
                  class="w-full px-3.5 py-2.5 text-sm bg-bg-paper border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
                />
                @if (authForm.get('email')?.touched && authForm.get('email')?.errors?.['required']) {
                  <p class="text-red-500 text-xs mt-1">Email is required</p>
                }
                @if (authForm.get('email')?.touched && authForm.get('email')?.errors?.['email']) {
                  <p class="text-red-500 text-xs mt-1">Please enter a valid email address</p>
                }
              </div>

              <div>
                <label class="block text-xs font-medium text-ink mb-1">
                  Password <span class="text-accent">*</span>
                </label>
                <input 
                  type="password"
                  formControlName="password"
                  placeholder="At least 6 characters"
                  autocomplete="current-password"
                  class="w-full px-3.5 py-2.5 text-sm bg-bg-paper border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
                />
                @if (authForm.get('password')?.touched && authForm.get('password')?.errors?.['required']) {
                  <p class="text-red-500 text-xs mt-1">Password is required</p>
                }
                @if (authForm.get('password')?.touched && authForm.get('password')?.errors?.['minlength']) {
                  <p class="text-red-500 text-xs mt-1">At least 6 characters</p>
                }
              </div>

              <button 
                type="submit"
                [disabled]="isSubmitting() || authForm.invalid"
                class="w-full mt-2 py-3 px-4 bg-accent hover:bg-[#b04d29] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                @if (isSubmitting()) {
                  <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Please wait...</span>
                } @else {
                  <span>{{ isSignUp() ? 'Create Account' : 'Sign In' }}</span>
                }
              </button>
            </form>

            <!-- Footer notice -->
            <div class="mt-6 text-center text-xs text-muted">
              @if (isSignUp()) {
                <span>Already have an account? </span>
                <button type="button" class="text-accent font-medium hover:underline cursor-pointer" (click)="switchMode('signin')">
                  Sign In
                </button>
              } @else {
                <span>Don't have an account yet? </span>
                <button type="button" class="text-accent font-medium hover:underline cursor-pointer" (click)="switchMode('signup')">
                  Create account
                </button>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .animate-fadeIn {
      animation: fadeIn 0.15s ease-out forwards;
    }
    .animate-scaleUp {
      animation: scaleUp 0.15s ease-out forwards;
    }
  `]
})
export class AuthModalComponent {
  readonly modalService = inject(AuthModalService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly confirmationSentEmail = signal<string | null>(null);
  readonly isResendingInModal = signal<boolean>(false);
  readonly resendModalSuccess = signal<boolean>(false);

  authForm: FormGroup = this.createForm('signin');

  get isSignUp(): () => boolean {
    return () => this.modalService.mode() === 'signup';
  }

  private createForm(mode: AuthModalMode): FormGroup {
    if (mode === 'signup') {
      return this.fb.group({
        nickname: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]]
      });
    }

    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  switchMode(newMode: AuthModalMode): void {
    this.errorMessage.set(null);
    this.confirmationSentEmail.set(null);
    this.modalService.setMode(newMode);
    this.authForm = this.createForm(newMode);
  }

  closeModal(): void {
    this.modalService.close();
    this.errorMessage.set(null);
    this.confirmationSentEmail.set(null);
    this.resendModalSuccess.set(false);
    this.authForm.reset();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  async onResendInModal(email: string): Promise<void> {
    if (this.isResendingInModal()) return;
    this.isResendingInModal.set(true);
    this.resendModalSuccess.set(false);

    const res = await this.authService.resendConfirmationEmail(email);
    this.isResendingInModal.set(false);

    if (res.error) {
      this.errorMessage.set(res.error);
    } else {
      this.resendModalSuccess.set(true);
      setTimeout(() => this.resendModalSuccess.set(false), 5000);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.authForm.invalid || this.isSubmitting()) {
      this.authForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { email, password, nickname } = this.authForm.value;

    if (this.isSignUp()) {
      const res = await this.authService.signUp(email, password, nickname);
      this.isSubmitting.set(false);
      if (res.error) {
        this.errorMessage.set(res.error);
      } else {
        // Show confirmation notice screen inside modal
        this.confirmationSentEmail.set(email);
        this.modalService.notifyAuthSuccess();
      }
    } else {
      const res = await this.authService.signIn(email, password);
      this.isSubmitting.set(false);
      if (res.error) {
        this.errorMessage.set(res.error);
      } else {
        this.modalService.notifyAuthSuccess();
        this.closeModal();
      }
    }
  }
}
