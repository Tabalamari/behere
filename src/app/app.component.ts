import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthModalComponent } from './core/components/auth-modal/auth-modal.component';
import { AuthService } from './core/services/auth.service';
import { AuthModalService } from './core/services/auth-modal.service';
import { requireAuth } from './core/guards/guest-prompt.guard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, AuthModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);

  openSignIn(): void {
    this.authModalService.open('signin');
  }

  openSignUp(): void {
    this.authModalService.open('signup');
  }

  signOut(): void {
    this.authService.signOut();
  }

  /**
   * Test action protected with requireAuth.
   * If guest -> opens auth modal.
   * If logged in -> triggers action.
   */
  testProtectedAction(actionName: string): void {
    requireAuth(
      this.authService,
      this.authModalService,
      () => {
        alert(`Дія "${actionName}" дозволена: користувач авторизований як ${this.authService.currentUser()?.nickname}!`);
      },
      'signin'
    );
  }
}
