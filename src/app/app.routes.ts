import { Routes } from '@angular/router';
import { authRouteGuard } from './core/guards/guest-prompt.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/main-board/main-board.component').then(
        (m) => m.MainBoardComponent
      )
  },
  {
    path: 'cabinet',
    canActivate: [authRouteGuard],
    loadComponent: () =>
      import('./features/user-cabinet/user-cabinet.component').then(
        (m) => m.UserCabinetComponent
      )
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      )
  },
  {
    path: '**',
    redirectTo: ''
  }
];
