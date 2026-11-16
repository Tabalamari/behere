import { Injectable, signal } from '@angular/core';

export type AuthModalMode = 'signin' | 'signup';

@Injectable({
  providedIn: 'root'
})
export class AuthModalService {
  readonly isOpen = signal<boolean>(false);
  readonly mode = signal<AuthModalMode>('signin');
  private pendingCallback: (() => void) | null = null;

  open(mode: AuthModalMode = 'signin', onAuthenticatedAction?: () => void): void {
    this.mode.set(mode);
    this.pendingCallback = onAuthenticatedAction ?? null;
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
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
