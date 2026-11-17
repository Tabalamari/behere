import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthModalService, AuthModalMode } from '../../services/auth-modal.service';

/** Custom validator requiring a secure, strong password */
export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value || '';
    if (!value) return null;

    const hasMinLength = value.length >= 8;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecial = /[^A-Za-z0-9]/.test(value);

    const valid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
    if (valid) return null;

    return {
      strongPassword: {
        hasMinLength,
        hasUpper,
        hasLower,
        hasNumber,
        hasSpecial
      }
    };
  };
}

/** Validator confirming two fields match */
export function passwordMatchValidator(passwordKey: string, confirmPasswordKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey)?.value;
    const confirm = group.get(confirmPasswordKey)?.value;
    if (!password || !confirm) return null;
    return password === confirm ? null : { passwordMismatch: true };
  };
}

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
          class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-border-custom p-6 sm:p-8 animate-scaleUp max-h-[92vh] overflow-y-auto"
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

          <!-- CASE 1: EMAIL CONFIRMATION SENT VIEW (AFTER SIGN UP) -->
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
          } @else if (modalService.mode() === 'forgot-password') {
            <!-- CASE 2: FORGOT PASSWORD REQUEST -->
            <div class="space-y-4">
              <div class="text-center">
                <div class="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl shadow-xs mb-3">
                  🔑
                </div>
                <h2 class="font-serif text-2xl font-bold text-ink">
                  Reset Password
                </h2>
                <p class="text-xs text-muted mt-1 leading-relaxed max-w-sm mx-auto">
                  Enter your registered email address below. We'll send you a secure link to reset your password.
                </p>
              </div>

              @if (resetLinkSent()) {
                <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs space-y-2 animate-fadeIn">
                  <div class="flex items-center gap-1.5 font-bold">
                    <span>✓</span>
                    <span>Reset link sent!</span>
                  </div>
                  <p class="leading-relaxed">
                    Check your inbox at <strong>{{ forgotPasswordForm.get('email')?.value }}</strong>. Click the link in the email to set a new password.
                  </p>
                  <button 
                    type="button"
                    (click)="switchMode('signin')"
                    class="mt-2 w-full py-2 bg-white border border-emerald-300 rounded-lg text-emerald-900 font-semibold hover:bg-emerald-100/50 transition cursor-pointer">
                    Back to Sign In
                  </button>
                </div>
              } @else {
                @if (errorMessage()) {
                  <div class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{{ errorMessage() }}</span>
                  </div>
                }

                <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSendResetLink()" class="space-y-4">
                  <div>
                    <label class="block text-xs font-medium text-ink mb-1">
                      Email Address <span class="text-accent">*</span>
                    </label>
                    <input 
                      type="email"
                      formControlName="email"
                      placeholder="name@example.com"
                      class="w-full px-3.5 py-2.5 text-sm bg-bg-paper border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
                    />
                    @if (forgotPasswordForm.get('email')?.touched && forgotPasswordForm.get('email')?.errors?.['required']) {
                      <p class="text-red-500 text-xs mt-1">Email is required</p>
                    }
                    @if (forgotPasswordForm.get('email')?.touched && forgotPasswordForm.get('email')?.errors?.['email']) {
                      <p class="text-red-500 text-xs mt-1">Please enter a valid email address</p>
                    }
                  </div>

                  <button 
                    type="submit"
                    [disabled]="isSubmitting() || forgotPasswordForm.invalid"
                    class="w-full py-3 px-4 bg-accent hover:bg-[#b04d29] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    @if (isSubmitting()) {
                      <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                      <span>Sending link...</span>
                    } @else {
                      <span>Send Reset Link</span>
                    }
                  </button>

                  <div class="text-center pt-2">
                    <button 
                      type="button" 
                      (click)="switchMode('signin')"
                      class="text-xs text-muted hover:text-ink font-semibold transition cursor-pointer">
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              }
            </div>
          } @else if (modalService.mode() === 'update-password') {
            <!-- CASE 3: SET NEW PASSWORD AFTER RECOVERY LINK -->
            <div class="space-y-4">
              <div class="text-center">
                <div class="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl shadow-xs mb-3">
                  🛡️
                </div>
                <h2 class="font-serif text-2xl font-bold text-ink">
                  Set New Password
                </h2>
                <p class="text-xs text-muted mt-1 leading-relaxed">
                  Enter your new secure password below to complete recovery.
                </p>
              </div>

              @if (passwordUpdatedSuccess()) {
                <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs text-center space-y-2 animate-fadeIn">
                  <span class="text-2xl block">🎉</span>
                  <p class="font-bold text-sm">Password updated successfully!</p>
                  <p class="leading-relaxed">You are now securely signed in.</p>
                  <button 
                    type="button"
                    (click)="closeModal()"
                    class="mt-2 px-5 py-2 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition cursor-pointer">
                    Continue to Be HERE
                  </button>
                </div>
              } @else {
                @if (errorMessage()) {
                  <div class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{{ errorMessage() }}</span>
                  </div>
                }

                <form [formGroup]="updatePasswordForm" (ngSubmit)="onUpdatePasswordSubmit()" class="space-y-4">
                  <!-- New Password -->
                  <div>
                    <label class="block text-xs font-medium text-ink mb-1">
                      New Password <span class="text-accent">*</span>
                    </label>
                    <div class="relative">
                      <input 
                        [type]="showPassword() ? 'text' : 'password'"
                        formControlName="newPassword"
                        placeholder="At least 8 complex characters"
                        class="w-full px-3.5 py-2.5 pr-10 text-sm bg-bg-paper border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
                      />
                      <button 
                        type="button"
                        (click)="toggleShowPassword()"
                        class="absolute right-3 top-2.5 text-muted hover:text-ink text-sm cursor-pointer select-none"
                        title="Toggle visibility">
                        {{ showPassword() ? '🙈' : '👁️' }}
                      </button>
                    </div>

                    <!-- Password strength meter -->
                    <div class="mt-2 space-y-1">
                      <div class="flex items-center justify-between text-[11px]">
                        <span class="text-muted">Password Strength:</span>
                        <span class="font-bold" [ngClass]="strengthColorClass()">{{ strengthLabel() }}</span>
                      </div>
                      <div class="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div 
                          class="h-full transition-all duration-300"
                          [ngClass]="strengthBgClass()"
                          [style.width.%]="strengthPercent()">
                        </div>
                      </div>
                    </div>

                    <!-- Requirements checklist -->
                    <div class="mt-2 p-2.5 bg-bg-paper rounded-lg border border-border-custom/80 text-[11px] space-y-1">
                      <div [class.text-emerald-700]="passCriteria().hasMinLength" [class.text-muted]="!passCriteria().hasMinLength" class="flex items-center gap-1.5">
                        <span>{{ passCriteria().hasMinLength ? '✓' : '○' }}</span>
                        <span>At least 8 characters</span>
                      </div>
                      <div [class.text-emerald-700]="passCriteria().hasUpper && passCriteria().hasLower" [class.text-muted]="!(passCriteria().hasUpper && passCriteria().hasLower)" class="flex items-center gap-1.5">
                        <span>{{ passCriteria().hasUpper && passCriteria().hasLower ? '✓' : '○' }}</span>
                        <span>Uppercase & lowercase letters (A-Z, a-z)</span>
                      </div>
                      <div [class.text-emerald-700]="passCriteria().hasNumber" [class.text-muted]="!passCriteria().hasNumber" class="flex items-center gap-1.5">
                        <span>{{ passCriteria().hasNumber ? '✓' : '○' }}</span>
                        <span>At least one number (0-9)</span>
                      </div>
                      <div [class.text-emerald-700]="passCriteria().hasSpecial" [class.text-muted]="!passCriteria().hasSpecial" class="flex items-center gap-1.5">
                        <span>{{ passCriteria().hasSpecial ? '✓' : '○' }}</span>
                        <span>At least one special symbol (!&#64;#$%^&*...)</span>
                      </div>
                    </div>
                  </div>

                  <!-- Confirm Password -->
                  <div>
                    <label class="block text-xs font-medium text-ink mb-1">
                      Confirm New Password <span class="text-accent">*</span>
                    </label>
                    <input 
                      [type]="showPassword() ? 'text' : 'password'"
                      formControlName="confirmPassword"
                      placeholder="Re-enter your new password"
                      class="w-full px-3.5 py-2.5 text-sm bg-bg-paper border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
                    />
                    @if (updatePasswordForm.errors?.['passwordMismatch'] && updatePasswordForm.get('confirmPassword')?.touched) {
                      <p class="text-red-500 text-xs mt-1">Passwords do not match</p>
                    }
                  </div>

                  <button 
                    type="submit"
                    [disabled]="isSubmitting() || updatePasswordForm.invalid"
                    class="w-full py-3 px-4 bg-accent hover:bg-[#b04d29] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    @if (isSubmitting()) {
                      <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                      <span>Saving password...</span>
                    } @else {
                      <span>Update Password</span>
                    }
                  </button>
                </form>
              }
            </div>
          } @else {
            <!-- CASE 4: REGULAR SIGN IN / SIGN UP FORMS -->
            <div class="text-center mb-5">
              <h2 class="font-serif text-2xl font-bold text-ink">
                {{ isSignUp() ? 'Join Be HERE' : 'Sign In to Be HERE' }}
              </h2>
              <p class="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                {{ isSignUp() ? 'Create an account to preserve local memories and write time-capsule letters' : 'Sign in to access your personal cabinet and neighborhood stories' }}
              </p>
            </div>

            @if (modalService.promptMessage()) {
              <div class="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <span>🔒</span>
                <span>{{ modalService.promptMessage() }}</span>
              </div>
            }

            <!-- Mode Toggle Tabs -->
            <div class="flex rounded-lg bg-bg-paper p-1 mb-5 border border-border-custom">
              <button 
                type="button"
                class="flex-1 py-2 text-xs font-semibold rounded-md transition cursor-pointer"
                [class.bg-white]="!isSignUp()"
                [class.shadow-xs]="!isSignUp()"
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
                [class.shadow-xs]="isSignUp()"
                [class.text-ink]="isSignUp()"
                [class.text-muted]="!isSignUp()"
                (click)="switchMode('signup')"
              >
                Sign Up
              </button>
            </div>

            <!-- Error Alert -->
            @if (errorMessage()) {
              @if (isUnconfirmedEmailError()) {
                <!-- Special friendly card for unconfirmed email -->
                <div class="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2 animate-fadeIn">
                  <div class="flex items-center gap-1.5 font-bold">
                    <span>✉️</span>
                    <span>Email Confirmation Required</span>
                  </div>
                  <p class="leading-relaxed text-[11px] text-amber-800">
                    Your account was created, but your email has not been confirmed yet. Please check your inbox or click below to receive a fresh verification link.
                  </p>
                  @if (resendModalSuccess()) {
                    <p class="text-emerald-700 font-bold text-[11px]">✓ New confirmation email sent! Check your inbox & spam folder.</p>
                  } @else {
                    <button 
                      type="button"
                      [disabled]="isResendingInModal()"
                      (click)="onResendUnconfirmed()"
                      class="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-amber-900 font-semibold hover:bg-stone-50 transition cursor-pointer flex items-center gap-1.5">
                      @if (isResendingInModal()) {
                        <span class="w-3 h-3 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></span>
                        <span>Sending...</span>
                      } @else {
                        <span>Resend confirmation link</span>
                      }
                    </button>
                  }
                </div>
              } @else {
                <div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{{ errorMessage() }}</span>
                </div>
              }
            }

            <!-- Auth Form -->
            <form [formGroup]="authForm" (ngSubmit)="onSubmit()" class="space-y-4">
              <!-- NICKNAME (SIGN UP ONLY) -->
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

              <!-- EMAIL FIELD -->
              <div>
                <label class="block text-xs font-medium text-ink mb-1">
                  Email Address <span class="text-accent">*</span>
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

              <!-- PASSWORD FIELD -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-medium text-ink">
                    Password <span class="text-accent">*</span>
                  </label>
                  @if (!isSignUp()) {
                    <button 
                      type="button"
                      (click)="switchMode('forgot-password')"
                      class="text-[11px] text-accent hover:underline font-semibold cursor-pointer">
                      Forgot password?
                    </button>
                  }
                </div>
                
                <div class="relative">
                  <input 
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    [placeholder]="isSignUp() ? 'At least 8 complex characters' : 'Enter your password'"
                    autocomplete="current-password"
                    class="w-full px-3.5 py-2.5 pr-10 text-sm bg-bg-paper border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
                  />
                  <button 
                    type="button"
                    (click)="toggleShowPassword()"
                    class="absolute right-3 top-2.5 text-muted hover:text-ink text-sm cursor-pointer select-none"
                    title="Toggle password visibility">
                    {{ showPassword() ? '🙈' : '👁️' }}
                  </button>
                </div>

                @if (authForm.get('password')?.touched && authForm.get('password')?.errors?.['required']) {
                  <p class="text-red-500 text-xs mt-1">Password is required</p>
                }

                <!-- SIGN UP ONLY: STRENGTH METER & REQUIREMENTS CHECKLIST -->
                @if (isSignUp()) {
                  <div class="mt-2 space-y-1">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="text-muted">Password Security:</span>
                      <span class="font-bold" [ngClass]="strengthColorClass()">{{ strengthLabel() }}</span>
                    </div>
                    <div class="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div 
                        class="h-full transition-all duration-300"
                        [ngClass]="strengthBgClass()"
                        [style.width.%]="strengthPercent()">
                      </div>
                    </div>
                  </div>

                  <!-- Real-time requirements checklist -->
                  <div class="mt-2.5 p-3 bg-bg-paper rounded-xl border border-border-custom text-[11px] space-y-1">
                    <div [class.text-emerald-700]="passCriteria().hasMinLength" [class.text-muted]="!passCriteria().hasMinLength" class="flex items-center gap-1.5">
                      <span>{{ passCriteria().hasMinLength ? '✓' : '○' }}</span>
                      <span>At least 8 characters</span>
                    </div>
                    <div [class.text-emerald-700]="passCriteria().hasUpper && passCriteria().hasLower" [class.text-muted]="!(passCriteria().hasUpper && passCriteria().hasLower)" class="flex items-center gap-1.5">
                      <span>{{ passCriteria().hasUpper && passCriteria().hasLower ? '✓' : '○' }}</span>
                      <span>Uppercase & lowercase letters (A-Z, a-z)</span>
                    </div>
                    <div [class.text-emerald-700]="passCriteria().hasNumber" [class.text-muted]="!passCriteria().hasNumber" class="flex items-center gap-1.5">
                      <span>{{ passCriteria().hasNumber ? '✓' : '○' }}</span>
                      <span>At least one number (0-9)</span>
                    </div>
                    <div [class.text-emerald-700]="passCriteria().hasSpecial" [class.text-muted]="!passCriteria().hasSpecial" class="flex items-center gap-1.5">
                      <span>{{ passCriteria().hasSpecial ? '✓' : '○' }}</span>
                      <span>At least one special symbol (!&#64;#$%^&*...)</span>
                    </div>
                  </div>
                }
              </div>

              <!-- CONFIRM PASSWORD (SIGN UP ONLY) -->
              @if (isSignUp()) {
                <div>
                  <label class="block text-xs font-medium text-ink mb-1">
                    Confirm Password <span class="text-accent">*</span>
                  </label>
                  <input 
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="confirmPassword"
                    placeholder="Re-enter your password"
                    class="w-full px-3.5 py-2.5 text-sm bg-bg-paper border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
                  />
                  @if (authForm.errors?.['passwordMismatch'] && authForm.get('confirmPassword')?.touched) {
                    <p class="text-red-500 text-xs mt-1">Passwords do not match</p>
                  }
                </div>
              }

              <!-- SUBMIT BUTTON -->
              <button 
                type="submit"
                [disabled]="isSubmitting() || authForm.invalid"
                class="w-full mt-2 py-3 px-4 bg-accent hover:bg-[#b04d29] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                @if (isSubmitting()) {
                  <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Please wait...</span>
                } @else {
                  <span>{{ isSignUp() ? 'Create Secure Account' : 'Sign In' }}</span>
                }
              </button>
            </form>

            <!-- FOOTER NOTICE -->
            <div class="mt-6 text-center text-xs text-muted">
              @if (isSignUp()) {
                <span>Already have an account? </span>
                <button type="button" class="text-accent font-semibold hover:underline cursor-pointer" (click)="switchMode('signin')">
                  Sign In
                </button>
              } @else {
                <span>Don't have an account yet? </span>
                <button type="button" class="text-accent font-semibold hover:underline cursor-pointer" (click)="switchMode('signup')">
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
      from { transform: scale(0.96); opacity: 0; }
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

  // Password Recovery state
  readonly resetLinkSent = signal<boolean>(false);
  readonly passwordUpdatedSuccess = signal<boolean>(false);

  // Password visibility
  readonly showPassword = signal<boolean>(false);

  // Forms
  authForm: FormGroup = this.createAuthForm('signin');
  forgotPasswordForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });
  updatePasswordForm: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required, strongPasswordValidator()]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator('newPassword', 'confirmPassword') });

  // Password Strength Signals
  readonly currentPasswordValue = signal<string>('');

  readonly passCriteria = computed(() => {
    const val = this.currentPasswordValue();
    return {
      hasMinLength: val.length >= 8,
      hasUpper: /[A-Z]/.test(val),
      hasLower: /[a-z]/.test(val),
      hasNumber: /[0-9]/.test(val),
      hasSpecial: /[^A-Za-z0-9]/.test(val)
    };
  });

  readonly strengthScore = computed(() => {
    const c = this.passCriteria();
    let score = 0;
    if (c.hasMinLength) score++;
    if (c.hasUpper && c.hasLower) score++;
    if (c.hasNumber) score++;
    if (c.hasSpecial) score++;
    if (this.currentPasswordValue().length >= 12) score++;
    return score;
  });

  readonly strengthPercent = computed(() => {
    return Math.min(100, this.strengthScore() * 20);
  });

  readonly strengthLabel = computed(() => {
    const score = this.strengthScore();
    if (!this.currentPasswordValue()) return 'Enter password';
    if (score <= 2) return 'Weak (Not acceptable)';
    if (score <= 4) return 'Moderate';
    return 'Strong & Secure';
  });

  readonly strengthColorClass = computed(() => {
    const score = this.strengthScore();
    if (!this.currentPasswordValue()) return 'text-muted';
    if (score <= 2) return 'text-rose-600';
    if (score <= 4) return 'text-amber-600';
    return 'text-emerald-600';
  });

  readonly strengthBgClass = computed(() => {
    const score = this.strengthScore();
    if (score <= 2) return 'bg-rose-500';
    if (score <= 4) return 'bg-amber-500';
    return 'bg-emerald-500';
  });

  readonly isSignUp = computed(() => this.modalService.mode() === 'signup');

  readonly isUnconfirmedEmailError = computed(() => {
    const msg = (this.errorMessage() || '').toLowerCase();
    return msg.includes('email not confirmed') || msg.includes('confirm your email');
  });

  constructor() {
    // Listen to password inputs to update live strength indicators
    this.authForm.get('password')?.valueChanges.subscribe(val => {
      this.currentPasswordValue.set(val || '');
    });

    this.updatePasswordForm.get('newPassword')?.valueChanges.subscribe(val => {
      this.currentPasswordValue.set(val || '');
    });
  }

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  private createAuthForm(mode: AuthModalMode): FormGroup {
    if (mode === 'signup') {
      const form = this.fb.group({
        nickname: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, strongPasswordValidator()]],
        confirmPassword: ['', [Validators.required]]
      }, { validators: passwordMatchValidator('password', 'confirmPassword') });

      form.get('password')?.valueChanges.subscribe(val => {
        this.currentPasswordValue.set(val || '');
      });
      return form;
    }

    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  switchMode(newMode: AuthModalMode): void {
    this.errorMessage.set(null);
    this.confirmationSentEmail.set(null);
    this.resetLinkSent.set(false);
    this.passwordUpdatedSuccess.set(false);
    this.currentPasswordValue.set('');
    this.modalService.setMode(newMode);
    this.authForm = this.createAuthForm(newMode);
  }

  closeModal(): void {
    this.modalService.close();
    this.errorMessage.set(null);
    this.confirmationSentEmail.set(null);
    this.resendModalSuccess.set(false);
    this.resetLinkSent.set(false);
    this.passwordUpdatedSuccess.set(false);
    this.currentPasswordValue.set('');
    this.authForm.reset();
    this.forgotPasswordForm.reset();
    this.updatePasswordForm.reset();
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
      setTimeout(() => this.resendModalSuccess.set(false), 6000);
    }
  }

  async onResendUnconfirmed(): Promise<void> {
    const email = this.authForm.get('email')?.value;
    if (email) {
      await this.onResendInModal(email);
    }
  }

  async onSendResetLink(): Promise<void> {
    if (this.forgotPasswordForm.invalid || this.isSubmitting()) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const email = this.forgotPasswordForm.get('email')?.value;
    const res = await this.authService.resetPasswordForEmail(email);
    this.isSubmitting.set(false);

    if (res.error) {
      this.errorMessage.set(res.error);
    } else {
      this.resetLinkSent.set(true);
    }
  }

  async onUpdatePasswordSubmit(): Promise<void> {
    if (this.updatePasswordForm.invalid || this.isSubmitting()) {
      this.updatePasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const newPassword = this.updatePasswordForm.get('newPassword')?.value;
    const res = await this.authService.updatePassword(newPassword);
    this.isSubmitting.set(false);

    if (res.error) {
      this.errorMessage.set(res.error);
    } else {
      this.passwordUpdatedSuccess.set(true);
      setTimeout(() => {
        this.closeModal();
      }, 2500);
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
        this.confirmationSentEmail.set(email.trim().toLowerCase());
        this.modalService.notifyAuthSuccess();
      }
    } else {
      const res = await this.authService.signIn(email, password);
      this.isSubmitting.set(false);
      if (res.error) {
        if (res.error.toLowerCase().includes('invalid login credentials')) {
          this.errorMessage.set('Incorrect email or password. Please check your credentials or reset your password.');
        } else {
          this.errorMessage.set(res.error);
        }
      } else {
        this.modalService.notifyAuthSuccess();
        this.closeModal();
      }
    }
  }
}
