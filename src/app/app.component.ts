import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthModalComponent } from './core/components/auth-modal/auth-modal.component';
import { TopHeaderComponent } from './core/components/top-header/top-header.component';
import { WishesPanelComponent } from './features/main-board/wishes-panel/wishes-panel.component';
import { MapboxViewComponent } from './features/main-board/mapbox-view/mapbox-view.component';
import { AuthService } from './core/services/auth.service';
import { AuthModalService } from './core/services/auth-modal.service';
import { BoardStateService } from './core/services/board-state.service';
import { requireAuth } from './core/guards/guest-prompt.guard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    TopHeaderComponent,
    WishesPanelComponent,
    MapboxViewComponent,
    AuthModalComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);
  readonly boardState = inject(BoardStateService);

  openSignIn(): void {
    this.authModalService.open('signin');
  }

  openSignUp(): void {
    this.authModalService.open('signup');
  }

  signOut(): void {
    this.authService.signOut();
  }

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
