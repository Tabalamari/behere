import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthModalComponent } from './core/components/auth-modal/auth-modal.component';
import { TopHeaderComponent } from './core/components/top-header/top-header.component';
import { EmailConfirmationNoticeComponent } from './core/components/email-confirmation-notice/email-confirmation-notice.component';
import { AuthService } from './core/services/auth.service';
import { AuthModalService } from './core/services/auth-modal.service';
import { BoardStateService } from './core/services/board-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    TopHeaderComponent,
    EmailConfirmationNoticeComponent,
    AuthModalComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);
  readonly boardState = inject(BoardStateService);
}
