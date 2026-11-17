import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-email-confirmation-notice',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (shouldShowNotice()) {
      <div 
        role="alert"
        aria-live="polite"
        class="w-full bg-gradient-to-r from-amber-50 via-amber-100/70 to-orange-50 border-y sm:border sm:rounded-2xl border-amber-300/80 text-amber-950 px-4 py-3.5 shadow-sm transition-all animate-fadeIn relative overflow-hidden"
      >
        <!-- Subtle ink pattern accent bar on the left -->
        <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#C85A32]"></div>

        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pl-2">
          <!-- Notice content -->
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-200/70 text-amber-800 flex items-center justify-center text-lg shrink-0 shadow-2xs mt-0.5 sm:mt-0">
              ✉️
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-bold text-xs sm:text-sm text-ink tracking-tight font-serif">
                  Email Confirmation Required
                </h4>
                @if (targetEmail()) {
                  <span class="inline-block px-2 py-0.5 rounded-md bg-white/80 border border-amber-200 text-amber-900 text-[11px] font-mono">
                    {{ targetEmail() }}
                  </span>
                }
              </div>
              <p class="text-xs text-amber-900/90 mt-0.5 leading-relaxed">
                We sent a confirmation email to your email address. Please check your inbox and verify your email to unlock full access (creating memories and sealing time capsules).
              </p>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0">
            @if (resendSuccess()) {
              <span class="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 animate-fadeIn">
                <span>✓</span>
                <span>Sent! Check your inbox & spam</span>
              </span>
            } @else {
              <button
                type="button"
                [disabled]="isResending()"
                (click)="onResendEmail()"
                class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white hover:bg-stone-50 border border-amber-300 text-[#C85A32] shadow-2xs transition hover:shadow-xs active:scale-95 disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
              >
                @if (isResending()) {
                  <span class="w-3 h-3 border-2 border-[#C85A32] border-t-transparent rounded-full animate-spin"></span>
                  <span>Sending...</span>
                } @else {
                  <span>Resend email</span>
                }
              </button>
            }

            <button
              type="button"
              [disabled]="isChecking()"
              (click)="onCheckStatus()"
              title="Check if email was verified in another tab"
              class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-200/60 hover:bg-amber-200 text-amber-950 transition active:scale-95 disabled:opacity-60 cursor-pointer flex items-center gap-1"
            >
              @if (isChecking()) {
                <span class="w-3 h-3 border-2 border-amber-900 border-t-transparent rounded-full animate-spin"></span>
              } @else {
                <span>↻ I've verified</span>
              }
            </button>

            <!-- Dismiss button -->
            <button
              type="button"
              (click)="dismiss()"
              class="text-amber-700/70 hover:text-amber-950 p-1 rounded-lg hover:bg-amber-200/50 transition cursor-pointer text-sm leading-none ml-1"
              aria-label="Dismiss notice"
              title="Dismiss for now"
            >
              ✕
            </button>
          </div>
        </div>

        @if (resendError()) {
          <div class="mt-2 text-[11px] text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg animate-fadeIn">
            {{ resendError() }}
          </div>
        }
      </div>
    }
  `
})
export class EmailConfirmationNoticeComponent {
  private auth = inject(AuthService);

  readonly isDismissed = signal<boolean>(false);
  readonly isResending = signal<boolean>(false);
  readonly isChecking = signal<boolean>(false);
  readonly resendSuccess = signal<boolean>(false);
  readonly resendError = signal<string | null>(null);

  readonly targetEmail = computed(() => this.auth.userEmail());

  readonly shouldShowNotice = computed(() => {
    if (this.isDismissed()) {
      return false;
    }
    return this.auth.needsEmailConfirmation() || Boolean(this.auth.justSignedUpEmail());
  });

  async onResendEmail(): Promise<void> {
    if (this.isResending()) return;
    this.isResending.set(true);
    this.resendError.set(null);
    this.resendSuccess.set(false);

    const email = this.targetEmail();
    const res = await this.auth.resendConfirmationEmail(email);
    this.isResending.set(false);

    if (res.error) {
      this.resendError.set(res.error);
    } else {
      this.resendSuccess.set(true);
      setTimeout(() => this.resendSuccess.set(false), 6000);
    }
  }

  async onCheckStatus(): Promise<void> {
    if (this.isChecking()) return;
    this.isChecking.set(true);
    this.resendError.set(null);

    const isConfirmed = await this.auth.refreshSession();
    this.isChecking.set(false);

    if (isConfirmed) {
      this.isDismissed.set(true);
    } else {
      this.resendError.set('Email is not confirmed yet. Please click the link in the message sent to your inbox.');
      setTimeout(() => this.resendError.set(null), 4000);
    }
  }

  dismiss(): void {
    this.isDismissed.set(true);
    this.auth.dismissNotice();
  }
}
