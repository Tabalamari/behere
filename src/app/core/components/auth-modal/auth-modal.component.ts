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
            class="absolute top-4 right-4 text-muted hover:text-ink text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-paper transition"
            (click)="closeModal()"
            aria-label="Close modal"
          >
            ✕
          </button>

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
              class="flex-1 py-2 text-xs font-semibold rounded-md transition"
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
              class="flex-1 py-2 text-xs font-semibold rounded-md transition"
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
              class="w-full mt-2 py-3 px-4 bg-accent hover:bg-[#b04d29] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow transition flex items-center justify-center gap-2"
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
              <button type="button" class="text-accent font-medium hover:underline" (click)="switchMode('signin')">
                Sign In
              </button>
            } @else {
              <span>Don't have an account yet? </span>
              <button type="button" class="text-accent font-medium hover:underline" (click)="switchMode('signup')">
                Create account
              </button>
            }
          </div>
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

  authForm: FormGroup = this.createForm('signin');

  get isSignUp(): () => boolean {
    return () => this.modalService.mode() === 'signup';
  }

  private createForm(mode: AuthModalMode): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      nickname: [
        '', 
        mode === 'signup' 
          ? [Validators.required, Validators.minLength(2), Validators.maxLength(30)] 
          : []
      ]
    });
  }

  switchMode(newMode: AuthModalMode): void {
    this.errorMessage.set(null);
    this.modalService.setMode(newMode);
    this.authForm = this.createForm(newMode);
  }

  closeModal(): void {
    this.modalService.close();
    this.errorMessage.set(null);
    this.authForm.reset();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
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
        this.modalService.notifyAuthSuccess();
      }
    } else {
      const res = await this.authService.signIn(email, password);
      this.isSubmitting.set(false);
      if (res.error) {
        this.errorMessage.set(res.error);
      } else {
        this.modalService.notifyAuthSuccess();
      }
    }
  }
}
