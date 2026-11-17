import { Injectable, signal } from '@angular/core';

export type AuthModalMode = 'signin' | 'signup' | 'forgot-password' | 'update-password';

@Injectable({
  providedIn: 'root'
})
export class AuthModalService {
  readonly isOpen = signal<boolean>(false);
  readonly mode = signal<AuthModalMode>('signin');
  readonly promptMessage = signal<string | null>(null);
  private pendingCallback: (() => void) | null = null;

  open(mode: AuthModalMode = 'signin', onAuthenticatedAction?: () => void, message?: string): void {
    this.mode.set(mode);
    this.promptMessage.set(message ?? null);
    this.pendingCallback = onAuthenticatedAction ?? null;
    this.isOpen.set(true);
  }

  openModal(message?: string, onAuthenticatedAction?: () => void): void {
    this.open('signin', onAuthenticatedAction, message);
  }

  close(): void {
    this.isOpen.set(false);
    this.promptMessage.set(null);
    this.pendingCallback = null;
  }

  setMode(mode: AuthModalMode): void {
    this.mode.set(mode);
  }

  notifyAuthSuccess(): void {
    const callback = this.pendingCallback;
    this.close();
    if (callback) {
      callback();
    }
  }
}
